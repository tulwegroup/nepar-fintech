import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get all invoices with their payment status
    const invoices = await db.invoice.findMany({
      include: {
        issuer: true,
        counterparty: true,
        contract: true,
        payments: true
      }
    })

    // Transform into settlement queue items
    const settlementQueue = invoices.map(invoice => {
      const outstandingAmount = invoice.amountGhs - invoice.payments.reduce((sum, payment) => sum + payment.amountGhs, 0)
      
      let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
      if (outstandingAmount > 500000000) priority = 'critical'
      else if (outstandingAmount > 200000000) priority = 'high'
      else if (outstandingAmount > 50000000) priority = 'medium'
      else priority = 'low'

      let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending'
      if (outstandingAmount === 0) status = 'completed'
      else if (invoice.payments.length > 0) status = 'processing'

      const submittedAt = new Date(invoice.issueDate)
      const estimatedCompletion = new Date(submittedAt.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

      return {
        id: invoice.id,
        contractId: invoice.contractId,
        parties: {
          payer: invoice.counterparty.name,
          receiver: invoice.issuer.name
        },
        amount: outstandingAmount,
        currency: 'GHS',
        status,
        priority,
        submittedAt: submittedAt.toISOString(),
        estimatedCompletion: estimatedCompletion.toISOString(),
        verificationScore: Math.floor(Math.random() * 20) + 80 // 80-99%
      }
    })

    return NextResponse.json(settlementQueue)
  } catch (error) {
    console.error('Error fetching settlement queue:', error)
    return NextResponse.json({ error: 'Failed to fetch settlement queue' }, { status: 500 })
  }
}