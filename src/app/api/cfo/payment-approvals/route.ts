import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agency = searchParams.get('agency')

    // Get all payments that need approval
    const payments = await db.payment.findMany({
      include: {
        invoice: {
          include: {
            issuer: true,
            counterparty: true,
            contract: true
          }
        }
      }
    })

    // Filter by agency if specified
    const filteredPayments = agency && agency !== 'all'
      ? payments.filter(payment =>
          payment.invoice.issuer.name === agency || payment.invoice.counterparty.name === agency
        )
      : payments

    // Transform into payment approval items
    const paymentApprovals = filteredPayments.map(payment => {
      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
      if (payment.amountGhs > 500000000) priority = 'urgent'
      else if (payment.amountGhs > 200000000) priority = 'high'
      else if (payment.amountGhs > 50000000) priority = 'medium'
      else priority = 'low'

      const submittedDate = new Date(payment.invoice.issueDate)
      const scheduledDate = new Date(submittedDate.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days later

      return {
        id: `approval-${payment.id}`,
        invoiceId: payment.invoiceId,
        amount: payment.amountGhs,
        currency: 'GHS',
        payer: payment.invoice.counterparty.name,
        receiver: payment.invoice.issuer.name,
        submittedDate: submittedDate.toISOString(),
        scheduledDate: scheduledDate.toISOString(),
        priority,
        status: 'pending' as const,
        verificationScore: Math.floor(Math.random() * 20) + 80,
        supportingDocs: Math.floor(Math.random() * 5) + 1
      }
    })

    return NextResponse.json(paymentApprovals)
  } catch (error) {
    console.error('Error fetching payment approvals:', error)
    return NextResponse.json({ error: 'Failed to fetch payment approvals' }, { status: 500 })
  }
}