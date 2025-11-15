import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agency = searchParams.get('agency')

    const invoices = await db.invoice.findMany({
      include: {
        issuer: true,
        counterparty: true,
        contract: true,
        payments: true
      }
    })

    // Filter by agency if specified
    const filteredInvoices = agency && agency !== 'all' 
      ? invoices.filter(invoice => 
          invoice.issuer.name === agency || invoice.counterparty.name === agency
        )
      : invoices

    // Calculate aging for each invoice
    const agingReport = filteredInvoices.map(invoice => {
      const outstandingAmount = invoice.amountGhs - invoice.payments.reduce((sum, payment) => sum + payment.amountGhs, 0)
      const issueDate = new Date(invoice.issueDate)
      const dueDate = new Date(invoice.dueDate)
      const today = new Date()
      const daysOutstanding = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      
      let agingBucket: '0-30' | '31-60' | '61-90' | '90+' = '0-30'
      if (daysOutstanding > 90) agingBucket = '90+'
      else if (daysOutstanding > 60) agingBucket = '61-90'
      else if (daysOutstanding > 30) agingBucket = '31-60'
      
      let status: 'current' | 'overdue' | 'disputed' | 'paid' = 'current'
      if (outstandingAmount === 0) status = 'paid'
      else if (daysOutstanding > 0) status = 'overdue'

      return {
        id: `aging-${invoice.id}`,
        invoiceId: invoice.id,
        contractId: invoice.contractId,
        counterparty: invoice.counterparty.name,
        amount: outstandingAmount,
        currency: 'GHS',
        agingBucket,
        dueDate: invoice.dueDate,
        issueDate: invoice.issueDate,
        status,
        daysOutstanding: Math.max(0, daysOutstanding)
      }
    }).filter(item => item.amount > 0) // Only show outstanding invoices

    return NextResponse.json(agingReport)
  } catch (error) {
    console.error('Error fetching aging report:', error)
    return NextResponse.json({ error: 'Failed to fetch aging report' }, { status: 500 })
  }
}