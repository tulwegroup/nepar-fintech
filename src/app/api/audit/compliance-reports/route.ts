import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Generate mock compliance reports
    const complianceReports = [
      {
        id: 'comp-001',
        name: 'Q3 2025 AML Compliance Report',
        type: 'AML' as const,
        status: 'compliant' as const,
        score: 98,
        lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        nextRun: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days
        findings: 2,
        criticalFindings: 0,
        generatedBy: 'Compliance System',
        approvedBy: 'Chief Compliance Officer'
      },
      {
        id: 'comp-002',
        name: 'Monthly KYC Verification',
        type: 'KYC' as const,
        status: 'compliant' as const,
        score: 100,
        lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
        nextRun: new Date(Date.now() + 1000 * 60 * 60 * 24 * 27).toISOString(), // 27 days
        findings: 0,
        criticalFindings: 0,
        generatedBy: 'KYC Automation',
        approvedBy: 'Head of Risk'
      },
      {
        id: 'comp-003',
        name: 'Bank of Ghana Regulatory Filing',
        type: 'Regulatory' as const,
        status: 'compliant' as const,
        score: 95,
        lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
        nextRun: new Date(Date.now() + 1000 * 60 * 60 * 24 * 23).toISOString(), // 23 days
        findings: 3,
        criticalFindings: 0,
        generatedBy: 'Regulatory Affairs',
        approvedBy: 'Legal Counsel'
      },
      {
        id: 'comp-004',
        name: 'Internal Security Audit',
        type: 'Internal' as const,
        status: 'review' as const,
        score: 88,
        lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), // 14 days ago
        nextRun: new Date(Date.now() + 1000 * 60 * 60 * 24 * 16).toISOString(), // 16 days
        findings: 5,
        criticalFindings: 1,
        generatedBy: 'Internal Audit Team',
        approvedBy: null
      },
      {
        id: 'comp-005',
        name: 'External Financial Audit',
        type: 'External' as const,
        status: 'compliant' as const,
        score: 92,
        lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
        nextRun: new Date(Date.now() + 1000 * 60 * 60 * 24 * 335).toISOString(), // 335 days
        findings: 4,
        criticalFindings: 0,
        generatedBy: 'PwC Ghana',
        approvedBy: 'Audit Committee'
      },
      {
        id: 'comp-006',
        name: 'Data Privacy Compliance Check',
        type: 'Regulatory' as const,
        status: 'compliant' as const,
        score: 97,
        lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
        nextRun: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25).toISOString(), // 25 days
        findings: 1,
        criticalFindings: 0,
        generatedBy: 'Data Protection Officer',
        approvedBy: 'CTO'
      }
    ]

    return NextResponse.json(complianceReports)
  } catch (error) {
    console.error('Error fetching compliance reports:', error)
    return NextResponse.json({ error: 'Failed to fetch compliance reports' }, { status: 500 })
  }
}