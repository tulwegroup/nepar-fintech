import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

interface AuditTrail {
  id: string
  timestamp: Date
  userId: string
  userName: string
  action: string
  entityType: string
  entityId: string
  oldValues: any
  newValues: any
  ipAddress: string
  userAgent: string
  sessionId: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  complianceFlags: string[]
  blockchainTxId?: string
  verified: boolean
}

interface ComplianceReport {
  id: string
  reportType: 'MONTHLY' | 'QUARTERLY' | 'ADHOC' | 'INVESTIGATION'
  period: string
  generatedBy: string
  generatedAt: Date
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'PUBLISHED'
  summary: {
    totalTransactions: number
    flaggedTransactions: number
    complianceScore: number
    riskIncidents: number
    resolvedIssues: number
    pendingIssues: number
  }
  findings: Array<{
    category: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    description: string
    recommendation: string
    evidence: string[]
    status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED'
  }>
  attachments: Array<{
    id: string
    name: string
    type: string
    hash: string
    url: string
  }>
}

interface TransparencyMetrics {
  sectorVisibility: {
    totalArrears: number
    reconciledAmount: number
    pendingDisputes: number
    settlementEfficiency: number
  }
  agencyBreakdown: Array<{
    agencyName: string
    totalInvoices: number
    matchedInvoices: number
    disputedInvoices: number
    averageSettlementTime: number
    complianceScore: number
  }>
  realTimeMetrics: {
    activeSettlements: number
    pendingApprovals: number
    blockchainTransactions: number
    systemUptime: number
    lastReconciliation: Date
  }
  donorVisibility: {
    totalFundingUtilized: number
    projectDisbursements: number
    auditCompliance: number
    transparencyScore: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()
    
    switch (action) {
      case 'LOG_AUDIT_EVENT':
        return await logAuditEvent(data)
      case 'GENERATE_COMPLIANCE_REPORT':
        return await generateComplianceReport(data)
      case 'EXPORT_AUDIT_TRAIL':
        return await exportAuditTrail(data)
      case 'VERIFY_BLOCKCHAIN_PROOF':
        return await verifyBlockchainProof(data)
      case 'CREATE_INVESTIGATION':
        return await createInvestigation(data)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Audit operation error:', error)
    return NextResponse.json({ error: 'Audit operation failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    switch (action) {
      case 'GET_AUDIT_TRAIL':
        const filters = {
          startDate: searchParams.get('startDate'),
          endDate: searchParams.get('endDate'),
          userId: searchParams.get('userId'),
          entityType: searchParams.get('entityType'),
          riskLevel: searchParams.get('riskLevel'),
          page: parseInt(searchParams.get('page') || '1'),
          limit: parseInt(searchParams.get('limit') || '50')
        }
        return await getAuditTrail(filters)
      case 'GET_COMPLIANCE_DASHBOARD':
        return await getComplianceDashboard()
      case 'GET_TRANSPARENCY_METRICS':
        return await getTransparencyMetrics()
      case 'GET_INVESTIGATIONS':
        return await getInvestigations()
      case 'GET_REGULATOR_VIEW':
        return await getRegulatorView()
      case 'GET_DONOR_VIEW':
        return await getDonorView()
      case 'GET_BLOCKCHAIN_VERIFICATION':
        const txId = searchParams.get('txId')
        return await getBlockchainVerification(txId!)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Audit query error:', error)
    return NextResponse.json({ error: 'Audit query failed' }, { status: 500 })
  }
}

async function getAuditTrail(filters: any) {
  const whereConditions: any = {}
  
  if (filters.startDate) {
    whereConditions.timestamp = { gte: new Date(filters.startDate) }
  }
  if (filters.endDate) {
    whereConditions.timestamp = { 
      ...whereConditions.timestamp,
      lte: new Date(filters.endDate) 
    }
  }
  if (filters.userId) {
    whereConditions.userId = filters.userId
  }
  if (filters.entityType) {
    whereConditions.entityType = { contains: filters.entityType }
  }
  if (filters.riskLevel) {
    // Risk level would be stored in audit log or calculated
  }
  
  const auditLogs = await db.auditLog.findMany({
    where: whereConditions,
    orderBy: { timestamp: 'desc' },
    take: filters.limit,
    skip: (filters.page - 1) * filters.limit,
    include: {
      // Include user details if needed
    }
  })
  
  // Enhance with risk assessment and compliance flags
  const enhancedLogs = await Promise.all(auditLogs.map(async (log) => {
    const riskAssessment = await assessLogRisk(log)
    const complianceFlags = await checkComplianceFlags(log)
    const blockchainVerification = await getBlockchainVerificationForLog(log)
    
    return {
      ...log,
      riskLevel: riskAssessment.level,
      riskScore: riskAssessment.score,
      complianceFlags,
      blockchainTxId: blockchainVerification.txId,
      verified: blockchainVerification.verified
    }
  }))
  
  const totalCount = await db.auditLog.count({ where: whereConditions })
  
  return NextResponse.json({
    auditTrail: enhancedLogs,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: totalCount,
      pages: Math.ceil(totalCount / filters.limit)
    },
    summary: {
      totalEntries: totalCount,
      highRiskEntries: enhancedLogs.filter(log => log.riskLevel === 'HIGH' || log.riskLevel === 'CRITICAL').length,
      complianceFlags: enhancedLogs.filter(log => log.complianceFlags.length > 0).length,
      blockchainVerified: enhancedLogs.filter(log => log.verified).length
    }
  })
}

async function getComplianceDashboard() {
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
  
  // Get compliance metrics
  const [
    totalTransactions,
    flaggedTransactions,
    resolvedIssues,
    pendingIssues,
    criticalIncidents
  ] = await Promise.all([
    db.auditLog.count({
      where: { timestamp: { gte: thirtyDaysAgo } }
    }),
    db.auditLog.count({
      where: { 
        timestamp: { gte: thirtyDaysAgo },
        action: { contains: 'FLAG' }
      }
    }),
    db.auditLog.count({
      where: { 
        timestamp: { gte: ninetyDaysAgo },
        action: { contains: 'RESOLVED' }
      }
    }),
    db.auditLog.count({
      where: { 
        timestamp: { gte: thirtyDaysAgo },
        action: { contains: 'PENDING' }
      }
    }),
    db.auditLog.count({
      where: { 
        timestamp: { gte: thirtyDaysAgo },
        action: { contains: 'CRITICAL' }
      }
    })
  ])
  
  // Calculate compliance score
  const complianceScore = totalTransactions > 0 ? 
    ((totalTransactions - flaggedTransactions) / totalTransactions * 100) : 100
  
  // Get recent compliance issues
  const recentIssues = await db.auditLog.findMany({
    where: {
      timestamp: { gte: thirtyDaysAgo },
      action: { contains: 'VIOLATION' }
    },
    orderBy: { timestamp: 'desc' },
    take: 10
  })
  
  // Get agency compliance scores
  const agencyCompliance = await calculateAgencyCompliance()
  
  return NextResponse.json({
    overview: {
      totalTransactions,
      flaggedTransactions,
      complianceScore: Math.round(complianceScore * 100) / 100,
      resolvedIssues,
      pendingIssues,
      criticalIncidents,
      averageResolutionTime: await calculateAverageResolutionTime()
    },
    trends: {
      dailyTransactions: await getDailyTransactionTrends(),
      complianceTrend: await getComplianceTrend(),
      riskTrend: await getRiskTrend()
    },
    agencyCompliance,
    recentIssues,
    alerts: await generateComplianceAlerts()
  })
}

async function getTransparencyMetrics() {
  // Calculate sector-wide transparency metrics
  const [
    totalInvoices,
    matchedInvoices,
    totalDisputes,
    settledAmount
  ] = await Promise.all([
    db.invoice.count(),
    db.invoice.count({ where: { status: 'MATCHED' } }),
    db.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
    db.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } })
  ])
  
  const totalInvoicedAmount = await db.invoice.aggregate({ _sum: { totalAmount: true } })
  const arrears = (totalInvoicedAmount._sum.totalAmount || 0) - (settledAmount._sum.amount || 0)
  
  // Agency breakdown
  const agencies = await db.party.findMany({
    where: { type: { in: ['GENERATOR', 'TRANSMISSION', 'DISTRIBUTOR', 'FUEL_SUPPLIER'] } }
  })
  
  const agencyBreakdown = await Promise.all(agencies.map(async (agency) => {
    const agencyInvoices = await db.invoice.count({
      where: { OR: [{ issuerId: agency.id }, { counterpartyId: agency.id }] }
    })
    const agencyMatched = await db.invoice.count({
      where: { 
        status: 'MATCHED',
        OR: [{ issuerId: agency.id }, { counterpartyId: agency.id }]
      }
    })
    const agencyDisputes = await db.dispute.count({
      where: { OR: [{ raisedById: agency.id }, { receivedById: agency.id }] }
    })
    
    return {
      agencyName: agency.name,
      totalInvoices: agencyInvoices,
      matchedInvoices: agencyMatched,
      disputedInvoices: agencyDisputes,
      averageSettlementTime: await calculateAgencySettlementTime(agency.id),
      complianceScore: agencyInvoices > 0 ? (agencyMatched / agencyInvoices * 100) : 100
    }
  }))
  
  // Real-time metrics
  const realTimeMetrics = {
    activeSettlements: await db.settlementBatch.count({ where: { status: 'APPROVED' } }),
    pendingApprovals: await db.settlementBatch.count({ where: { status: 'COMPUTED' } }),
    blockchainTransactions: await getBlockchainTransactionCount(),
    systemUptime: await calculateSystemUptime(),
    lastReconciliation: await getLastReconciliationTime()
  }
  
  // Donor visibility metrics
  const donorVisibility = {
    totalFundingUtilized: 450000000, // Mock data
    projectDisbursements: 320000000,
    auditCompliance: 96.5,
    transparencyScore: 94.2
  }
  
  return NextResponse.json({
    sectorVisibility: {
      totalArrears: arrears,
      reconciledAmount: settledAmount._sum.amount || 0,
      pendingDisputes: totalDisputes,
      settlementEfficiency: totalInvoices > 0 ? (matchedInvoices / totalInvoices * 100) : 0
    },
    agencyBreakdown,
    realTimeMetrics,
    donorVisibility,
    generatedAt: new Date()
  })
}

async function getRegulatorView() {
  // Specialized view for energy regulators (NRA, PURC)
  const regulatoryMetrics = {
    marketIntegrity: {
      totalMarketVolume: await calculateMarketVolume(),
      settlementCompliance: await calculateSettlementCompliance(),
      disputeResolutionRate: await calculateDisputeResolutionRate(),
      marketTransparency: 94.5
    },
    complianceMonitoring: {
      licenseCompliance: 98.2,
      tariffCompliance: 96.8,
      safetyCompliance: 99.1,
      environmentalCompliance: 97.3
    },
    consumerProtection: {
      serviceQuality: 94.7,
      complaintResolution: 92.3,
      billingAccuracy: 96.5,
      outageManagement: 91.8
    },
    financialStability: {
      sectorDebtRatio: await calculateSectorDebtRatio(),
      liquidityCoverage: 1.85,
      paymentDelinquency: 12.3,
      creditRisk: 'MODERATE'
    }
  }
  
  const regulatoryActions = await getRegulatoryActions()
  const marketAnalysis = await getMarketAnalysis()
  
  return NextResponse.json({
    metrics: regulatoryMetrics,
    actions: regulatoryActions,
    analysis: marketAnalysis,
    lastUpdated: new Date()
  })
}

async function getDonorView() {
  // Specialized read-only view for development partners
  const donorMetrics = {
    fundUtilization: {
      totalCommitted: 2500000000, // $2.5B
      totalDisbursed: 1875000000, // $1.875B
      utilizationRate: 75.0,
      impactScore: 87.3
    },
    projectImplementation: {
      activeProjects: 12,
      completedProjects: 28,
      delayedProjects: 3,
      averageImplementationTime: 18.5 // months
    },
    transparencyAccountability: {
      auditCompliance: 96.5,
      reportingTimeliness: 98.2,
      fundTrackingAccuracy: 99.1,
      beneficiarySatisfaction: 89.7
    },
    sectorImpact: {
      householdsConnected: 2850000,
      generationCapacityAdded: 1250, // MW
      transmissionLossesReduced: 3.2, // %
      renewableEnergyShare: 12.5 // %
    }
  }
  
  const donorReports = await getDonorReports()
  const impactStories = await getImpactStories()
  
  return NextResponse.json({
    metrics: donorMetrics,
    reports: donorReports,
    impactStories,
    lastUpdated: new Date(),
    nextReportingDate: getNextReportingDate()
  })
}

async function logAuditEvent(data: any) {
  const auditEvent = {
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    userId: data.userId,
    oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
    newValues: data.newValues ? JSON.stringify(data.newValues) : null,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    timestamp: new Date()
  }
  
  const auditLog = await db.auditLog.create({ data: auditEvent })
  
  // Check for immediate compliance flags
  const complianceFlags = await checkComplianceFlags(auditLog)
  
  if (complianceFlags.length > 0) {
    await createComplianceAlert(auditLog, complianceFlags)
  }
  
  return NextResponse.json({
    success: true,
    auditLogId: auditLog.id,
    complianceFlags
  })
}

async function generateComplianceReport(data: any) {
  const { reportType, period, includeRecommendations = true } = data
  
  const reportData = await gatherComplianceData(period)
  const analysis = await analyzeComplianceData(reportData)
  const recommendations = includeRecommendations ? await generateRecommendations(analysis) : []
  
  const report: ComplianceReport = {
    id: `RPT-${reportType}-${Date.now()}`,
    reportType,
    period,
    generatedBy: data.generatedBy,
    generatedAt: new Date(),
    status: 'DRAFT',
    summary: analysis.summary,
    findings: analysis.findings,
    attachments: [],
    recommendations
  }
  
  // Save report
  const savedReport = await saveComplianceReport(report)
  
  return NextResponse.json({
    success: true,
    report: savedReport,
    message: 'Compliance report generated successfully'
  })
}

// Helper functions
async function assessLogRisk(log: any): Promise<{ level: string, score: number }> {
  let riskScore = 0
  
  // Action-based risk
  const highRiskActions = ['DELETE', 'APPROVE_SETTLEMENT', 'MODIFY_CONTRACT']
  if (highRiskActions.includes(log.action)) {
    riskScore += 30
  }
  
  // Entity-based risk
  const highRiskEntities = ['SETTLEMENT_BATCH', 'CONTRACT', 'USER']
  if (highRiskEntities.includes(log.entityType)) {
    riskScore += 20
  }
  
  // Time-based risk (off-hours)
  const hour = new Date(log.timestamp).getHours()
  if (hour < 6 || hour > 22) {
    riskScore += 15
  }
  
  let level = 'LOW'
  if (riskScore > 60) level = 'CRITICAL'
  else if (riskScore > 40) level = 'HIGH'
  else if (riskScore > 20) level = 'MEDIUM'
  
  return { level, score: riskScore }
}

async function checkComplianceFlags(log: any): Promise<string[]> {
  const flags = []
  
  // Check for segregation of duties violations
  if (log.action === 'APPROVE' && log.action.includes('CREATE')) {
    flags.push('SEGREGATION_OF_DUTIES_VIOLATION')
  }
  
  // Check for authorization issues
  if (log.action.includes('MODIFY') && !log.entityId.includes('AUDIT')) {
    flags.push('AUTHORIZATION_REQUIRED')
  }
  
  // Check for data privacy
  if (log.newValues && log.newValues.includes('personal')) {
    flags.push('DATA_PRIVACY_REVIEW')
  }
  
  return flags
}

async function getBlockchainVerification(txId: string) {
  // Mock blockchain verification
  return {
    txId,
    verified: Math.random() > 0.1, // 90% verification rate
    blockNumber: Math.floor(Math.random() * 10000) + 1000,
    timestamp: new Date(),
    merkleProof: '0x' + createHash('sha256').update(txId).digest('hex')
  }
}

// Additional helper functions (mock implementations)
async function calculateAgencyCompliance() { return [] }
async function getDailyTransactionTrends() { return [] }
async function getComplianceTrend() { return [] }
async function getRiskTrend() { return [] }
async function generateComplianceAlerts() { return [] }
async function calculateMarketVolume() { return 5000000000 }
async function calculateSettlementCompliance() { return 95.2 }
async function calculateDisputeResolutionRate() { return 87.5 }
async function calculateSectorDebtRatio() { return 0.65 }
async function getRegulatoryActions() { return [] }
async function getMarketAnalysis() { return [] }
async function getDonorReports() { return [] }
async function getImpactStories() { return [] }
async function getNextReportingDate() { return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
async function calculateAverageResolutionTime() { return 3.5 }
async function getBlockchainTransactionCount() { return 1247 }
async function calculateSystemUptime() { return 99.95 }
async function getLastReconciliationTime() { return new Date() }
async function calculateAgencySettlementTime(agencyId: string) { return 2.8 }
async function gatherComplianceData(period: string) { return {} }
async function analyzeComplianceData(data: any) { return { summary: {}, findings: [] } }
async function generateRecommendations(analysis: any) { return [] }
async function saveComplianceReport(report: ComplianceReport) { return report }
async function createComplianceAlert(log: any, flags: string[]) {}
async function getBlockchainVerificationForLog(log: any) { return { txId: '', verified: true } }
async function exportAuditTrail(data: any) { return { success: true, url: '' } }
async function verifyBlockchainProof(data: any) { return { valid: true } }
async function createInvestigation(data: any) { return { success: true, investigationId: '' } }
async function getInvestigations() { return [] }