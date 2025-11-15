import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface ReconciliationRule {
  type: 'TIME_WINDOW' | 'TOLERANCE_BAND' | 'CONTRACT_TERMS'
  value: number
  unit: 'DAYS' | 'PERCENTAGE' | 'FIXED'
}

interface ReconciliationResult {
  matched: Array<{
    invoiceId: string
    deliveryIds: string[]
    confidenceScore: number
    matchedAmount: number
    variance: number
  }>
  exceptions: Array<{
    invoiceId: string
    reason: string
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
    recommendation: string
  }>
  summary: {
    totalInvoices: number
    matchedInvoices: number
    exceptionalInvoices: number
    matchRate: number
    totalMatchedAmount: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const { periodStart, periodEnd, rules } = await request.json()
    
    // Get all invoices in the period
    const invoices = await db.invoice.findMany({
      where: {
        periodStart: { gte: new Date(periodStart) },
        periodEnd: { lte: new Date(periodEnd) },
        status: { in: ['PENDING', 'PARTIALLY_MATCHED'] }
      },
      include: {
        contract: true,
        issuer: true,
        counterparty: true
      }
    })
    
    // Get all deliveries in the period
    const deliveries = await db.delivery.findMany({
      where: {
        timestamp: { 
          gte: new Date(periodStart), 
          lte: new Date(periodEnd) 
        }
      },
      include: {
        contract: true
      }
    })
    
    // Perform reconciliation logic
    const result = await performReconciliation(invoices, deliveries, rules || getDefaultRules())
    
    // Update invoice statuses based on results
    await updateInvoiceStatuses(result.matched, result.exceptions)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error running reconciliation:', error)
    return NextResponse.json({ error: 'Failed to run reconciliation' }, { status: 500 })
  }
}

function getDefaultRules(): ReconciliationRule[] {
  return [
    { type: 'TIME_WINDOW', value: 7, unit: 'DAYS' },
    { type: 'TOLERANCE_BAND', value: 5, unit: 'PERCENTAGE' },
    { type: 'CONTRACT_TERMS', value: 1, unit: 'FIXED' }
  ]
}

async function performReconciliation(
  invoices: any[], 
  deliveries: any[], 
  rules: ReconciliationRule[]
): Promise<ReconciliationResult> {
  const matched: ReconciliationResult['matched'] = []
  const exceptions: ReconciliationResult['exceptions'] = []
  
  for (const invoice of invoices) {
    // Find deliveries for the same contract within time window
    const timeWindowRule = rules.find(r => r.type === 'TIME_WINDOW')
    const toleranceRule = rules.find(r => r.type === 'TOLERANCE_BAND')
    
    const timeWindowMs = timeWindowRule ? timeWindowRule.value * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    const tolerancePercent = toleranceRule ? toleranceRule.value : 5
    
    const matchingDeliveries = deliveries.filter(delivery => {
      if (delivery.contractId !== invoice.contractId) return false
      
      const deliveryTime = new Date(delivery.timestamp).getTime()
      const invoiceStart = new Date(invoice.periodStart).getTime()
      const invoiceEnd = new Date(invoice.periodEnd).getTime()
      
      return deliveryTime >= (invoiceStart - timeWindowMs) && 
             deliveryTime <= (invoiceEnd + timeWindowMs)
    })
    
    if (matchingDeliveries.length === 0) {
      exceptions.push({
        invoiceId: invoice.invoiceId,
        reason: 'NO_MATCHING_DELIVERIES',
        severity: 'HIGH',
        recommendation: 'Verify delivery data or invoice period'
      })
      continue
    }
    
    // Calculate total delivered quantity
    const totalDelivered = matchingDeliveries.reduce((sum, d) => sum + d.quantity, 0)
    
    // Parse invoice line items to get expected quantity
    let expectedQuantity = 0
    try {
      const lineItems = JSON.parse(invoice.lineItems)
      expectedQuantity = lineItems.energy || lineItems.gas || lineItems.fuel || 0
    } catch (e) {
      console.error('Error parsing line items:', e)
    }
    
    // Calculate variance
    const variance = expectedQuantity > 0 ? 
      Math.abs((totalDelivered - expectedQuantity) / expectedQuantity * 100) : 100
    
    const confidenceScore = Math.max(0, 100 - variance)
    
    if (variance <= tolerancePercent) {
      matched.push({
        invoiceId: invoice.invoiceId,
        deliveryIds: matchingDeliveries.map(d => d.deliveryId),
        confidenceScore,
        matchedAmount: invoice.totalAmount,
        variance
      })
    } else {
      exceptions.push({
        invoiceId: invoice.invoiceId,
        reason: 'QUANTITY_VARIANCE',
        severity: variance > 20 ? 'HIGH' : variance > 10 ? 'MEDIUM' : 'LOW',
        recommendation: `Quantity variance of ${variance.toFixed(1)}% exceeds tolerance`
      })
    }
  }
  
  const summary = {
    totalInvoices: invoices.length,
    matchedInvoices: matched.length,
    exceptionalInvoices: exceptions.length,
    matchRate: invoices.length > 0 ? (matched.length / invoices.length * 100) : 0,
    totalMatchedAmount: matched.reduce((sum, m) => sum + m.matchedAmount, 0)
  }
  
  return { matched, exceptions, summary }
}

async function updateInvoiceStatuses(
  matched: ReconciliationResult['matched'], 
  exceptions: ReconciliationResult['exceptions']
) {
  // Update matched invoices
  for (const match of matched) {
    await db.invoice.updateMany({
      where: { invoiceId: match.invoiceId },
      data: {
        status: 'MATCHED',
        confidenceScore: match.confidenceScore,
        matchedDeliveries: JSON.stringify(match.deliveryIds)
      }
    })
  }
  
  // Update exception invoices
  for (const exception of exceptions) {
    await db.invoice.updateMany({
      where: { invoiceId: exception.invoiceId },
      data: {
        status: 'PARTIALLY_MATCHED'
      }
    })
    
    // Create dispute record for high severity exceptions
    if (exception.severity === 'HIGH') {
      const invoice = await db.invoice.findUnique({
        where: { invoiceId: exception.invoiceId }
      })
      
      if (invoice) {
        await db.dispute.create({
          data: {
            disputeId: `DSP-${Date.now()}`,
            invoiceId: invoice.id,
            contractId: invoice.contractId,
            raisedById: invoice.counterpartyId,
            receivedById: invoice.issuerId,
            reasonCode: 'QUANTITY_VARIANCE',
            description: exception.recommendation,
            slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          }
        })
      }
    }
  }
}