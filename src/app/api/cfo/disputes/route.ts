import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agency = searchParams.get('agency')

    // Get all disputes
    const disputes = await db.dispute.findMany({
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
    const filteredDisputes = agency && agency !== 'all'
      ? disputes.filter(dispute =>
          dispute.invoice.issuer.name === agency || dispute.invoice.counterparty.name === agency
        )
      : disputes

    // Transform into dispute items
    const disputeItems = filteredDisputes.map(dispute => {
      const priority = dispute.amountGhs > 100000000 ? 'high' : 
                     dispute.amountGhs > 50000000 ? 'medium' : 'low'

      return {
        id: dispute.id,
        invoiceId: dispute.invoiceId,
        type: dispute.type as 'quantity' | 'price' | 'quality' | 'delivery' | 'other',
        description: dispute.description,
        amount: dispute.amountGhs,
        currency: 'GHS',
        status: dispute.status as 'open' | 'investigating' | 'resolved' | 'escalated',
        createdDate: dispute.createdAt,
        resolutionDate: dispute.resolvedAt,
        assignedTo: 'CFO Office', // Mock assignment
        priority: priority as 'low' | 'medium' | 'high'
      }
    })

    return NextResponse.json(disputeItems)
  } catch (error) {
    console.error('Error fetching disputes:', error)
    return NextResponse.json({ error: 'Failed to fetch disputes' }, { status: 500 })
  }
}