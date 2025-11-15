import { PrismaClient, PartyType, ContractType, InvoiceStatus, PaymentStatus, DisputeReason, DisputeStatus } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

// Helper functions
function mapPartyType(type: string): PartyType {
  const typeMap: Record<string, PartyType> = {
    'DISTRIBUTOR': PartyType.DISTRIBUTOR,
    'GENERATOR': PartyType.GENERATOR,
    'TRANSMISSION': PartyType.TRANSMISSION,
    'FUEL_SUPPLIER': PartyType.FUEL_SUPPLIER,
    'REGULATOR': PartyType.REGULATOR,
    'FINANCIAL': PartyType.FINANCIAL
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
    'COMPLETED': PaymentStatus.COMPLETED,
    'PENDING': PaymentStatus.PENDING,
    'PROCESSING': PaymentStatus.PROCESSING,
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

// Realistic Ghana Energy Sector Accounts Payable Data
const apData = {
  parties: [
    { PartyID: 'ECG', Name: 'Electricity Company of Ghana', Type: 'DISTRIBUTOR', BankDetails: 'ECG-001-GCB', TaxID: 'GH-ECG-001' },
    { PartyID: 'VRA', Name: 'Volta River Authority', Type: 'GENERATOR', BankDetails: 'VRA-002-GCB', TaxID: 'GH-VRA-002' },
    { PartyID: 'GRIDCo', Name: 'Ghana Grid Company', Type: 'TRANSMISSION', BankDetails: 'GRIDCO-003-GCB', TaxID: 'GH-GRID-003' },
    { PartyID: 'GNPC', Name: 'Ghana National Petroleum Corporation', Type: 'FUEL_SUPPLIER', BankDetails: 'GNPC-004-GCB', TaxID: 'GH-GNPC-004' },
    { PartyID: 'BOST', Name: 'Bulk Oil Storage and Transportation', Type: 'FUEL_SUPPLIER', BankDetails: 'BOST-005-GCB', TaxID: 'GH-BOST-005' },
    { PartyID: 'IPP_ALPHA', Name: 'IPP Alpha Power Limited', Type: 'GENERATOR', BankDetails: 'IPPALPHA-006-GCB', TaxID: 'GH-IPPA-006' },
    { PartyID: 'IPP_BETA', Name: 'IPP Beta Power Limited', Type: 'GENERATOR', BankDetails: 'IPPBETA-007-GCB', TaxID: 'GH-IPPB-007' },
    { PartyID: 'MOF', Name: 'Ministry of Finance', Type: 'FINANCIAL', BankDetails: 'MOF-008-GCB', TaxID: 'GH-MOF-008' },
    { PartyID: 'MOE', Name: 'Ministry of Energy', Type: 'REGULATOR', BankDetails: 'MOE-009-GCB', TaxID: 'GH-MOE-009' }
  ],
  
  contracts: [
    {
      ContractID: 'PPA-VRA-ECG-2024-01',
      PartyA_ID: 'VRA',
      PartyB_ID: 'ECG',
      Type: 'PPA',
      PricingFormula: '{"base_rate": 1550, "capacity_charge": 200, "energy_charge": 1350}',
      MeteringPoints: '["VRA-ACCRA-METER-001", "VRA-KUMASI-METER-001"]',
      SLAs: '{"availability": 99.5, "dispatch_response": 15}',
      StartDate: '2024-01-01',
      EndDate: '2029-12-31',
      Currency: 'GHS'
    },
    {
      ContractID: 'PPA-IPP_ALPHA-ECG-2024-01',
      PartyA_ID: 'IPP_ALPHA',
      PartyB_ID: 'ECG',
      Type: 'PPA',
      PricingFormula: '{"base_rate": 1650, "capacity_charge": 250, "energy_charge": 1400}',
      MeteringPoints: '["IPPALPHA-ACCRA-METER-001"]',
      SLAs: '{"availability": 98.0, "dispatch_response": 20}',
      StartDate: '2024-01-01',
      EndDate: '2028-12-31',
      Currency: 'GHS'
    },
    {
      ContractID: 'PPA-IPP_BETA-ECG-2024-01',
      PartyA_ID: 'IPP_BETA',
      PartyB_ID: 'ECG',
      Type: 'PPA',
      PricingFormula: '{"base_rate": 1600, "capacity_charge": 220, "energy_charge": 1380}',
      MeteringPoints: '["IPPBETA-TAKORADI-METER-001"]',
      SLAs: '{"availability": 97.5, "dispatch_response": 25}',
      StartDate: '2024-01-01',
      EndDate: '2027-12-31',
      Currency: 'GHS'
    },
    {
      ContractID: 'GSA-GNPC-VRA-2024-01',
      PartyA_ID: 'GNPC',
      PartyB_ID: 'VRA',
      Type: 'GSA',
      PricingFormula: '{"gas_price": 6.2, "transportation_cost": 0.8}',
      MeteringPoints: '["GNPC-VRA-TERMINAL-001"]',
      SLAs: '{"gas_quality": 95, "supply_continuity": 99}',
      StartDate: '2024-01-01',
      EndDate: '2030-12-31',
      Currency: 'USD'
    },
    {
      ContractID: 'FSA-BOST-ECG-2024-01',
      PartyA_ID: 'BOST',
      PartyB_ID: 'ECG',
      Type: 'FSA',
      PricingFormula: '{"diesel_price": 12.5, "transportation_cost": 0.5}',
      MeteringPoints: '["BOST-ECG-DEPOT-001", "BOST-ECG-DEPOT-002"]',
      SLAs: '{"fuel_quality": 98, "delivery_time": 48}',
      StartDate: '2024-01-01',
      EndDate: '2029-12-31',
      Currency: 'GHS'
    },
    {
      ContractID: 'WHEELING-GRIDCo-ECG-2024-01',
      PartyA_ID: 'GRIDCo',
      PartyB_ID: 'ECG',
      Type: 'WHEELING',
      PricingFormula: '{"wheeling_charge": 0.05, "losses": 3.5}',
      MeteringPoints: '["GRIDCo-NATIONAL-GRID"]',
      SLAs: '{"grid_availability": 99.9, "voltage_stability": 98}',
      StartDate: '2024-01-01',
      EndDate: '2035-12-31',
      Currency: 'GHS'
    }
  ],
  
  invoices: [
    // VRA to ECG invoices (last 6 months)
    {
      InvoiceID: 'VRA-ECG-2025-001',
      ContractID: 'PPA-VRA-ECG-2024-01',
      Issuer: 'VRA',
      Counterparty: 'ECG',
      PeriodStart: '2025-08-01',
      PeriodEnd: '2025-08-07',
      Currency: 'GHS',
      Amount: 2345678900,
      Taxes: 293234862,
      Energy_MWh: 1513000,
      Description: 'August 2025 Power Supply'
    },
    {
      InvoiceID: 'VRA-ECG-2025-002',
      ContractID: 'PPA-VRA-ECG-2024-01',
      Issuer: 'VRA',
      Counterparty: 'ECG',
      PeriodStart: '2025-08-08',
      PeriodEnd: '2025-08-14',
      Currency: 'GHS',
      Amount: 2456789000,
      Taxes: 307098625,
      Energy_MWh: 1585000,
      Description: 'August 2025 Power Supply (Week 2)'
    },
    {
      InvoiceID: 'VRA-ECG-2025-003',
      ContractID: 'PPA-VRA-ECG-2024-01',
      Issuer: 'VRA',
      Counterparty: 'ECG',
      PeriodStart: '2025-08-15',
      PeriodEnd: '2025-08-21',
      Currency: 'GHS',
      Amount: 2512345678,
      Taxes: 313851842,
      Energy_MWh: 1620000,
      Description: 'August 2025 Power Supply (Week 3)'
    },
    {
      InvoiceID: 'VRA-ECG-2025-004',
      ContractID: 'PPA-VRA-ECG-2024-01',
      Issuer: 'VRA',
      Counterparty: 'ECG',
      PeriodStart: '2025-08-22',
      PeriodEnd: '2025-08-28',
      Currency: 'GHS',
      Amount: 2389012345,
      Taxes: 298352586,
      Energy_MWh: 1541000,
      Description: 'August 2025 Power Supply (Week 4)'
    },
    {
      InvoiceID: 'VRA-ECG-2025-005',
      ContractID: 'PPA-VRA-ECG-2024-01',
      Issuer: 'VRA',
      Counterparty: 'ECG',
      PeriodStart: '2025-08-29',
      PeriodEnd: '2025-09-04',
      Currency: 'GHS',
      Amount: 2656789012,
      Taxes: 332511832,
      Energy_MWh: 1714000,
      Description: 'August 2025 Power Supply (Week 5)'
    },
    {
      InvoiceID: 'VRA-ECG-2025-006',
      ContractID: 'PPA-VRA-ECG-2024-01',
      Issuer: 'VRA',
      Counterparty: 'ECG',
      PeriodStart: '2025-09-05',
      PeriodEnd: '2025-09-11',
      Currency: 'GHS',
      Amount: 2723456789,
      Taxes: 340432019,
      Energy_MWh: 1756000,
      Description: 'September 2025 Power Supply (Week 1)'
    },
    
    // IPP Alpha to ECG invoices
    {
      InvoiceID: 'IPP_ALPHA-ECG-2025-001',
      ContractID: 'PPA-IPP_ALPHA-ECG-2024-01',
      Issuer: 'IPP_ALPHA',
      Counterparty: 'ECG',
      PeriodStart: '2025-08-01',
      PeriodEnd: '2025-08-07',
      Currency: 'GHS',
      Amount: 890123456,
      Taxes: 111265432,
      Energy_MWh: 539000,
      Description: 'August 2025 Power Supply (IPP Alpha)'
    },
    {
      InvoiceID: 'IPP_ALPHA-ECG-2025-002',
      ContractID: 'PPA-IPP_ALPHA-ECG-2024-01',
      Issuer: 'IPP_ALPHA',
      Counterparty: 'ECG',
      PeriodStart: '2025-08-08',
      PeriodEnd: '2025-08-14',
      Currency: 'GHS',
      Amount: 923456789,
      Taxes: 115432098,
      Energy_MWh: 559000,
      Description: 'August 2025 Power Supply (IPP Alpha Week 2)'
    },
    
    // GNPC to VRA invoices
    {
      InvoiceID: 'GNPC-VRA-2025-001',
      ContractID: 'GSA-GNPC-VRA-2024-01',
      Issuer: 'GNPC',
      Counterparty: 'VRA',
      PeriodStart: '2025-08-01',
      PeriodEnd: '2025-08-07',
      Currency: 'USD',
      Amount: 45000000,
      Taxes: 0,
      Gas_mmscf: 7258064,
      Description: 'August 2025 Gas Supply'
    },
    {
      InvoiceID: 'GNPC-VRA-2025-002',
      ContractID: 'GSA-GNPC-VRA-2024-01',
      Issuer: 'GNPC',
      Counterparty: 'VRA',
      PeriodStart: '2025-08-08',
      PeriodEnd: '2025-08-14',
      Currency: 'USD',
      Amount: 47500000,
      Taxes: 0,
      Gas_mmscf: 7660416,
      Description: 'August 2025 Gas Supply (Week 2)'
    },
    
    // BOST to ECG invoices
    {
      InvoiceID: 'BOST-ECG-2025-001',
      ContractID: 'FSA-BOST-ECG-2024-01',
      Issuer: 'BOST',
      Counterparty: 'ECG',
      PeriodStart: '2025-08-01',
      PeriodEnd: '2025-08-07',
      Currency: 'GHS',
      Amount: 234567890,
      Taxes: 293234862,
      Fuel_ltrs: 187654320,
      Description: 'August 2025 Diesel Supply'
    }
  ],
  
  payments: [
    // Partial payments from ECG to VRA
    {
      PaymentID: 'ECG-VRA-2025-001',
      InvoiceID: 'VRA-ECG-2025-001',
      Payer: 'ECG',
      Payee: 'VRA',
      Amount: 1567890123,
      Currency: 'GHS',
      ValueDate: '2025-09-15',
      BankRef: 'ECG-VRA-2025-001',
      Status: 'COMPLETED',
      Method: 'BANK_TRANSFER'
    },
    {
      PaymentID: 'ECG-VRA-2025-002',
      InvoiceID: 'VRA-ECG-2025-002',
      Payer: 'ECG',
      Payee: 'VRA',
      Amount: 1967890123,
      Currency: 'GHS',
      ValueDate: '2025-09-22',
      BankRef: 'ECG-VRA-2025-002',
      Status: 'COMPLETED',
      Method: 'BANK_TRANSFER'
    },
    
    // Partial payments from ECG to IPP Alpha
    {
      PaymentID: 'ECG-IPP_ALPHA-2025-001',
      InvoiceID: 'IPP_ALPHA-ECG-2025-001',
      Payer: 'ECG',
      Payee: 'IPP_ALPHA',
      Amount: 445612345,
      Currency: 'GHS',
      ValueDate: '2025-09-10',
      BankRef: 'ECG-IPP_ALPHA-2025-001',
      Status: 'COMPLETED',
      Method: 'BANK_TRANSFER'
    },
    
    // Payment from VRA to GNPC
    {
      PaymentID: 'VRA-GNPC-2025-001',
      InvoiceID: 'GNPC-VRA-2025-001',
      Payer: 'VRA',
      Payee: 'GNPC',
      Amount: 40500000,
      Currency: 'USD',
      ValueDate: '2025-09-05',
      BankRef: 'VRA-GNPC-2025-001',
      Status: 'COMPLETED',
      Method: 'BANK_TRANSFER'
    }
  ],
  
  disputes: [
    {
      DisputeID: 'DSP-VRA-ECG-2025-001',
      InvoiceID: 'VRA-ECG-2025-003',
      ContractID: 'PPA-VRA-ECG-2024-01',
      RaisedBy: 'ECG',
      ReceivedBy: 'VRA',
      ReasonCode: 'QUANTITY_VARIANCE',
      Description: 'ECG reports meter reading variance of 8.3% for August Week 3 delivery',
      Status: 'OPEN',
      SLADeadline: '2025-10-15',
      Evidence: 'Meter reading discrepancy documentation attached'
    },
    {
      DisputeID: 'DSP-IPP_ALPHA-ECG-2025-001',
      InvoiceID: 'IPP_ALPHA-ECG-2025-002',
      ContractID: 'PPA-IPP_ALPHA-ECG-2024-01',
      RaisedBy: 'ECG',
      ReceivedBy: 'IPP_ALPHA',
      ReasonCode: 'PRICE_VARIANCE',
      Description: 'ECG claims 3.5% overcharge on tariff calculation',
      Status: 'UNDER_REVIEW',
      SLADeadline: '2025-10-20',
      Evidence: 'Tariff schedule and calculation sheets'
    }
  ]
}

async function main() {
  console.log('🌱 Importing Ghana Energy Sector Accounts Payable Data...')
  
  try {
    // Clear existing data
    console.log('🗑️ Clearing existing data...')
    await prisma.auditLog.deleteMany({})
    await prisma.payment.deleteMany({})
    await prisma.dispute.deleteMany({})
    await prisma.delivery.deleteMany({})
    await prisma.invoice.deleteMany({})
    await prisma.contract.deleteMany({})
    await prisma.party.deleteMany({})
    await prisma.settlementBatch.deleteMany({})
    
    // Import parties
    console.log('👥 Importing parties...')
    let partiesImported = 0
    for (const partyData of apData.parties) {
      try {
        await prisma.party.create({
          data: {
            partyId: partyData.PartyID,
            name: partyData.Name,
            type: mapPartyType(partyData.Type),
            bankDetails: partyData.BankDetails,
            taxId: partyData.TaxID,
            isActive: true
          }
        })
        partiesImported++
        console.log(`✅ Imported party: ${partyData.Name}`)
      } catch (error) {
        console.error(`❌ Error importing party ${partyData.Name}:`, error)
      }
    }
    
    // Import contracts
    console.log('📋 Importing contracts...')
    let contractsImported = 0
    for (const contractData of apData.contracts) {
      try {
        const partyA = await prisma.party.findFirst({
          where: { partyId: contractData.PartyA_ID }
        })
        const partyB = await prisma.party.findFirst({
          where: { partyId: contractData.PartyB_ID }
        })
        
        if (partyA && partyB) {
          await prisma.contract.create({
            data: {
              contractId: contractData.ContractID,
              partyAId: partyA.id,
              partyBId: partyB.id,
              type: mapContractType(contractData.Type),
              pricingFormula: contractData.PricingFormula,
              meteringPoints: contractData.MeteringPoints,
              slas: contractData.SLAs,
              startDate: new Date(contractData.StartDate),
              endDate: contractData.EndDate ? new Date(contractData.EndDate) : null,
              currency: contractData.Currency,
              isActive: true
            }
          })
          contractsImported++
          console.log(`✅ Imported contract: ${contractData.ContractID}`)
        } else {
          console.error(`❌ Error importing contract ${contractData.ContractID}: Party not found`)
        }
      } catch (error) {
        console.error(`❌ Error importing contract ${contractData.ContractID}:`, error)
      }
    }
    
    // Import invoices
    console.log('🧾 Importing invoices...')
    let invoicesImported = 0
    for (const invoiceData of apData.invoices) {
      try {
        const contract = await prisma.contract.findFirst({
          where: { contractId: invoiceData.ContractID }
        })
        const issuer = await prisma.party.findFirst({
          where: { partyId: invoiceData.Issuer }
        })
        const counterparty = await prisma.party.findFirst({
          where: { partyId: invoiceData.Counterparty }
        })
        
        if (contract && issuer && counterparty) {
          const lineItems = {
            energy: invoiceData.Energy_MWh || 0,
            gas: invoiceData.Gas_mmscf || 0,
            fuel: invoiceData.Fuel_ltrs || 0
          }
          
          await prisma.invoice.create({
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
          invoicesImported++
          console.log(`✅ Imported invoice: ${invoiceData.InvoiceID}`)
        } else {
          console.error(`❌ Error importing invoice ${invoiceData.InvoiceID}: Related entity not found`)
        }
      } catch (error) {
        console.error(`❌ Error importing invoice ${invoiceData.InvoiceID}:`, error)
      }
    }
    
    // Import payments
    console.log('💰 Importing payments...')
    let paymentsImported = 0
    for (const paymentData of apData.payments) {
      try {
        let invoice = null
        if (paymentData.InvoiceID) {
          invoice = await prisma.invoice.findFirst({
            where: { invoiceId: paymentData.InvoiceID }
          })
        }
        
        const payer = await prisma.party.findFirst({
          where: { partyId: paymentData.Payer }
        })
        const payee = await prisma.party.findFirst({
          where: { partyId: paymentData.Payee }
        })
        
        if (payer && payee) {
          await prisma.payment.create({
            data: {
              paymentId: paymentData.PaymentID,
              invoiceId: invoice?.id,
              payerId: payer.id,
              payeeId: payee.id,
              amount: paymentData.Amount,
              currency: paymentData.Currency,
              valueDate: new Date(paymentData.ValueDate),
              bankReference: paymentData.BankRef,
              status: mapPaymentStatus(paymentData.Status)
            }
          })
          paymentsImported++
          console.log(`✅ Imported payment: ${paymentData.PaymentID}`)
        }
      } catch (error) {
        console.error(`❌ Error importing payment ${paymentData.PaymentID}:`, error)
      }
    }
    
    // Import disputes
    console.log('⚠️ Importing disputes...')
    let disputesImported = 0
    for (const disputeData of apData.disputes) {
      try {
        const contract = await prisma.contract.findFirst({
          where: { contractId: disputeData.ContractID }
        })
        const raisedBy = await prisma.party.findFirst({
          where: { partyId: disputeData.RaisedBy }
        })
        const receivedBy = await prisma.party.findFirst({
          where: { partyId: disputeData.ReceivedBy }
        })
        
        if (contract && raisedBy && receivedBy) {
          let invoice = null
          if (disputeData.InvoiceID) {
            invoice = await prisma.invoice.findFirst({
              where: { invoiceId: disputeData.InvoiceID }
            })
          }
          
          await prisma.dispute.create({
            data: {
              disputeId: disputeData.DisputeID,
              invoiceId: invoice?.id,
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
          disputesImported++
          console.log(`✅ Imported dispute: ${disputeData.DisputeID}`)
        } else {
          console.error(`❌ Error importing dispute ${disputeData.DisputeID}: Related entity not found`)
        }
      } catch (error) {
        console.error(`❌ Error importing dispute ${disputeData.DisputeID}:`, error)
      }
    }
    
    // Generate deliveries for invoices
    console.log('🚚 Generating deliveries for invoices...')
    const invoices = await prisma.invoice.findMany({
      where: { 
        status: InvoiceStatus.PENDING 
      },
      include: { contract: true }
    })
    
    let deliveriesGenerated = 0
    for (const invoice of invoices) {
      try {
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
        
        // Generate daily deliveries
        for (let day = 0; day < daysDiff; day++) {
          const deliveryDate = new Date(periodStart.getTime() + day * 24 * 60 * 60 * 1000)
          
          // Add realistic variance to quantities
          const variance = 1 + (Math.random() - 0.5) * 2 * 0.05 // 5% variance
          const energyVariance = expectedEnergy > 0 ? variance : 1
          const gasVariance = expectedGas > 0 ? variance : 1
          const fuelVariance = expectedFuel > 0 ? variance : 1
          
          const quantity = (expectedEnergy * energyVariance) || (expectedGas * gasVariance) || (expectedFuel * fuelVariance)
          
          const deliveryData = {
            deliveryId: `DEL-${invoice.invoiceId}-${day + 1}`,
            contractId: invoice.contractId,
            timestamp: deliveryDate,
            meterReadStart: day === 0 ? 1000000 : 1000000 + (day - 1) * (expectedEnergy / daysDiff),
            meterReadEnd: 1000000 + day * (expectedEnergy / daysDiff) * energyVariance,
            quantity: quantity,
            sourceSystem: determineSourceSystem(invoice.contract.type),
            qualityScore: 90 + Math.random() * 10
          }
          
          await prisma.delivery.create({
            data: deliveryData
          })
          deliveriesGenerated++
        }
        
        // Update invoice status to matched
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: InvoiceStatus.MATCHED,
            confidenceScore: 95.0,
            matchedDeliveries: JSON.stringify(
              Array.from({ length: daysDiff }, (_, i) => `DEL-${invoice.invoiceId}-${i + 1}`)
            )
          }
        })
      } catch (error) {
        console.error(`❌ Error generating deliveries for invoice ${invoice.invoiceId}:`, error)
      }
    }
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'BULK_IMPORT_AP_DATA',
        entityType: 'SYSTEM',
        entityId: 'BULK_IMPORT',
        newValues: JSON.stringify({
          parties: { imported: partiesImported },
          contracts: { imported: contractsImported },
          invoices: { imported: invoicesImported },
          payments: { imported: paymentsImported },
          deliveries: { imported: deliveriesGenerated },
          disputes: { imported: disputesImported }
        }),
        timestamp: new Date()
      }
    })
    
    console.log('🎉 Data import completed successfully!')
    console.log(`📊 Summary:`)
    console.log(`   Parties: ${partiesImported}`)
    console.log(`   Contracts: ${contractsImported}`)
    console.log(`   Invoices: ${invoicesImported}`)
    console.log(`   Payments: ${paymentsImported}`)
    console.log(`   Deliveries: ${deliveriesGenerated}`)
    console.log(`   Disputes: ${disputesImported}`)
    
  } catch (error) {
    console.error('❌ Data import failed:', error)
    process.exit(1)
  }
}

main()
  .catch((error) => {
    console.error('Fatal error during data import:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })