import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Generate mock blockchain transactions
    const blockchainTransactions = [
      {
        id: 'tx-001',
        hash: '0x1234567890abcdef1234567890abcdef12345678',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
        type: 'payment' as const,
        from: '0xabcdef1234567890abcdef1234567890abcdef12',
        to: '0x567890abcdef1234567890abcdef1234567890ab',
        amount: 58000000,
        currency: 'GHS',
        status: 'confirmed' as const,
        blockNumber: 12456789,
        gasUsed: 21000,
        confirmations: 1247
      },
      {
        id: 'tx-002',
        hash: '0x2345678901bcdef2345678901bcdef2345678901',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
        type: 'settlement' as const,
        from: '0xbcdef1234567890abcdef1234567890abcdef1234',
        to: '0x678901bcdef2345678901bcdef2345678901bcde',
        amount: 245000000,
        currency: 'GHS',
        status: 'confirmed' as const,
        blockNumber: 12456788,
        gasUsed: 45000,
        confirmations: 1246
      },
      {
        id: 'tx-003',
        hash: '0x3456789012cdef3456789012cdef3456789012cd',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        type: 'contract' as const,
        from: '0xcdef1234567890abcdef1234567890abcdef1234',
        to: '0x789012cdef3456789012cdef3456789012cdef34',
        amount: 180000000,
        currency: 'GHS',
        status: 'confirmed' as const,
        blockNumber: 12456787,
        gasUsed: 67000,
        confirmations: 1245
      },
      {
        id: 'tx-004',
        hash: '0x4567890123def4567890123def4567890123def4',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
        type: 'dispute' as const,
        from: '0xdef1234567890abcdef1234567890abcdef12345',
        to: '0x890123def4567890123def4567890123def4567',
        amount: 75000000,
        currency: 'GHS',
        status: 'pending' as const,
        blockNumber: 12456786,
        gasUsed: 89000,
        confirmations: 1244
      },
      {
        id: 'tx-005',
        hash: '0x5678901234ef5678901234ef5678901234ef5678',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        type: 'audit' as const,
        from: '0xef1234567890abcdef1234567890abcdef123456',
        to: '0x901234ef5678901234ef5678901234ef5678901',
        amount: 95000000,
        currency: 'GHS',
        status: 'confirmed' as const,
        blockNumber: 12456785,
        gasUsed: 34000,
        confirmations: 1243
      },
      {
        id: 'tx-006',
        hash: '0x6789012345f6789012345f6789012345f6789012',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        type: 'payment' as const,
        from: '0xf1234567890abcdef1234567890abcdef1234567',
        to: '0x012345f6789012345f6789012345f6789012345f',
        amount: 32000000,
        currency: 'GHS',
        status: 'confirmed' as const,
        blockNumber: 12456784,
        gasUsed: 21000,
        confirmations: 1242
      },
      {
        id: 'tx-007',
        hash: '0x7890123456g7890123456g7890123456g7890123',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
        type: 'settlement' as const,
        from: '0x123456f6789012345f6789012345f67890123456',
        to: '0x123456g7890123456g7890123456g7890123456g',
        amount: 520000000,
        currency: 'GHS',
        status: 'confirmed' as const,
        blockNumber: 12456783,
        gasUsed: 45000,
        confirmations: 1241
      },
      {
        id: 'tx-008',
        hash: '0x8901234567h8901234567h8901234567h8901234',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
        type: 'contract' as const,
        from: '0x234567g7890123456g7890123456g78901234567',
        to: '0x234567h8901234567h8901234567h8901234567h',
        amount: 150000000,
        currency: 'GHS',
        status: 'failed' as const,
        blockNumber: 12456782,
        gasUsed: 67000,
        confirmations: 1240
      }
    ]

    return NextResponse.json(blockchainTransactions)
  } catch (error) {
    console.error('Error fetching blockchain transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch blockchain transactions' }, { status: 500 })
  }
}