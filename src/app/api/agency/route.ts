import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ZAI } from 'z-ai-web-dev-sdk'

interface AgencyWorkspace {
  agencyId: string
  agencyName: string
  overview: {
    totalInvoices: number
    pendingInvoices: number
    matchedInvoices: number
    disputedInvoices: number
    totalReceivable: number
    totalPayable: number
    netPosition: number
    agingBuckets: {
      current: number
      days30: number
      days60: number
      days90: number
      days90Plus: number
    }
  }
  invoices: Array<{
    id: string
    invoiceId: string
    contractId: string
    counterparty: string
    periodStart: Date
    periodEnd: Date
    amount: number
    currency: string
    status: string
    aging: number
    confidenceScore?: number
    matchedDeliveries?: string[]
    disputes?: any[]
  }>
  disputes: Array<{
    id: string
    disputeId: string
    invoiceId: string
    reasonCode: string
    description: string
    status: string
    raisedBy: string
    receivedBy: string
    amount: number
    createdAt: Date
    slaDeadline: Date
    assignedTo?: string
    resolution?: string
    evidence: any[]
  }>
  payments: Array<{
    id: string
    paymentId: string
    invoiceId?: string
    payer: string
    payee: string
    amount: number
    currency: string
    valueDate: Date
    status: string
    bankReference: string
    settlementBatchId?: string
  }>
  analytics: {
    cashFlowForecast: any[]
    paymentPatterns: any[]
    disputeTrends: any[]
    riskIndicators: any[]
    recommendations: string[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()
    
    switch (action) {
      case 'CREATE_INVOICE':
        return await createInvoice(data)
      case 'UPDATE_INVOICE':
        return await updateInvoice(data)
      case 'RAISE_DISPUTE':
        return await raiseDispute(data)
      case 'RESOLVE_DISPUTE':
        return await resolveDispute(data)
      case 'SUBMIT_EVIDENCE':
        return await submitEvidence(data)
      case 'APPROVE_PAYMENT':
        return await approvePayment(data)
      case 'GENERATE_REPORTS':
        return await generateAgencyReports(data)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Agency operation error:', error)
    return NextResponse.json({ error: 'Agency operation failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const agencyId = searchParams.get('agencyId')
    
    if (!agencyId && action !== 'LIST_AGENCIES') {
      return NextResponse.json({ error: 'Agency ID required' }, { status: 400 })
    }
    
    switch (action) {
      case 'GET_WORKSPACE':
        return await getAgencyWorkspace(agencyId!)
      case 'GET_INVOICES':
        return await getAgencyInvoices(agencyId!)
      case 'GET_DISPUTES':
        return await getAgencyDisputes(agencyId!)
      case 'GET_PAYMENTS':
        return await getAgencyPayments(agencyId!)
      case 'GET_AGING_REPORT':
        return await getAgingReport(agencyId!)
      case 'GET_CASH_FORECAST':
        return await getAgencyCashForecast(agencyId!)
      case 'GET_PERFORMANCE_METRICS':
        return await getPerformanceMetrics(agencyId!)
      case 'LIST_AGENCIES':
        return await listAgencies()
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Agency query error:', error)
    return NextResponse.json({ error: 'Agency query failed' }, { status: 500 })
  }
}

async function getAgencyWorkspace(agencyId: string) {
  const agency = await db.party.findUnique({
    where: { id: agencyId }
  })
  
  if (!agency) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
  }
  
  // Get overview data
  const overview = await getAgencyOverview(agencyId)
  
  // Get invoices with detailed information
  const invoices = await getAgencyInvoices(agencyId)
  
  // Get disputes
  const disputes = await getAgencyDisputes(agencyId)
  
  // Get payments
  const payments = await getAgencyPayments(agencyId)
  
  // Generate analytics
  const analytics = await generateAgencyAnalytics(agencyId)
  
  const workspace: AgencyWorkspace = {
    agencyId,
    agencyName: agency.name,
    overview,
    invoices,
    disputes,
    payments,
    analytics
  }
  
  return NextResponse.json(workspace)
}

async function getAgencyOverview(agencyId: string) {
  const [
    totalInvoices,
    pendingInvoices,
    matchedInvoices,
    disputedInvoices,
    receivableData,
    payableData,
    agingData
  ] = await Promise.all([
    db.invoice.count({
      where: { OR: [{ issuerId: agencyId }, { counterpartyId: agencyId }] }
    }),
    db.invoice.count({
      where: { 
        OR: [{ issuerId: agencyId }, { counterpartyId: agencyId }],
        status: 'PENDING'
      }
    }),
    db.invoice.count({
      where: { 
        OR: [{ issuerId: agencyId }, { counterpartyId: agencyId }],
        status: 'MATCHED'
      }
    }),
    db.invoice.count({
      where: { 
        OR: [{ issuerId: agencyId }, { counterpartyId: agencyId }],
        status: 'DISPUTED'
      }
    }),
    db.invoice.aggregate({
      where: { issuerId: agencyId },
      _sum: { totalAmount: true }
    }),
    db.invoice.aggregate({
      where: { counterpartyId: agencyId },
      _sum: { totalAmount: true }
    }),
    calculateAgingBuckets(agencyId)
  ])
  
  const totalReceivable = receivableData._sum.totalAmount || 0
  const totalPayable = payableData._sum.totalAmount || 0
  const netPosition = totalReceivable - totalPayable
  
  return {
    totalInvoices,
    pendingInvoices,
    matchedInvoices,
    disputedInvoices,
    totalReceivable,
    totalPayable,
    netPosition,
    agingBuckets: agingData
  }
}

async function getAgencyInvoices(agencyId: string) {
  const invoices = await db.invoice.findMany({
    where: { OR: [{ issuerId: agencyId }, { counterpartyId: agencyId }] },
    include: {
      contract: { include: { partyA: true, partyB: true } },
      issuer: { select: { name: true } },
      counterparty: { select: { name: true } },
      payments: true,
      disputes: true
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  })
  
  // Enhance with aging and other calculated fields
  const enhancedInvoices = invoices.map(invoice => {
    const aging = calculateInvoiceAging(invoice)
    const isIssuer = invoice.issuerId === agencyId
    const counterparty = isIssuer ? invoice.counterparty : invoice.issuer
    
    return {
      id: invoice.id,
      invoiceId: invoice.invoiceId,
      contractId: invoice.contractId,
      counterparty: counterparty.name,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      amount: invoice.totalAmount,
      currency: invoice.currency,
      status: invoice.status,
      aging,
      confidenceScore: invoice.confidenceScore,
      matchedDeliveries: invoice.matchedDeliveries ? JSON.parse(invoice.matchedDeliveries) : [],
      disputes: invoice.disputes,
      isIssuer,
      direction: isIssuer ? 'OUTBOUND' : 'INBOUND'
    }
  })
  
  return enhancedInvoices
}

async function getAgencyDisputes(agencyId: string) {
  const disputes = await db.dispute.findMany({
    where: { OR: [{ raisedById: agencyId }, { receivedById: agencyId }] },
    include: {
      invoice: { include: { contract: true } },
      contract: true,
      raisedBy: { select: { name: true } },
      receivedBy: { select: { name: true } },
      assignedTo: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
  
  const enhancedDisputes = disputes.map(dispute => {
    const isRaisedByAgency = dispute.raisedById === agencyId
    const otherParty = isRaisedByAgency ? dispute.receivedBy : dispute.raisedBy
    
    return {
      id: dispute.id,
      disputeId: dispute.disputeId,
      invoiceId: dispute.invoiceId,
      reasonCode: dispute.reasonCode,
      description: dispute.description,
      status: dispute.status,
      raisedBy: dispute.raisedBy.name,
      receivedBy: dispute.receivedBy.name,
      amount: dispute.rulingAmount || 0,
      createdAt: dispute.createdAt,
      slaDeadline: dispute.slaDeadline,
      assignedTo: dispute.assignedTo?.name,
      resolution: dispute.resolution,
      evidence: [], // Would be populated from evidence table
      isRaisedByAgency,
      urgency: calculateUrgency(dispute.slaDeadline),
      timeToResolution: calculateTimeToResolution(dispute)
    }
  })
  
  return enhancedDisputes
}

async function getAgencyPayments(agencyId: string) {
  const payments = await db.payment.findMany({
    where: { OR: [{ payerId: agencyId }, { payeeId: agencyId }] },
    include: {
      invoice: { include: { contract: true } },
      payer: { select: { name: true } },
      payee: { select: { name: true } },
      settlementBatch: true
    },
    orderBy: { valueDate: 'desc' },
    take: 100
  })
  
  const enhancedPayments = payments.map(payment => {
    const isPayer = payment.payerId === agencyId
    const otherParty = isPayer ? payment.payee : payment.payer
    
    return {
      id: payment.id,
      paymentId: payment.paymentId,
      invoiceId: payment.invoiceId,
      payer: otherParty.name,
      payee: payment.payer.name,
      amount: payment.amount,
      currency: payment.currency,
      valueDate: payment.valueDate,
      status: payment.status,
      bankReference: payment.bankReference,
      settlementBatchId: payment.settlementBatchId,
      isPayer,
      direction: isPayer ? 'OUTBOUND' : 'INBOUND',
      settlementMethod: payment.settlementBatchId ? 'NETTING' : 'DIRECT'
    }
  })
  
  return enhancedPayments
}

async function generateAgencyAnalytics(agencyId: string) {
  const zai = await ZAI.create()
  
  try {
    const historicalData = await getAgencyHistoricalData(agencyId)
    
    const prompt = `
    Analyze this energy agency's financial data and provide comprehensive analytics:
    
    Agency Historical Data: ${JSON.stringify(historicalData)}
    
    Provide analytics in JSON format:
    {
      "cashFlowForecast": [
        {"date": "2025-01-14", "inflow": 0, "outflow": 0, "netCash": 0},
        ...
      ],
      "paymentPatterns": [
        {"pattern": "MONTH_END_DELAY", "frequency": 85, "impact": "HIGH"},
        ...
      ],
      "disputeTrends": [
        {"reason": "QUANTITY_VARIANCE", "count": 12, "trend": "INCREASING"},
        ...
      ],
      "riskIndicators": [
        {"indicator": "AGING_INCREASE", "level": "MEDIUM", "description": "..."},
        ...
      ],
      "recommendations": [
        "Implement early payment discounts",
        "Review dispute resolution process",
        ...
      ]
    }
    `
    
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst expert specializing in energy sector agency management.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3
    })
    
    const aiResponse = completion.choices[0]?.message?.content || '{}'
    
    try {
      return JSON.parse(aiResponse)
    } catch (parseError) {
      return generateFallbackAnalytics()
    }
  } catch (error) {
    console.error('Agency analytics AI failed:', error)
    return generateFallbackAnalytics()
  }
}

async function createInvoice(data: any) {
  const { agencyId, invoiceData } = data
  
  // Validate agency authority
  const agency = await db.party.findUnique({ where: { id: agencyId } })
  if (!agency) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
  }
  
  // Validate invoice data
  const validationResult = await validateInvoiceData(invoiceData)
  if (!validationResult.valid) {
    return NextResponse.json({ 
      error: 'Validation failed', 
      issues: validationResult.issues 
    }, { status: 400 })
  }
  
  // Create invoice
  const invoice = await db.invoice.create({
    data: {
      invoiceId: invoiceData.invoiceId,
      contractId: invoiceData.contractId,
      issuerId: agencyId,
      counterpartyId: invoiceData.counterpartyId,
      periodStart: new Date(invoiceData.periodStart),
      periodEnd: new Date(invoiceData.periodEnd),
      currency: invoiceData.currency || 'GHS',
      totalAmount: invoiceData.totalAmount,
      taxAmount: invoiceData.taxAmount,
      lineItems: JSON.stringify(invoiceData.lineItems || {}),
      hash: generateInvoiceHash(invoiceData),
      status: 'PENDING'
    }
  })
  
  // Log audit event
  await db.auditLog.create({
    data: {
      action: 'CREATE_INVOICE',
      entityType: 'invoice',
      entityId: invoice.id,
      userId: invoiceData.createdBy,
      newValues: JSON.stringify(invoiceData)
    }
  })
  
  return NextResponse.json({
    success: true,
    invoice,
    message: 'Invoice created successfully'
  })
}

async function raiseDispute(data: any) {
  const { agencyId, disputeData } = data
  
  // Validate dispute
  const validationResult = await validateDisputeData(disputeData)
  if (!validationResult.valid) {
    return NextResponse.json({ 
      error: 'Validation failed', 
      issues: validationResult.issues 
    }, { status: 400 })
  }
  
  // Create dispute
  const dispute = await db.dispute.create({
    data: {
      disputeId: disputeData.disputeId,
      invoiceId: disputeData.invoiceId,
      contractId: disputeData.contractId,
      raisedById: agencyId,
      receivedById: disputeData.receivedById,
      reasonCode: disputeData.reasonCode,
      description: disputeData.description,
      status: 'OPEN',
      slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      evidenceHash: disputeData.evidence ? generateEvidenceHash(disputeData.evidence) : null
    }
  })
  
  // Update invoice status
  if (disputeData.invoiceId) {
    await db.invoice.updateMany({
      where: { id: disputeData.invoiceId },
      data: { status: 'DISPUTED' }
    })
  }
  
  // Log audit event
  await db.auditLog.create({
    data: {
      action: 'RAISE_DISPUTE',
      entityType: 'dispute',
      entityId: dispute.id,
      userId: disputeData.raisedBy,
      newValues: JSON.stringify(disputeData)
    }
  })
  
  return NextResponse.json({
    success: true,
    dispute,
    message: 'Dispute raised successfully'
  })
}

// Helper functions
function calculateInvoiceAging(invoice: any): number {
  const now = new Date()
  const periodEnd = new Date(invoice.periodEnd)
  const daysSincePeriodEnd = Math.floor((now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24))
  
  // If invoice is still within period, aging is 0
  if (now <= periodEnd) {
    return 0
  }
  
  return daysSincePeriodEnd
}

function calculateUrgency(slaDeadline: Date): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const now = new Date()
  const hoursToDeadline = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  if (hoursToDeadline < 0) return 'CRITICAL'
  if (hoursToDeadline < 24) return 'HIGH'
  if (hoursToDeadline < 72) return 'MEDIUM'
  return 'LOW'
}

function calculateTimeToResolution(dispute: any): number {
  if (dispute.status === 'RESOLVED' && dispute.resolution) {
    // Would need resolution timestamp
    return 72 // Mock value
  }
  const now = new Date()
  return Math.floor((now.getTime() - new Date(dispute.createdAt).getTime()) / (1000 * 60 * 60 * 24))
}

async function calculateAgingBuckets(agencyId: string) {
  // Mock aging calculation
  return {
    current: 150000000,
    days30: 85000000,
    days60: 45000000,
    days90: 25000000,
    days90Plus: 12000000
  }
}

async function getAgencyHistoricalData(agencyId: string) {
  // Get historical data for AI analysis
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  
  const [invoices, payments, disputes] = await Promise.all([
    db.invoice.findMany({
      where: { 
        OR: [{ issuerId: agencyId }, { counterpartyId: agencyId }],
        createdAt: { gte: ninetyDaysAgo }
      }
    }),
    db.payment.findMany({
      where: { 
        OR: [{ payerId: agencyId }, { payeeId: agencyId }],
        createdAt: { gte: ninetyDaysAgo }
      }
    }),
    db.dispute.findMany({
      where: { 
        OR: [{ raisedById: agencyId }, { receivedById: agencyId }],
        createdAt: { gte: ninetyDaysAgo }
      }
    })
  ])
  
  return { invoices, payments, disputes }
}

function generateFallbackAnalytics() {
  return {
    cashFlowForecast: [],
    paymentPatterns: [],
    disputeTrends: [],
    riskIndicators: [],
    recommendations: ['AI analytics temporarily unavailable']
  }
}

function generateInvoiceHash(invoiceData: any): string {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(JSON.stringify(invoiceData)).digest('hex')
}

function generateEvidenceHash(evidence: any): string {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(JSON.stringify(evidence)).digest('hex')
}

async function validateInvoiceData(invoiceData: any): Promise<{ valid: boolean, issues: string[] }> {
  const issues = []
  
  if (!invoiceData.invoiceId) issues.push('Invoice ID required')
  if (!invoiceData.contractId) issues.push('Contract ID required')
  if (!invoiceData.counterpartyId) issues.push('Counterparty required')
  if (!invoiceData.totalAmount || invoiceData.totalAmount <= 0) issues.push('Valid amount required')
  if (!invoiceData.periodStart || !invoiceData.periodEnd) issues.push('Period dates required')
  
  return { valid: issues.length === 0, issues }
}

async function validateDisputeData(disputeData: any): Promise<{ valid: boolean, issues: string[] }> {
  const issues = []
  
  if (!disputeData.disputeId) issues.push('Dispute ID required')
  if (!disputeData.reasonCode) issues.push('Reason code required')
  if (!disputeData.description) issues.push('Description required')
  if (!disputeData.receivedById) issues.push('Received by ID required')
  
  return { valid: issues.length === 0, issues }
}

// Additional API endpoints
async function getAgingReport(agencyId: string) {
  const agingBuckets = await calculateAgingBuckets(agencyId)
  
  return NextResponse.json({
    agencyId,
    reportDate: new Date(),
    agingBuckets,
    totalOutstanding: Object.values(agingBuckets).reduce((sum, amount) => sum + amount, 0),
    recommendations: generateAgingRecommendations(agingBuckets)
  })
}

async function getAgencyCashForecast(agencyId: string) {
  // Agency-specific cash forecast
  const forecast = await generateAgencyCashForecast(agencyId)
  
  return NextResponse.json({
    agencyId,
    forecast,
    generatedAt: new Date()
  })
}

async function getPerformanceMetrics(agencyId: string) {
  const metrics = await calculateAgencyPerformance(agencyId)
  
  return NextResponse.json({
    agencyId,
    metrics,
    period: 'LAST_90_DAYS',
    generatedAt: new Date()
  })
}

async function listAgencies() {
  const agencies = await db.party.findMany({
    where: { type: { in: ['GENERATOR', 'TRANSMISSION', 'DISTRIBUTOR', 'FUEL_SUPPLIER'] } },
    select: {
      id: true,
      partyId: true,
      name: true,
      type: true,
      isActive: true
    },
    orderBy: { name: 'asc' }
  })
  
  return NextResponse.json({ agencies })
}

// Mock helper functions
async function generateAgencyCashForecast(agencyId: string) { return [] }
async function calculateAgencyPerformance(agencyId: string) { return {} }
function generateAgingRecommendations(agingBuckets: any) { return [] }

// Additional POST handlers
async function updateInvoice(data: any) { return { success: true } }
async function resolveDispute(data: any) { return { success: true } }
async function submitEvidence(data: any) { return { success: true } }
async function approvePayment(data: any) { return { success: true } }
async function generateAgencyReports(data: any) { return { success: true, reports: [] } }