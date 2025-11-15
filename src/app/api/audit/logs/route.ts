import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Generate mock audit logs
    const auditLogs = [
      {
        id: 'audit-001',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
        userId: 'user-001',
        userName: 'John Doe',
        action: 'Payment Approved',
        resource: 'Invoice I000001',
        resourceId: 'inv-001',
        details: 'Payment of ₵58,000,000 approved for VRA-ECG settlement',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        severity: 'medium' as const,
        category: 'user_action' as const,
        status: 'success' as const,
        blockchainHash: '0x1234567890abcdef'
      },
      {
        id: 'audit-002',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
        userId: 'system-001',
        userName: 'System',
        action: 'Automated Reconciliation',
        resource: 'Contract PPA-VRA-ECG-01',
        resourceId: 'contract-001',
        details: 'AI-powered reconciliation completed with 100% match rate',
        ipAddress: '127.0.0.1',
        userAgent: 'NEPAR-System/1.0',
        severity: 'low' as const,
        category: 'system_event' as const,
        status: 'success' as const,
        blockchainHash: '0xabcdef1234567890'
      },
      {
        id: 'audit-003',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        userId: 'user-002',
        userName: 'Jane Smith',
        action: 'Dispute Created',
        resource: 'Invoice I000003',
        resourceId: 'inv-003',
        details: 'Quantity discrepancy dispute created for 15% variance',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        severity: 'high' as const,
        category: 'user_action' as const,
        status: 'success' as const,
        blockchainHash: '0x567890abcdef1234'
      },
      {
        id: 'audit-004',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        userId: 'security-001',
        userName: 'Security System',
        action: 'Failed Login Attempt',
        resource: 'User Authentication',
        resourceId: 'auth-001',
        details: 'Multiple failed login attempts detected for user admin@nepar.gov.gh',
        ipAddress: '10.0.0.50',
        userAgent: 'Unknown/1.0',
        severity: 'critical' as const,
        category: 'security' as const,
        status: 'failed' as const,
        blockchainHash: '0x9012345678abcdef'
      },
      {
        id: 'audit-005',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        userId: 'compliance-001',
        userName: 'Compliance Bot',
        action: 'AML Check Completed',
        resource: 'Payment Settlement',
        resourceId: 'payment-001',
        details: 'Anti-Money Laundering check passed for all transactions',
        ipAddress: '127.0.0.1',
        userAgent: 'Compliance-Engine/1.0',
        severity: 'low' as const,
        category: 'compliance' as const,
        status: 'success' as const,
        blockchainHash: '0x34567890abcdef12'
      },
      {
        id: 'audit-006',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
        userId: 'user-003',
        userName: 'Michael Johnson',
        action: 'Data Export',
        resource: 'Aging Report',
        resourceId: 'report-001',
        details: 'Exported aging report for ECG agency (Q3 2025)',
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        severity: 'medium' as const,
        category: 'data_access' as const,
        status: 'success' as const,
        blockchainHash: '0x7890123456abcdef'
      },
      {
        id: 'audit-007',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
        userId: 'system-002',
        userName: 'Blockchain Oracle',
        action: 'Smart Contract Executed',
        resource: 'Escrow Release',
        resourceId: 'contract-002',
        details: 'Smart contract executed for automatic escrow release',
        ipAddress: '127.0.0.1',
        userAgent: 'Blockchain-Oracle/1.0',
        severity: 'high' as const,
        category: 'system_event' as const,
        status: 'success' as const,
        blockchainHash: '0xcdef1234567890ab'
      },
      {
        id: 'audit-008',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
        userId: 'user-004',
        userName: 'Sarah Williams',
        action: 'User Role Modified',
        resource: 'User Management',
        resourceId: 'user-005',
        details: 'Granted CFO access privileges to ECG agency user',
        ipAddress: '192.168.1.103',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        severity: 'high' as const,
        category: 'security' as const,
        status: 'success' as const,
        blockchainHash: '0x234567890abcdef1'
      }
    ]

    return NextResponse.json(auditLogs)
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}