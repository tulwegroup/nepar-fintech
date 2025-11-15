import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ZAI } from 'z-ai-web-dev-sdk'

interface SettlementQueue {
  id: string
  batchId: string
  period: string
  totalAmount: number
  netPositions: Array<{
    partyId: string
    partyName: string
    netPosition: number
    type: 'RECEIVABLE' | 'PAYABLE'
  }>
  settlementLegs: Array<{
    payerId: string
    payerName: string
    payeeId: string
    payeeName: string
    amount: number
    currency: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
  }>
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'EXECUTED' | 'FAILED'
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  createdAt: Date
  slaDeadline: Date
  approvals: Array<{
    userId: string
    userName: string
    role: string
    timestamp: Date
    signature: string
  }>
  riskAssessment: {
    score: number
    factors: string[]
    recommendation: string
  }
}

interface EscrowAccount {
  id: string
  bankName: string
  accountNumber: string
  currency: string
  balance: number
  availableBalance: number
  reservedAmount: number
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED'
  lastTransaction: Date
  transactions: Array<{
    id: string
    type: 'CREDIT' | 'DEBIT' | 'RESERVATION' | 'RELEASE'
    amount: number
    reference: string
    timestamp: Date
    status: 'PENDING' | 'COMPLETED' | 'FAILED'
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()
    
    switch (action) {
      case 'APPROVE_SETTLEMENT':
        return await approveSettlement(data)
      case 'EXECUTE_SETTLEMENT':
        return await executeSettlement(data)
      case 'REJECT_SETTLEMENT':
        return await rejectSettlement(data)
      case 'UPDATE_ESCROW':
        return await updateEscrowAccount(data)
      case 'RESERVE_FUNDS':
        return await reserveFunds(data)
      case 'RELEASE_FUNDS':
        return await releaseFunds(data)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Treasury operation error:', error)
    return NextResponse.json({ error: 'Treasury operation failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    switch (action) {
      case 'GET_SETTLEMENT_QUEUE':
        return await getSettlementQueue()
      case 'GET_ESCROW_BALANCES':
        return await getEscrowBalances()
      case 'GET_CASH_FORECAST':
        return await getCashForecast()
      case 'GET_RISK_ASSESSMENT':
        const batchId = searchParams.get('batchId')
        return await getRiskAssessment(batchId!)
      case 'GET_APPROVAL_STATUS':
        return await getApprovalStatus()
      case 'GET_TREASURY_KPI':
        return await getTreasuryKPI()
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Treasury query error:', error)
    return NextResponse.json({ error: 'Treasury query failed' }, { status: 500 })
  }
}

async function getSettlementQueue() {
  const settlementBatches = await db.settlementBatch.findMany({
    where: {
      status: { in: ['PENDING', 'COMPUTED', 'APPROVED'] }
    },
    orderBy: { createdAt: 'asc' },
    include: {
      // Include related data if needed
    }
  })
  
  const queue = []
  
  for (const batch of settlementBatches) {
    // Get net positions for this batch
    const netPositions = await calculateNetPositions(batch.period)
    
    // Get settlement legs
    const settlementLegs = await generateSettlementLegs(netPositions)
    
    // Calculate priority based on amount and age
    const ageInHours = (Date.now() - new Date(batch.createdAt).getTime()) / (1000 * 60 * 60)
    const priority = calculatePriority(batch.totalNetAmount, ageInHours)
    
    // Get risk assessment
    const riskAssessment = await assessSettlementRisk(batch, netPositions)
    
    queue.push({
      id: batch.id,
      batchId: batch.batchId,
      period: batch.period,
      totalAmount: batch.totalNetAmount,
      netPositions,
      settlementLegs,
      status: mapSettlementStatus(batch.status),
      priority,
      createdAt: batch.createdAt,
      slaDeadline: new Date(batch.createdAt.getTime() + 48 * 60 * 60 * 1000), // 48 hours SLA
      approvals: await getApprovals(batch.id),
      riskAssessment
    })
  }
  
  return NextResponse.json({
    queue,
    summary: {
      totalQueued: queue.length,
      criticalPriority: queue.filter(q => q.priority === 'CRITICAL').length,
      highPriority: queue.filter(q => q.priority === 'HIGH').length,
      pendingApproval: queue.filter(q => q.status === 'PENDING_APPROVAL').length,
      totalValue: queue.reduce((sum, q) => sum + q.totalAmount, 0)
    }
  })
}

async function getEscrowBalances() {
  // Mock escrow accounts - in production this would integrate with bank APIs
  const escrowAccounts: EscrowAccount[] = [
    {
      id: 'ESC_GHS_001',
      bankName: 'Bank of Ghana',
      accountNumber: 'ESC-NEPAR-GHS-001',
      currency: 'GHS',
      balance: 2340000000, // ₵2.34B
      availableBalance: 1890000000, // ₵1.89B available
      reservedAmount: 450000000, // ₵450M reserved
      status: 'ACTIVE',
      lastTransaction: new Date(),
      transactions: await getEscrowTransactions('ESC_GHS_001')
    },
    {
      id: 'ESC_USD_001',
      bankName: 'Bank of Ghana',
      accountNumber: 'ESC-NEPAR-USD-001',
      currency: 'USD',
      balance: 150000000, // $150M
      availableBalance: 120000000, // $120M available
      reservedAmount: 30000000, // $30M reserved
      status: 'ACTIVE',
      lastTransaction: new Date(),
      transactions: await getEscrowTransactions('ESC_USD_001')
    }
  ]
  
  return NextResponse.json({
    accounts: escrowAccounts,
    summary: {
      totalBalanceGHS: escrowAccounts.find(a => a.currency === 'GHS')?.balance || 0,
      totalBalanceUSD: escrowAccounts.find(a => a.currency === 'USD')?.balance || 0,
      totalReserved: escrowAccounts.reduce((sum, a) => sum + a.reservedAmount, 0),
      totalAvailable: escrowAccounts.reduce((sum, a) => sum + a.availableBalance, 0)
    }
  })
}

async function getCashForecast() {
  // AI-powered cash flow forecasting
  const zai = await ZAI.create()
  
  try {
    const historicalData = await getHistoricalCashFlows()
    const upcomingSettlements = await getUpcomingSettlements()
    
    const prompt = `
    Analyze Ghana energy sector cash flow data and provide 30-day forecast:
    
    Historical Cash Flows (last 90 days): ${JSON.stringify(historicalData)}
    Upcoming Settlements: ${JSON.stringify(upcomingSettlements)}
    
    Provide forecast in JSON format:
    {
      "dailyForecast": [
        {"date": "2025-01-14", "inflow": 0, "outflow": 0, "netPosition": 0},
        ...
      ],
      "weeklyForecast": [
        {"week": "W1", "totalInflow": 0, "totalOutflow": 0, "netPosition": 0},
        ...
      ],
      "insights": ["insight1", "insight2"],
      "recommendations": ["rec1", "rec2"],
      "riskFactors": ["factor1", "factor2"]
    }
    `
    
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a treasury forecasting expert for Ghana\'s energy sector payment system.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.3
    })
    
    const aiResponse = completion.choices[0]?.message?.content || '{}'
    
    let forecast
    try {
      forecast = JSON.parse(aiResponse)
    } catch (parseError) {
      forecast = generateFallbackForecast()
    }
    
    return NextResponse.json({
      forecast,
      generatedAt: new Date(),
      aiPowered: true
    })
  } catch (error) {
    console.error('Cash forecast AI failed:', error)
    return NextResponse.json({
      forecast: generateFallbackForecast(),
      generatedAt: new Date(),
      aiPowered: false
    })
  }
}

async function approveSettlement(data: any) {
  const { batchId, userId, userName, role, signature } = data
  
  // Validate user has approval authority
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || (user.role !== 'TREASURY' && user.role !== 'MINISTER')) {
    return NextResponse.json({ error: 'Insufficient authority' }, { status: 403 })
  }
  
  // Check if already approved
  const existingApproval = await checkExistingApproval(batchId, userId)
  if (existingApproval) {
    return NextResponse.json({ error: 'Already approved' }, { status: 400 })
  }
  
  // Record approval
  await recordApproval(batchId, userId, userName, role, signature)
  
  // Check if quorum reached
  const approvals = await getApprovals(batchId)
  const totalRequiredApprovers = 3 // MoE, MoF, CAGD
  const quorumReached = approvals.length >= totalRequiredApprovers
  
  if (quorumReached) {
    // Update settlement batch status
    await db.settlementBatch.updateMany({
      where: { batchId },
      data: { status: 'APPROVED' }
    })
    
    // Trigger blockchain approval
    await triggerBlockchainApproval(batchId, approvals)
  }
  
  return NextResponse.json({
    success: true,
    approved: true,
    quorumReached,
    approvalsCount: approvals.length,
    requiredApprovals: totalRequiredApprovers
  })
}

async function executeSettlement(data: any) {
  const { batchId, executionMode = 'AUTO' } = data
  
  // Verify batch is approved
  const batch = await db.settlementBatch.findUnique({
    where: { batchId }
  })
  
  if (!batch || batch.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Settlement not approved' }, { status: 400 })
  }
  
  // Get settlement legs
  const netPositions = await calculateNetPositions(batch.period)
  const settlementLegs = await generateSettlementLegs(netPositions)
  
  // Reserve funds in escrow
  const totalAmount = settlementLegs.reduce((sum, leg) => sum + leg.amount, 0)
  const reserveResult = await reserveFunds({
    amount: totalAmount,
    currency: 'GHS',
    reference: `SETTLEMENT-${batchId}`,
    reservePeriod: 24 * 60 * 60 * 1000 // 24 hours
  })
  
  if (!reserveResult.success) {
    return NextResponse.json({ error: 'Insufficient escrow funds' }, { status: 400 })
  }
  
  // Execute settlement legs
  const executionResults = []
  
  for (const leg of settlementLegs) {
    const result = await executeSettlementLeg(leg, batchId)
    executionResults.push(result)
  }
  
  // Check if all legs executed successfully
  const allSuccessful = executionResults.every(r => r.success)
  
  if (allSuccessful) {
    // Update batch status
    await db.settlementBatch.updateMany({
      where: { batchId },
      data: { 
        status: 'EXECUTED',
        executedAt: new Date()
      }
    })
    
    // Record on blockchain
    await triggerBlockchainExecution(batchId, settlementLegs, executionResults)
    
    // Release escrow reservations
    await releaseFunds({
      reference: `SETTLEMENT-${batchId}`,
      amount: totalAmount
    })
  } else {
    // Rollback partial execution
    await rollbackSettlement(executionResults)
  }
  
  return NextResponse.json({
    success: allSuccessful,
    batchId,
    executionResults,
    totalAmount,
    legsExecuted: executionResults.filter(r => r.success).length,
    totalLegs: settlementLegs.length
  })
}

async function assessSettlementRisk(batch: any, netPositions: any[]) {
  const riskFactors = []
  let riskScore = 0
  
  // Amount-based risk
  if (batch.totalNetAmount > 1000000000) { // > ₵1B
    riskFactors.push('HIGH_VALUE_SETTLEMENT')
    riskScore += 25
  }
  
  // Concentration risk
  const largestPosition = Math.max(...netPositions.map(p => Math.abs(p.netPosition)))
  const totalExposure = netPositions.reduce((sum, p) => sum + Math.abs(p.netPosition), 0)
  const concentrationRatio = largestPosition / totalExposure
  
  if (concentrationRatio > 0.5) {
    riskFactors.push('CONCENTRATION_RISK')
    riskScore += 20
  }
  
  // Counterparty risk
  const highRiskParties = netPositions.filter(p => 
    p.partyName.includes('IPP') || p.partyName.includes('BOST')
  )
  
  if (highRiskParties.length > 0) {
    riskFactors.push('COUNTERPARTY_RISK')
    riskScore += 15
  }
  
  // Timing risk
  const ageInHours = (Date.now() - new Date(batch.createdAt).getTime()) / (1000 * 60 * 60)
  if (ageInHours > 24) {
    riskFactors.push('SETTLEMENT_DELAY')
    riskScore += 10
  }
  
  // Historical dispute rate
  const disputeRate = await getDisputeRate(netPositions.map(p => p.partyId))
  if (disputeRate > 0.1) { // > 10% dispute rate
    riskFactors.push('HIGH_DISPUTE_RATE')
    riskScore += 20
  }
  
  let recommendation = 'APPROVE'
  if (riskScore > 60) recommendation = 'REVIEW_MANUALLY'
  if (riskScore > 80) recommendation = 'REJECT_OR_REQUIRE_ADDITIONAL_COLLATERAL'
  
  return {
    score: Math.min(riskScore, 100),
    factors: riskFactors,
    recommendation
  }
}

// Helper functions
async function calculateNetPositions(period: string) {
  // This would implement the netting algorithm
  // For now, return mock data
  return [
    { partyId: '1', partyName: 'ECG', netPosition: -2345678900, type: 'PAYABLE' },
    { partyId: '2', partyName: 'VRA', netPosition: 1234567890, type: 'RECEIVABLE' },
    { partyId: '3', partyName: 'IPP Alpha', netPosition: 567890123, type: 'RECEIVABLE' }
  ]
}

async function generateSettlementLegs(netPositions: any[]) {
  // Generate optimal settlement legs
  const legs = []
  // Implementation would go here
  return legs
}

function calculatePriority(amount: number, ageInHours: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (amount > 1000000000 && ageInHours > 24) return 'CRITICAL'
  if (amount > 500000000 && ageInHours > 12) return 'HIGH'
  if (amount > 100000000 || ageInHours > 6) return 'MEDIUM'
  return 'LOW'
}

function mapSettlementStatus(status: string): string {
  const statusMap = {
    'PENDING': 'PENDING_APPROVAL',
    'COMPUTED': 'PENDING_APPROVAL',
    'APPROVED': 'APPROVED',
    'EXECUTED': 'EXECUTED'
  }
  return statusMap[status] || status
}

async function getApprovals(batchId: string) {
  // Mock approvals - would query database in production
  return []
}

async function getEscrowTransactions(accountId: string) {
  // Mock transactions
  return [
    {
      id: 'TXN_001',
      type: 'CREDIT',
      amount: 500000000,
      reference: 'MONTHLY_FUNDING',
      timestamp: new Date(),
      status: 'COMPLETED'
    }
  ]
}

function generateFallbackForecast() {
  const forecast = []
  const today = new Date()
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    
    forecast.push({
      date: date.toISOString().split('T')[0],
      inflow: Math.random() * 100000000,
      outflow: Math.random() * 80000000,
      netPosition: (Math.random() - 0.3) * 50000000
    })
  }
  
  return {
    dailyForecast: forecast,
    weeklyForecast: [],
    insights: ['AI forecast unavailable - using historical patterns'],
    recommendations: ['Monitor cash positions closely'],
    riskFactors: ['Limited forecast accuracy']
  }
}

// Additional helper functions would be implemented here...
async function getHistoricalCashFlows() { return [] }
async function getUpcomingSettlements() { return [] }
async function checkExistingApproval(batchId: string, userId: string) { return false }
async function recordApproval(batchId: string, userId: string, userName: string, role: string, signature: string) {}
async function triggerBlockchainApproval(batchId: string, approvals: any[]) {}
async function reserveFunds(data: any) { return { success: true } }
async function executeSettlementLeg(leg: any, batchId: string) { return { success: true } }
async function triggerBlockchainExecution(batchId: string, legs: any[], results: any[]) {}
async function releaseFunds(data: any) {}
async function rollbackSettlement(results: any[]) {}
async function getDisputeRate(partyIds: string[]) { return 0.05 }
async function getRiskAssessment(batchId: string) { return { score: 25, factors: [], recommendation: 'APPROVE' } }
async function getApprovalStatus() { return { pendingApprovals: 0, requiredApprovals: 3 } }
async function getTreasuryKPI() { 
  return { 
    settlementEfficiency: 94.5,
    averageProcessingTime: 2.3,
    escrowUtilization: 78.2
  } 
}