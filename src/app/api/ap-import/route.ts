import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { PartyType, ContractType, InvoiceStatus, PaymentStatus, DisputeReason, DisputeStatus } from '@prisma/client'
import { createHash } from 'crypto'
import { ZAI } from 'z-ai-web-dev-sdk'

interface APDataImport {
  parties: Array<{
    PartyID: string
    Name: string
    Type: string
    BankDetails?: string
    TaxID?: string
  }>
  contracts: Array<{
    ContractID: string
    PartyA_ID: string
    PartyB_ID: string
    Type: string
    PricingFormula?: string
    MeteringPoints?: string
    SLAs?: string
    StartDate: string
    EndDate?: string
    Currency?: string
  }>
  invoices: Array<{
    InvoiceID: string
    ContractID: string
    Issuer: string
    Counterparty: string
    PeriodStart: string
    PeriodEnd: string
    Currency?: string
    Amount: number
    Taxes?: number
    Energy_MWh?: number
    Gas_mmscf?: number
    Fuel_ltrs?: number
    Description?: string
  }>
  payments: Array<{
    PaymentID: string
    InvoiceID?: string
    Payer: string
    Payee: string
    Amount: number
    Currency?: string
    ValueDate: string
    BankRef?: string
    Status?: string
    Method?: string
  }>
  deliveries: Array<{
    DeliveryID: string
    ContractID: string
    Timestamp: string
    MeterReadStart: number
    MeterReadEnd: number
    Quantity: number
    SourceSystem: string
    ProofHash?: string
    FileRef?: string
    QualityScore?: number
  }>
  disputes: Array<{
    DisputeID: string
    InvoiceID?: string
    ContractID: string
    RaisedBy: string
    ReceivedBy: string
    ReasonCode: string
    Description: string
    Status?: string
    Resolution?: string
    RulingAmount?: number
    SLADeadline: string
    AssignedTo?: string
    Evidence?: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()
    
    switch (action) {
      case 'IMPORT_AP_DATA':
        return await importAPData(data)
      case 'VALIDATE_DATA':
        return await validateAPData(data)
      case 'GENERATE_DELIVERIES':
        return await generateDeliveriesForInvoices(data)
      case 'CREATE_SYNTHETIC_DATA':
        return await createSyntheticData(data)
      case 'CLEAR_AND_REPOPULATE':
        return await clearAndRepopulate(data)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('AP Data import error:', error)
    return NextResponse.json({ error: 'AP Data import failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    switch (action) {
      case 'GET_IMPORT_STATUS':
        return await getImportStatus()
      case 'GET_DATA_SUMMARY':
        return await getDataSummary()
      case 'GET_VALIDATION_REPORT':
        return await getValidationReport()
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('AP Data query error:', error)
    return NextResponse.json({ error: 'AP Data query failed' }, { status: 500 })
  }
}

async function importAPData(data: APDataImport) {
  const importResults = {
    parties: { imported: 0, skipped: 0, errors: [] },
    contracts: { imported: 0, skipped: 0, errors: [] },
    invoices: { imported: 0, skipped: 0, errors: [] },
    payments: { imported: 0, skipped: 0, errors: [] },
    deliveries: { imported: 0, skipped: 0, errors: [] },
    disputes: { imported: 0, skipped: 0, errors: [] }
  }
  
  try {
    // Import Parties
    if (data.parties) {
      for (const partyData of data.parties) {
        try {
          const existing = await db.party.findUnique({
            where: { partyId: partyData.PartyID }
          })
          
          if (!existing) {
            const party = await db.party.create({
              data: {
                partyId: partyData.PartyID,
                name: partyData.Name,
                type: mapPartyType(partyData.Type),
                bankDetails: partyData.BankDetails,
                taxId: partyData.TaxID,
                isActive: true
              }
            })
            importResults.parties.imported++
            console.log(`Imported party: ${partyData.Name}`)
          } else {
            importResults.parties.skipped++
            console.log(`Skipped existing party: ${partyData.Name}`)
          }
        } catch (error) {
          importResults.parties.errors.push({
            party: partyData.PartyID,
            error: error.message
          })
        }
      }
    }
    
    // Import Contracts
    if (data.contracts) {
      for (const contractData of data.contracts) {
        try {
          const existing = await db.contract.findUnique({
            where: { contractId: contractData.ContractID }
          })
          
          if (!existing) {
            const partyA = await db.party.findFirst({
              where: { partyId: contractData.PartyA_ID }
            })
            const partyB = await db.party.findFirst({
              where: { partyId: contractData.PartyB_ID }
            })
            
            if (partyA && partyB) {
              const contract = await db.contract.create({
                data: {
                  contractId: contractData.ContractID,
                  partyAId: partyA.id,
                  partyBId: partyB.id,
                  type: mapContractType(contractData.Type),
                  pricingFormula: contractData.PricingFormula || '{}',
                  meteringPoints: contractData.MeteringPoints,
                  slas: contractData.SLAs,
                  startDate: new Date(contractData.StartDate),
                  endDate: contractData.EndDate ? new Date(contractData.EndDate) : null,
                  currency: contractData.Currency || 'GHS',
                  isActive: true
                }
              })
              importResults.contracts.imported++
              console.log(`Imported contract: ${contractData.ContractID}`)
            } else {
              importResults.contracts.errors.push({
                contract: contractData.ContractID,
                error: 'Party not found'
              })
            }
          } else {
            importResults.contracts.skipped++
            console.log(`Skipped existing contract: ${contractData.ContractID}`)
          }
        } catch (error) {
          importResults.contracts.errors.push({
            contract: contractData.ContractID,
            error: error.message
          })
        }
      }
    }
    
    // Import Invoices
    if (data.invoices) {
      for (const invoiceData of data.invoices) {
        try {
          const existing = await db.invoice.findUnique({
            where: { invoiceId: invoiceData.InvoiceID }
          })
          
          if (!existing) {
            const contract = await db.contract.findFirst({
              where: { contractId: invoiceData.ContractID }
            })
            const issuer = await db.party.findFirst({
              where: { partyId: invoiceData.Issuer }
            })
            const counterparty = await db.party.findFirst({
              where: { partyId: invoiceData.Counterparty }
            })
            
            if (contract && issuer && counterparty) {
              const lineItems = {
                energy: invoiceData.Energy_MWh || 0,
                gas: invoiceData.Gas_mmscf || 0,
                fuel: invoiceData.Fuel_ltrs || 0
              }
              
              const invoice = await db.invoice.create({
                data: {
                  invoiceId: invoiceData.InvoiceID,
                  contractId: contract.id,
                  issuerId: issuer.id,
                  counterpartyId: counterparty.id,
                  periodStart: new Date(invoiceData.PeriodStart),
                  periodEnd: new Date(invoiceData.PeriodEnd),
                  currency: invoiceData.Currency || 'GHS',
                  totalAmount: invoiceData.Amount,
                  taxAmount: invoiceData.Taxes,
                  lineItems: JSON.stringify(lineItems),
                  status: InvoiceStatus.PENDING,
                  hash: generateInvoiceHash(invoiceData)
                }
              })
              importResults.invoices.imported++
              console.log(`Imported invoice: ${invoiceData.InvoiceID}`)
            } else {
              importResults.invoices.errors.push({
                invoice: invoiceData.InvoiceID,
                error: 'Related entity not found'
              })
            }
          } else {
            importResults.invoices.skipped++
            console.log(`Skipped existing invoice: ${invoiceData.InvoiceID}`)
          }
        } catch (error) {
          importResults.invoices.errors.push({
            invoice: invoiceData.InvoiceID,
            error: error.message
          })
        }
      }
    }
    
    // Import Payments
    if (data.payments) {
      for (const paymentData of data.payments) {
        try {
          const existing = await db.payment.findUnique({
            where: { paymentId: paymentData.PaymentID }
          })
          
          if (!existing) {
            let invoice = null
            if (paymentData.InvoiceID) {
              invoice = await db.invoice.findFirst({
                where: { invoiceId: paymentData.InvoiceID }
              })
            }
            
            const payer = await db.party.findFirst({
              where: { partyId: paymentData.Payer }
            })
            const payee = await db.party.findFirst({
              where: { partyId: paymentData.Payee }
            })
            
            if (payer && payee) {
              const payment = await db.payment.create({
                data: {
                  paymentId: paymentData.PaymentID,
                  invoiceId: invoice?.id,
                  payerId: payer.id,
                  payeeId: payee.id,
                  amount: paymentData.Amount,
                  currency: paymentData.Currency || 'GHS',
                  valueDate: new Date(paymentData.ValueDate),
                  bankReference: paymentData.BankRef,
                  status: mapPaymentStatus(paymentData.Status)
                }
              })
              importResults.payments.imported++
              console.log(`Imported payment: ${paymentData.PaymentID}`)
            } else {
              importResults.payments.errors.push({
                payment: paymentData.PaymentID,
                error: 'Related entity not found'
              })
            }
          } else {
            importResults.payments.skipped++
            console.log(`Skipped existing payment: ${paymentData.PaymentID}`)
          }
        } catch (error) {
          importResults.payments.errors.push({
            payment: paymentData.PaymentID,
            error: error.message
          })
        }
      }
    }
    
    // Import Disputes
    if (data.disputes) {
      for (const disputeData of data.disputes) {
        try {
          const existing = await db.dispute.findUnique({
            where: { disputeId: disputeData.DisputeID }
          })
          
          if (!existing) {
            const contract = await db.contract.findFirst({
              where: { contractId: disputeData.ContractID }
            })
            const raisedBy = await db.party.findFirst({
              where: { partyId: disputeData.RaisedBy }
            })
            const receivedBy = await db.party.findFirst({
              where: { partyId: disputeData.ReceivedBy }
            })
            
            if (contract && raisedBy && receivedBy) {
              const dispute = await db.dispute.create({
                data: {
                  disputeId: disputeData.DisputeID,
                  invoiceId: disputeData.InvoiceID ? 
                    (await db.invoice.findFirst({ where: { invoiceId: disputeData.InvoiceID } }))?.id : null,
                  contractId: contract.id,
                  raisedById: raisedBy.id,
                  receivedById: receivedBy.id,
                  reasonCode: mapDisputeReason(disputeData.ReasonCode),
                  description: disputeData.Description,
                  status: mapDisputeStatus(disputeData.Status),
                  resolution: disputeData.Resolution,
                  rulingAmount: disputeData.RulingAmount,
                  slaDeadline: new Date(disputeData.SLADeadline),
                  evidenceHash: disputeData.Evidence ? createHash('sha256').update(disputeData.Evidence).digest('hex') : null
                }
              })
              importResults.disputes.imported++
              console.log(`Imported dispute: ${disputeData.DisputeID}`)
            } else {
              importResults.disputes.errors.push({
                dispute: disputeData.DisputeID,
                error: 'Related entity not found'
              })
            }
          } else {
            importResults.disputes.skipped++
            console.log(`Skipped existing dispute: ${disputeData.DisputeID}`)
          }
        } catch (error) {
          importResults.disputes.errors.push({
            dispute: disputeData.DisputeID,
            error: error.message
          })
        }
      }
    }
    
    // Create audit log for import
    await db.auditLog.create({
      data: {
        action: 'BULK_IMPORT_AP_DATA',
        entityType: 'SYSTEM',
        entityId: 'BULK_IMPORT',
        newValues: JSON.stringify(importResults),
        timestamp: new Date()
      }
    })
    
    return NextResponse.json({
      success: true,
      importResults,
      summary: {
        totalProcessed: Object.values(importResults).reduce((sum, result) => 
          sum + result.imported + result.skipped + result.errors.length, 0),
        totalImported: Object.values(importResults).reduce((sum, result) => sum + result.imported, 0),
        totalErrors: Object.values(importResults).reduce((sum, result) => sum + result.errors.length, 0),
        totalSkipped: Object.values(importResults).reduce((sum, result) => sum + result.skipped, 0)
      },
      message: 'AP data import completed successfully'
    })
  } catch (error) {
    console.error('AP data import failed:', error)
    return NextResponse.json({ 
      error: 'AP data import failed', 
      details: error.message 
    }, { status: 500 })
  }
}

async function generateDeliveriesForInvoices(data: any) {
  const { invoiceIds, deliveryPattern = 'DAILY', variance = 0.05 } = data
  
  try {
    const invoices = await db.invoice.findMany({
      where: { 
        invoiceId: { in: invoiceIds },
        status: InvoiceStatus.PENDING 
      },
      include: { contract: true }
    })
    
    const generatedDeliveries = []
    
    for (const invoice of invoices) {
      const periodStart = new Date(invoice.periodStart)
      const periodEnd = new Date(invoice.periodEnd)
      const daysDiff = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
      
      // Parse line items to get expected quantities
      let expectedEnergy = 0
      let expectedGas = 0
      let expectedFuel = 0
      
      try {
        const lineItems = JSON.parse(invoice.lineItems || '{}')
        expectedEnergy = lineItems.energy || 0
        expectedGas = lineItems.gas || 0
        expectedFuel = lineItems.fuel || 0
      } catch (e) {
        console.error('Error parsing line items:', e)
      }
      
      // Generate deliveries based on pattern
      if (deliveryPattern === 'DAILY') {
        for (let day = 0; day < daysDiff; day++) {
          const deliveryDate = new Date(periodStart.getTime() + day * 24 * 60 * 60 * 1000)
          
          // Add realistic variance to quantities
          const energyVariance = 1 + (Math.random() - 0.5) * 2 * variance
          const gasVariance = 1 + (Math.random() - 0.5) * 2 * variance
          const fuelVariance = 1 + (Math.random() - 0.5) * 2 * variance
          
          const deliveryData = {
            deliveryId: `DEL-${invoice.invoiceId}-${day + 1}`,
            contractId: invoice.contractId,
            timestamp: deliveryDate.toISOString(),
            meterReadStart: day === 0 ? 1000000 : 1000000 + (day - 1) * expectedEnergy,
            meterReadEnd: 1000000 + day * expectedEnergy * energyVariance,
            quantity: (expectedEnergy * energyVariance) || (expectedGas * gasVariance) || (expectedFuel * fuelVariance),
            sourceSystem: determineSourceSystem(invoice.contract.type),
            qualityScore: 90 + Math.random() * 10 // 90-100 quality score
          }
          
          const delivery = await db.delivery.create({
            data: deliveryData
          })
          
          generatedDeliveries.push({
            deliveryId: deliveryData.deliveryId,
            invoiceId: invoice.invoiceId,
            quantity: deliveryData.quantity,
            date: deliveryData.timestamp
          })
        }
      }
    }
    
    // Update invoices with delivery references
    for (const delivery of generatedDeliveries) {
      await db.invoice.updateMany({
        where: { invoiceId: delivery.invoiceId },
        data: {
          status: InvoiceStatus.MATCHED,
          confidenceScore: 95.0,
          matchedDeliveries: JSON.stringify([delivery.deliveryId])
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      generatedDeliveries: generatedDeliveries.length,
      message: `Generated ${generatedDeliveries.length} deliveries for ${invoiceIds.length} invoices`
    })
  } catch (error) {
    console.error('Delivery generation failed:', error)
    return NextResponse.json({ 
      error: 'Delivery generation failed', 
      details: error.message 
    }, { status: 500 })
  }
}

async function validateAPData(data: APDataImport) {
  const validationResults = {
    parties: { valid: 0, invalid: 0, errors: [] },
    contracts: { valid: 0, invalid: 0, errors: [] },
    invoices: { valid: 0, invalid: 0, errors: [] },
    payments: { valid: 0, invalid: 0, errors: [] },
    relationships: { valid: 0, invalid: 0, errors: [] }
  }
  
  try {
    // Validate party data
    if (data.parties) {
      for (const party of data.parties) {
        if (!party.PartyID || !party.Name || !party.Type) {
          validationResults.parties.invalid++
          validationResults.parties.errors.push({
            party: party.PartyID,
            error: 'Missing required fields'
          })
        } else {
          validationResults.parties.valid++
        }
      }
    }
    
    // Validate contract data
    if (data.contracts) {
      for (const contract of data.contracts) {
        if (!contract.ContractID || !contract.PartyA_ID || !contract.PartyB_ID || !contract.Type) {
          validationResults.contracts.invalid++
          validationResults.contracts.errors.push({
            contract: contract.ContractID,
            error: 'Missing required fields'
          })
        } else {
          validationResults.contracts.valid++
        }
      }
    }
    
    // Validate invoice data
    if (data.invoices) {
      for (const invoice of data.invoices) {
        if (!invoice.InvoiceID || !invoice.ContractID || !invoice.Issuer || !invoice.Counterparty || !invoice.Amount) {
          validationResults.invoices.invalid++
          validationResults.invoices.errors.push({
            invoice: invoice.InvoiceID,
            error: 'Missing required fields'
          })
        } else if (invoice.Amount <= 0) {
          validationResults.invoices.invalid++
          validationResults.invoices.errors.push({
            invoice: invoice.InvoiceID,
            error: 'Amount must be positive'
          })
        } else {
          validationResults.invoices.valid++
        }
      }
    }
    
    // Validate payment data
    if (data.payments) {
      for (const payment of data.payments) {
        if (!payment.PaymentID || !payment.Payer || !payment.Payee || !payment.Amount) {
          validationResults.payments.invalid++
          validationResults.payments.errors.push({
            payment: payment.PaymentID,
            error: 'Missing required fields'
          })
        } else if (payment.Amount <= 0) {
          validationResults.payments.invalid++
          validationResults.payments.errors.push({
            payment: payment.PaymentID,
            error: 'Amount must be positive'
          })
        } else {
          validationResults.payments.valid++
        }
      }
    }
    
    // Validate relationships
    if (data.parties && data.contracts && data.invoices) {
      const partyIds = new Set(data.parties.map(p => p.PartyID))
      const contractPartyIds = new Set([
        ...data.contracts.map(c => c.PartyA_ID),
        ...data.contracts.map(c => c.PartyB_ID)
      ])
      const invoicePartyIds = new Set([
        ...data.invoices.map(i => i.Issuer),
        ...data.invoices.map(i => i.Counterparty)
      ])
      
      // Check if all referenced parties exist
      for (const partyId of contractPartyIds) {
        if (!partyIds.has(partyId)) {
          validationResults.relationships.invalid++
          validationResults.relationships.errors.push({
            type: 'CONTRACT_PARTY',
            partyId: partyId,
            error: 'Party referenced in contract but not defined'
          })
        }
      }
      
      for (const partyId of invoicePartyIds) {
        if (!partyIds.has(partyId)) {
          validationResults.relationships.invalid++
          validationResults.relationships.errors.push({
            type: 'INVOICE_PARTY',
            partyId: partyId,
            error: 'Party referenced in invoice but not defined'
          })
        }
      }
      
      if (validationResults.relationships.invalid === 0) {
        validationResults.relationships.valid++
      }
    }
    
    return NextResponse.json({
      validationResults,
      summary: {
        totalValid: Object.values(validationResults).reduce((sum, result) => sum + result.valid, 0),
        totalInvalid: Object.values(validationResults).reduce((sum, result) => sum + result.invalid, 0),
        totalErrors: Object.values(validationResults).reduce((sum, result) => sum + result.errors.length, 0)
      },
      message: 'Data validation completed'
    })
  } catch (error) {
    console.error('Data validation failed:', error)
    return NextResponse.json({ 
      error: 'Data validation failed', 
      details: error.message 
    }, { status: 500 })
  }
}

async function clearAndRepopulate(data: any) {
  try {
    // Clear existing data
    await db.auditLog.deleteMany({})
    await db.payment.deleteMany({})
    await db.dispute.deleteMany({})
    await db.delivery.deleteMany({})
    await db.invoice.deleteMany({})
    await db.contract.deleteMany({})
    await db.party.deleteMany({})
    await db.settlementBatch.deleteMany({})
    
    // Repopulate with new data
    const importResult = await importAPData(data)
    
    return NextResponse.json({
      success: true,
      message: 'Database cleared and repopulated successfully',
      importResult
    })
  } catch (error) {
    console.error('Clear and repopulate failed:', error)
    return NextResponse.json({ 
      error: 'Clear and repopulate failed', 
      details: error.message 
    }, { status: 500 })
  }
}

// Helper functions
function mapPartyType(type: string): PartyType {
  const typeMap: Record<string, PartyType> = {
    'GENERATOR': PartyType.GENERATOR,
    'GEN': PartyType.GENERATOR,
    'TRANSMISSION': PartyType.TRANSMISSION,
    'TRANS': PartyType.TRANSMISSION,
    'DISTRIBUTOR': PartyType.DISTRIBUTOR,
    'DIST': PartyType.DISTRIBUTOR,
    'FUEL_SUPPLIER': PartyType.FUEL_SUPPLIER,
    'FUEL': PartyType.FUEL_SUPPLIER,
    'REGULATOR': PartyType.REGULATOR,
    'REG': PartyType.REGULATOR,
    'FINANCIAL': PartyType.FINANCIAL,
    'FIN': PartyType.FINANCIAL
  }
  return typeMap[type] || PartyType.GENERATOR
}

function mapContractType(type: string): ContractType {
  const typeMap: Record<string, ContractType> = {
    'PPA': ContractType.PPA,
    'GSA': ContractType.GSA,
    'FSA': ContractType.FSA,
    'WHEELING': ContractType.WHEELING
  }
  return typeMap[type] || ContractType.PPA
}

function mapDisputeReason(reason: string): DisputeReason {
  const reasonMap: Record<string, DisputeReason> = {
    'QUANTITY_VARIANCE': DisputeReason.QUANTITY_VARIANCE,
    'PRICE_VARIANCE': DisputeReason.PRICE_VARIANCE,
    'MISSING_DELIVERY_PROOF': DisputeReason.MISSING_DELIVERY_PROOF,
    'LATE_DELIVERY': DisputeReason.LATE_DELIVERY,
    'QUALITY_ISSUE': DisputeReason.QUALITY_ISSUE,
    'DUPLICATE_INVOICE': DisputeReason.DUPLICATE_INVOICE,
    'FX_MISMATCH': DisputeReason.FX_MISMATCH,
    'CONTRACT_BREACH': DisputeReason.CONTRACT_BREACH,
    'OTHER': DisputeReason.OTHER
  }
  return reasonMap[reason] || DisputeReason.OTHER
}

function mapDisputeStatus(status: string): DisputeStatus {
  const statusMap: Record<string, DisputeStatus> = {
    'OPEN': DisputeStatus.OPEN,
    'UNDER_REVIEW': DisputeStatus.UNDER_REVIEW,
    'EVIDENCE_REQUESTED': DisputeStatus.EVIDENCE_REQUESTED,
    'PARTIALLY_ACCEPTED': DisputeStatus.PARTIALLY_ACCEPTED,
    'RESOLVED': DisputeStatus.RESOLVED,
    'ESCALATED': DisputeStatus.ESCALATED,
    'CLOSED': DisputeStatus.CLOSED
  }
  return statusMap[status] || DisputeStatus.OPEN
}

function mapPaymentStatus(status: string): PaymentStatus {
  const statusMap: Record<string, PaymentStatus> = {
    'PENDING': PaymentStatus.PENDING,
    'PROCESSING': PaymentStatus.PROCESSING,
    'COMPLETED': PaymentStatus.COMPLETED,
    'FAILED': PaymentStatus.FAILED,
    'REVERSED': PaymentStatus.REVERSED
  }
  return statusMap[status] || PaymentStatus.PENDING
}

function generateInvoiceHash(invoiceData: any): string {
  return createHash('sha256').update(JSON.stringify(invoiceData)).digest('hex')
}

function determineSourceSystem(contractType: ContractType): string {
  const systemMap = {
    [ContractType.PPA]: 'SCADA',
    [ContractType.GSA]: 'GAS_NOMINATIONS',
    [ContractType.FSA]: 'FUEL_DISPATCH',
    [ContractType.WHEELING]: 'GRID_METERING'
  }
  return systemMap[contractType] || 'ERP'
}

// Additional GET handlers
async function getImportStatus() {
  const lastImport = await db.auditLog.findFirst({
    where: { action: 'BULK_IMPORT_AP_DATA' },
    orderBy: { timestamp: 'desc' }
  })
  
  return NextResponse.json({
    lastImport,
    status: lastImport ? 'COMPLETED' : 'NEVER_RUN',
    message: lastImport ? 'Last import completed successfully' : 'No import history found'
  })
}

async function getDataSummary() {
  const [partyCount, contractCount, invoiceCount, paymentCount, deliveryCount, disputeCount] = await Promise.all([
    db.party.count(),
    db.contract.count(),
    db.invoice.count(),
    db.payment.count(),
    db.delivery.count(),
    db.dispute.count()
  ])
  
  const [totalInvoiced, totalPaid] = await Promise.all([
    db.invoice.aggregate({ _sum: { totalAmount: true } }),
    db.payment.aggregate({ _sum: { amount: true } })
  ])
  
  return NextResponse.json({
    summary: {
      parties: partyCount,
      contracts: contractCount,
      invoices: invoiceCount,
      payments: paymentCount,
      deliveries: deliveryCount,
      disputes: disputeCount,
      totalInvoiced: totalInvoiced._sum.totalAmount || 0,
      totalPaid: totalPaid._sum.amount || 0,
      outstandingAmount: (totalInvoiced._sum.totalAmount || 0) - (totalPaid._sum.amount || 0)
    },
    lastUpdated: new Date()
  })
}

async function getValidationReport() {
  // Return validation report from last import
  const lastValidation = await db.auditLog.findFirst({
    where: { action: 'DATA_VALIDATION' },
    orderBy: { timestamp: 'desc' }
  })
  
  return NextResponse.json({
    validationReport: lastValidation ? JSON.parse(lastValidation.newValues || '{}') : null,
    lastValidated: lastValidation?.timestamp,
    message: lastValidation ? 'Validation report available' : 'No validation history found'
  })
}