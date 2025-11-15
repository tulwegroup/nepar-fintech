import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

export async function GET() {
  try {
    const invoices = await db.invoice.findMany({
      include: {
        contract: true,
        issuer: { select: { name: true, type: true } },
        counterparty: { select: { name: true, type: true } },
        payments: true,
        disputes: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Create content hash for integrity
    const contentHash = createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
    
    const invoice = await db.invoice.create({
      data: {
        invoiceId: data.invoiceId,
        contractId: data.contractId,
        issuerId: data.issuerId,
        counterpartyId: data.counterpartyId,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        currency: data.currency || 'GHS',
        totalAmount: data.totalAmount,
        taxAmount: data.taxAmount,
        lineItems: JSON.stringify(data.lineItems || {}),
        hash: contentHash,
      }
    })
    
    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}