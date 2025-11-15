import { PrismaClient, PartyType, ContractType, InvoiceStatus, PaymentStatus, DisputeReason, DisputeStatus, UserRole, SettlementStatus } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding NEPAR database with sample data...')

  // Clean existing data
  await prisma.auditLog.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.dispute.deleteMany()
  await prisma.delivery.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.settlementBatch.deleteMany()
  await prisma.contract.deleteMany()
  await prisma.party.deleteMany()
  await prisma.user.deleteMany()

  // Create Users
  console.log('Creating users...')
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'minister@energy.gov.gh',
        name: 'Minister of Energy',
        role: UserRole.MINISTER
      }
    }),
    prisma.user.create({
      data: {
        email: 'treasury@finance.gov.gh',
        name: 'Treasury Director',
        role: UserRole.TREASURY
      }
    }),
    prisma.user.create({
      data: {
        email: 'ecg.cfo@ecg.com.gh',
        name: 'ECG CFO',
        role: UserRole.AGENCY_CFO
      }
    })
  ])

  // Create Parties
  console.log('Creating parties...')
  const parties = await Promise.all([
    // Energy Sector Parties
    prisma.party.create({
      data: {
        partyId: 'ECG',
        name: 'Electricity Company of Ghana',
        type: PartyType.DISTRIBUTOR,
        bankDetails: 'ECG-001-GCB',
        taxId: 'GH-ECG-001'
      }
    }),
    prisma.party.create({
      data: {
        partyId: 'VRA',
        name: 'Volta River Authority',
        type: PartyType.GENERATOR,
        bankDetails: 'VRA-002-GCB',
        taxId: 'GH-VRA-002'
      }
    }),
    prisma.party.create({
      data: {
        partyId: 'GRIDCo',
        name: 'Ghana Grid Company',
        type: PartyType.TRANSMISSION,
        bankDetails: 'GRIDCO-003-GCB',
        taxId: 'GH-GRID-003'
      }
    }),
    prisma.party.create({
      data: {
        partyId: 'GNPC',
        name: 'Ghana National Petroleum Corporation',
        type: PartyType.FUEL_SUPPLIER,
        bankDetails: 'GNPC-004-GCB',
        taxId: 'GH-GNPC-004'
      }
    }),
    prisma.party.create({
      data: {
        partyId: 'BOST',
        name: 'Bulk Oil Storage and Transportation',
        type: PartyType.FUEL_SUPPLIER,
        bankDetails: 'BOST-005-GCB',
        taxId: 'GH-BOST-005'
      }
    }),
    prisma.party.create({
      data: {
        partyId: 'IPP_ALPHA',
        name: 'IPP Alpha Power',
        type: PartyType.GENERATOR,
        bankDetails: 'IPPALPHA-006-GCB',
        taxId: 'GH-IPPA-006'
      }
    }),
    prisma.party.create({
      data: {
        partyId: 'IPP_BETA',
        name: 'IPP Beta Power',
        type: PartyType.GENERATOR,
        bankDetails: 'IPPBETA-007-GCB',
        taxId: 'GH-IPPB-007'
      }
    }),
    prisma.party.create({
      data: {
        partyId: 'MOF',
        name: 'Ministry of Finance',
        type: PartyType.FINANCIAL,
        bankDetails: 'MOF-008-GCB',
        taxId: 'GH-MOF-008'
      }
    }),
    prisma.party.create({
      data: {
        partyId: 'PARTNER_BANK',
        name: 'Partner Bank Ghana',
        type: PartyType.FINANCIAL,
        bankDetails: 'PBANK-009-GCB',
        taxId: 'GH-PBANK-009'
      }
    })
  ])

  // Create Contracts
  console.log('Creating contracts...')
  const contracts = await Promise.all([
    // PPAs (Power Purchase Agreements)
    prisma.contract.create({
      data: {
        contractId: 'PPA-VRA-ECG-001',
        partyAId: parties.find(p => p.partyId === 'VRA')!.id,
        partyBId: parties.find(p => p.partyId === 'ECG')!.id,
        type: ContractType.PPA,
        pricingFormula: '{"base_rate": 1550, "capacity_charge": 200, "energy_charge": 1350}',
        meteringPoints: '["VRA-ACCRA-METER-001", "VRA-KUMASI-METER-001"]',
        slas: '{"availability": 99.5, "dispatch_response": 15}',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2029-12-31'),
        currency: 'GHS'
      }
    }),
    prisma.contract.create({
      data: {
        contractId: 'PPA-IPP_ALPHA-ECG-001',
        partyAId: parties.find(p => p.partyId === 'IPP_ALPHA')!.id,
        partyBId: parties.find(p => p.partyId === 'ECG')!.id,
        type: ContractType.PPA,
        pricingFormula: '{"base_rate": 1650, "capacity_charge": 250, "energy_charge": 1400}',
        meteringPoints: '["IPPALPHA-ACCRA-METER-001"]',
        slas: '{"availability": 98.0, "dispatch_response": 20}',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2028-12-31'),
        currency: 'GHS'
      }
    }),
    prisma.contract.create({
      data: {
        contractId: 'PPA-IPP_BETA-ECG-001',
        partyAId: parties.find(p => p.partyId === 'IPP_BETA')!.id,
        partyBId: parties.find(p => p.partyId === 'ECG')!.id,
        type: ContractType.PPA,
        pricingFormula: '{"base_rate": 1600, "capacity_charge": 220, "energy_charge": 1380}',
        meteringPoints: '["IPPBETA-TAKORADI-METER-001"]',
        slas: '{"availability": 97.5, "dispatch_response": 25}',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2027-12-31'),
        currency: 'GHS'
      }
    }),
    // GSA (Gas Supply Agreement)
    prisma.contract.create({
      data: {
        contractId: 'GSA-GNPC-VRA-001',
        partyAId: parties.find(p => p.partyId === 'GNPC')!.id,
        partyBId: parties.find(p => p.partyId === 'VRA')!.id,
        type: ContractType.GSA,
        pricingFormula: '{"gas_price": 6.2, "transportation_cost": 0.8}',
        meteringPoints: '["GNPC-VRA-TERMINAL-001"]',
        slas: '{"gas_quality": 95, "supply_continuity": 99}',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2030-12-31'),
        currency: 'USD'
      }
    }),
    // FSA (Fuel Supply Agreement)
    prisma.contract.create({
      data: {
        contractId: 'FSA-BOST-ECG-001',
        partyAId: parties.find(p => p.partyId === 'BOST')!.id,
        partyBId: parties.find(p => p.partyId === 'ECG')!.id,
        type: ContractType.FSA,
        pricingFormula: '{"diesel_price": 12.5, "transportation_cost": 0.5}',
        meteringPoints: '["BOST-ECG-DEPOT-001", "BOST-ECG-DEPOT-002"]',
        slas: '{"fuel_quality": 98, "delivery_time": 48}',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2029-12-31'),
        currency: 'GHS'
      }
    }),
    // Wheeling Agreement
    prisma.contract.create({
      data: {
        contractId: 'WHEELING-GRIDCo-ECG-001',
        partyAId: parties.find(p => p.partyId === 'GRIDCo')!.id,
        partyBId: parties.find(p => p.partyId === 'ECG')!.id,
        type: ContractType.WHEELING,
        pricingFormula: '{"wheeling_charge": 0.05, "losses": 3.5}',
        meteringPoints: '["GRIDCO-NATIONAL-GRID"]',
        slas: '{"grid_availability": 99.9, "voltage_stability": 98}',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2035-12-31'),
        currency: 'GHS'
      }
    })
  ])

  // Create Deliveries (Daily for the last 30 days)
  console.log('Creating deliveries...')
  const deliveries = []
  const today = new Date()
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    // VRA Deliveries
    deliveries.push({
      deliveryId: `DEL-VRA-${date.toISOString().split('T')[0]}-001`,
      contractId: contracts.find(c => c.contractId === 'PPA-VRA-ECG-001')!.id,
      timestamp: date,
      meterReadStart: 1000000 + Math.random() * 100000,
      meterReadEnd: 1000000 + Math.random() * 100000 + 20000 + Math.random() * 5000,
      quantity: 20000 + Math.random() * 10000, // 20-30 MWh per day
      sourceSystem: 'VRA-SCADA',
      qualityScore: 95 + Math.random() * 5
    })
    
    // IPP Alpha Deliveries
    deliveries.push({
      deliveryId: `DEL-IPP_ALPHA-${date.toISOString().split('T')[0]}-001`,
      contractId: contracts.find(c => c.contractId === 'PPA-IPP_ALPHA-ECG-001')!.id,
      timestamp: date,
      meterReadStart: 500000 + Math.random() * 50000,
      meterReadEnd: 500000 + Math.random() * 50000 + 12000 + Math.random() * 3000,
      quantity: 12000 + Math.random() * 6000, // 12-18 MWh per day
      sourceSystem: 'IPP_ALPHA-SCADA',
      qualityScore: 94 + Math.random() * 6
    })
    
    // IPP Beta Deliveries
    deliveries.push({
      deliveryId: `DEL-IPP_BETA-${date.toISOString().split('T')[0]}-001`,
      contractId: contracts.find(c => c.contractId === 'PPA-IPP_BETA-ECG-001')!.id,
      timestamp: date,
      meterReadStart: 400000 + Math.random() * 40000,
      meterReadEnd: 400000 + Math.random() * 40000 + 10000 + Math.random() * 2500,
      quantity: 10000 + Math.random() * 5000, // 10-15 MWh per day
      sourceSystem: 'IPP_BETA-SCADA',
      qualityScore: 93 + Math.random() * 7
    })
  }

  await prisma.delivery.createMany({ data: deliveries })

  // Create Invoices (Weekly for the last 8 weeks)
  console.log('Creating invoices...')
  const invoices = []
  
  for (let week = 7; week >= 0; week--) {
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - (week * 7 + 6))
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() - (week * 7))
    
    // VRA Invoice
    const vraAmount = (20000 + Math.random() * 10000) * 7 * 1550 // 7 days * average daily * rate
    invoices.push({
      invoiceId: `INV-VRA-${weekStart.toISOString().slice(0, 7)}-W${8-week}`,
      contractId: contracts.find(c => c.contractId === 'PPA-VRA-ECG-001')!.id,
      issuerId: parties.find(p => p.partyId === 'VRA')!.id,
      counterpartyId: parties.find(p => p.partyId === 'ECG')!.id,
      periodStart: weekStart,
      periodEnd: weekEnd,
      currency: 'GHS',
      totalAmount: vraAmount,
      taxAmount: vraAmount * 0.125, // 12.5% VAT
      lineItems: JSON.stringify({
        energy: (20000 + Math.random() * 10000) * 7,
        capacity: 1000,
        ancillary: 50000
      }),
      status: InvoiceStatus.PENDING,
      hash: createHash('sha256').update(`VRA-${weekStart.toISOString()}`).digest('hex')
    })
    
    // IPP Alpha Invoice
    const ippAlphaAmount = (12000 + Math.random() * 6000) * 7 * 1650
    invoices.push({
      invoiceId: `INV-IPP_ALPHA-${weekStart.toISOString().slice(0, 7)}-W${8-week}`,
      contractId: contracts.find(c => c.contractId === 'PPA-IPP_ALPHA-ECG-001')!.id,
      issuerId: parties.find(p => p.partyId === 'IPP_ALPHA')!.id,
      counterpartyId: parties.find(p => p.partyId === 'ECG')!.id,
      periodStart: weekStart,
      periodEnd: weekEnd,
      currency: 'GHS',
      totalAmount: ippAlphaAmount,
      taxAmount: ippAlphaAmount * 0.125,
      lineItems: JSON.stringify({
        energy: (12000 + Math.random() * 6000) * 7,
        capacity: 800,
        ancillary: 40000
      }),
      status: InvoiceStatus.PENDING,
      hash: createHash('sha256').update(`IPP_ALPHA-${weekStart.toISOString()}`).digest('hex')
    })
    
    // GNPC Gas Invoice
    const gnpcAmount = 50000 * 7 * 6.2 * 15.5 // 50k mmscf/day * 7 days * $6.2 * exchange rate
    invoices.push({
      invoiceId: `INV-GNPC-${weekStart.toISOString().slice(0, 7)}-W${8-week}`,
      contractId: contracts.find(c => c.contractId === 'GSA-GNPC-VRA-001')!.id,
      issuerId: parties.find(p => p.partyId === 'GNPC')!.id,
      counterpartyId: parties.find(p => p.partyId === 'VRA')!.id,
      periodStart: weekStart,
      periodEnd: weekEnd,
      currency: 'USD',
      totalAmount: gnpcAmount,
      taxAmount: 0,
      lineItems: JSON.stringify({
        gas: 50000 * 7,
        transportation: 50000 * 7 * 0.8
      }),
      status: InvoiceStatus.PENDING,
      hash: createHash('sha256').update(`GNPC-${weekStart.toISOString()}`).digest('hex')
    })
  }

  const createdInvoices = await prisma.invoice.createMany({ data: invoices })
  
  // Create some Payments (partial payments to simulate arrears)
  console.log('Creating payments...')
  const payments = []
  
  // Get some invoices to create payments for
  const invoiceList = await prisma.invoice.findMany({ take: 12 })
  
  invoiceList.forEach((invoice, index) => {
    if (index < 8) { // Create partial payments for first 8 invoices
      const partialAmount = invoice.totalAmount * (0.3 + Math.random() * 0.4) // 30-70% payment
      payments.push({
        paymentId: `PAY-${invoice.invoiceId}-001`,
        invoiceId: invoice.id,
        payerId: invoice.counterpartyId,
        payeeId: invoice.issuerId,
        amount: partialAmount,
        currency: invoice.currency,
        valueDate: new Date(invoice.periodEnd.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days after period
        bankReference: `BANK-REF-${Date.now()}-${index}`,
        status: PaymentStatus.COMPLETED
      })
    }
  })
  
  await prisma.payment.createMany({ data: payments })

  // Create some Disputes
  console.log('Creating disputes...')
  const disputes = []
  
  // Create a few sample disputes
  const disputeInvoices = await prisma.invoice.findMany({ 
    take: 3,
    where: { status: InvoiceStatus.PENDING }
  })
  
  disputeInvoices.forEach((invoice, index) => {
    disputes.push({
      disputeId: `DSP-${index + 1}-${Date.now()}`,
      invoiceId: invoice.id,
      contractId: invoice.contractId,
      raisedById: invoice.counterpartyId,
      receivedById: invoice.issuerId,
      reasonCode: index === 0 ? DisputeReason.QUANTITY_VARIANCE : 
                  index === 1 ? DisputeReason.PRICE_VARIANCE : 
                  DisputeReason.MISSING_DELIVERY_PROOF,
      description: index === 0 ? 'Quantity variance detected in meter readings' :
                   index === 1 ? 'Price discrepancy in tariff calculation' :
                   'Missing delivery documentation for specified period',
      status: DisputeStatus.OPEN,
      slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      rulingAmount: index === 2 ? invoice.totalAmount * 0.85 : null // 15% reduction for third dispute
    })
  })
  
  await prisma.dispute.createMany({ data: disputes })

  // Create Audit Logs
  console.log('Creating audit logs...')
  const auditLogs = []
  
  // Sample audit log entries
  const actions = [
    { action: 'CREATE_INVOICE', entityType: 'invoice', description: 'Invoice created' },
    { action: 'CREATE_PAYMENT', entityType: 'payment', description: 'Payment processed' },
    { action: 'CREATE_DISPUTE', entityType: 'dispute', description: 'Dispute raised' },
    { action: 'RUN_RECONCILIATION', entityType: 'system', description: 'Auto-reconciliation executed' },
    { action: 'UPDATE_INVOICE_STATUS', entityType: 'invoice', description: 'Invoice status updated' }
  ]
  
  for (let i = 0; i < 20; i++) {
    const randomAction = actions[Math.floor(Math.random() * actions.length)]
    auditLogs.push({
      action: randomAction.action,
      entityType: randomAction.entityType,
      entityId: `ENTITY-${i + 1}`,
      oldValues: i % 3 === 0 ? JSON.stringify({ status: 'PENDING' }) : null,
      newValues: JSON.stringify({ 
        status: i % 2 === 0 ? 'COMPLETED' : 'PROCESSING',
        timestamp: new Date().toISOString()
      }),
      ipAddress: `192.168.1.${100 + (i % 50)}`,
      userAgent: 'NEPAR-System/1.0'
    })
  }
  
  await prisma.auditLog.createMany({ data: auditLogs })

  // Create Settlement Batches
  console.log('Creating settlement batches...')
  const settlementBatches = []
  
  for (let month = 2; month >= 0; month--) {
    const periodDate = new Date(today)
    periodDate.setMonth(periodDate.getMonth() - month)
    const period = periodDate.toISOString().slice(0, 7) // YYYY-MM format
    
    settlementBatches.push({
      batchId: `SB-${period.replace('-', '')}-${Date.now()}`,
      period: period,
      fxRate: 15.5 + Math.random() * 2,
      totalNetAmount: 1000000000 + Math.random() * 500000000,
      status: month === 0 ? SettlementStatus.COMPUTED : 
              month === 1 ? SettlementStatus.EXECUTED : 
              SettlementStatus.EXECUTED,
      executedAt: month > 0 ? new Date(periodDate.getTime() + 5 * 24 * 60 * 60 * 1000) : null
    })
  }
  
  await prisma.settlementBatch.createMany({ data: settlementBatches })

  console.log('✅ Sample data creation completed!')
  console.log(`📊 Created ${parties.length} parties`)
  console.log(`📋 Created ${contracts.length} contracts`)
  console.log(`📦 Created ${deliveries.length} deliveries`)
  console.log(`🧾 Created ${invoices.count} invoices`)
  console.log(`💰 Created ${payments.length} payments`)
  console.log(`⚠️ Created ${disputes.length} disputes`)
  console.log(`📝 Created ${auditLogs.length} audit logs`)
  console.log(`🏦 Created ${settlementBatches.length} settlement batches`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })