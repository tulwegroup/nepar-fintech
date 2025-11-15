import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const parties = await db.party.findMany({
      orderBy: { name: 'asc' }
    })
    
    return NextResponse.json(parties)
  } catch (error) {
    console.error('Error fetching parties:', error)
    return NextResponse.json({ error: 'Failed to fetch parties' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const party = await db.party.create({
      data: {
        partyId: data.partyId,
        name: data.name,
        type: data.type,
        bankDetails: data.bankDetails,
        taxId: data.taxId,
      }
    })
    
    return NextResponse.json(party, { status: 201 })
  } catch (error) {
    console.error('Error creating party:', error)
    return NextResponse.json({ error: 'Failed to create party' }, { status: 500 })
  }
}