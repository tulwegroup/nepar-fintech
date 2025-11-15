import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Mock escrow accounts data
    const escrowAccounts = [
      {
        id: 'ESC-001',
        name: 'VRA-ECG Settlement Escrow',
        balance: 245000000,
        currency: 'GHS',
        status: 'active' as const,
        lastActivity: new Date().toISOString(),
        reservedAmount: 180000000,
        availableBalance: 65000000
      },
      {
        id: 'ESC-002',
        name: 'GNPC-VRA Fuel Escrow',
        balance: 520000000,
        currency: 'GHS',
        status: 'active' as const,
        lastActivity: new Date().toISOString(),
        reservedAmount: 380000000,
        availableBalance: 140000000
      },
      {
        id: 'ESC-003',
        name: 'IPP-ECG Power Escrow',
        balance: 180000000,
        currency: 'GHS',
        status: 'active' as const,
        lastActivity: new Date().toISOString(),
        reservedAmount: 120000000,
        availableBalance: 60000000
      },
      {
        id: 'ESC-004',
        name: 'BOST-ECG Supply Escrow',
        balance: 95000000,
        currency: 'GHS',
        status: 'active' as const,
        lastActivity: new Date().toISOString(),
        reservedAmount: 45000000,
        availableBalance: 50000000
      }
    ]

    return NextResponse.json(escrowAccounts)
  } catch (error) {
    console.error('Error fetching escrow accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch escrow accounts' }, { status: 500 })
  }
}