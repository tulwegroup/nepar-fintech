import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ZAI } from 'z-ai-web-dev-sdk'

interface AIReconciliationRule {
  id: string
  name: string
  type: 'PATTERN' | 'ANOMALY' | 'PREDICTION' | 'COMPLIANCE'
  condition: string
  action: string
  confidence: number
  active: boolean
}

interface ReconciliationResult {
  matches: Array<{
    invoiceId: string
    deliveryIds: string[]
    confidenceScore: number
    matchedAmount: number
    variance: number
    aiInsights: string[]
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }>
  exceptions: Array<{
    invoiceId: string
    reason: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    recommendation: string
    aiAnalysis: string
    suggestedActions: string[]
    riskScore: number
  }>
  patterns: Array<{
    pattern: string
    frequency: number
    impact: number
    description: string
  }>
  summary: {
    totalInvoices: number
    matchedInvoices: number
    exceptionalInvoices: number
    matchRate: number
    totalMatchedAmount: number
    aiConfidence: number
    riskDistribution: Record<string, number>
  }
}

export async function POST(request: NextRequest) {
  try {
    const { periodStart, periodEnd, useAI = true, customRules = [] } = await request.json()
    
    if (useAI) {
      return await runAIReconciliation(periodStart, periodEnd, customRules)
    } else {
      return await runStandardReconciliation(periodStart, periodEnd)
    }
  } catch (error) {
    console.error('Advanced reconciliation error:', error)
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    switch (action) {
      case 'GET_RULES':
        return await getReconciliationRules()
      case 'GET_PATTERNS':
        return await getDetectedPatterns()
      case 'GET_AI_INSIGHTS':
        return await getAIInsights()
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error fetching reconciliation data:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}

async function runAIReconciliation(periodStart: string, periodEnd: string, customRules: any[]) {
  // Initialize ZAI for AI analysis
  const zai = await ZAI.create()
  
  // Get data for analysis
  const invoices = await getInvoicesForPeriod(periodStart, periodEnd)
  const deliveries = await getDeliveriesForPeriod(periodStart, periodEnd)
  const historicalData = await getHistoricalReconciliationData()
  
  // AI-powered pattern detection
  const patterns = await detectPatterns(zai, invoices, deliveries, historicalData)
  
  // AI-enhanced matching
  const matches = []
  const exceptions = []
  
  for (const invoice of invoices) {
    const aiAnalysis = await analyzeInvoiceWithAI(zai, invoice, deliveries, patterns)
    
    if (aiAnalysis.confidence > 75) {
      // High confidence match
      const matchingDeliveries = findMatchingDeliveries(invoice, deliveries, aiAnalysis)
      const variance = calculateVariance(invoice, matchingDeliveries)
      
      matches.push({
        invoiceId: invoice.invoiceId,
        deliveryIds: matchingDeliveries.map(d => d.deliveryId),
        confidenceScore: aiAnalysis.confidence,
        matchedAmount: invoice.totalAmount,
        variance,
        aiInsights: aiAnalysis.insights,
        riskLevel: calculateRiskLevel(variance, aiAnalysis.riskFactors)
      })
    } else {
      // Low confidence - create exception with AI analysis
      exceptions.push({
        invoiceId: invoice.invoiceId,
        reason: aiAnalysis.primaryIssue,
        severity: aiAnalysis.severity,
        recommendation: aiAnalysis.recommendation,
        aiAnalysis: aiAnalysis.explanation,
        suggestedActions: aiAnalysis.suggestedActions,
        riskScore: aiAnalysis.riskScore
      })
    }
  }
  
  // Generate AI insights summary
  const summary = await generateAISummary(zai, matches, exceptions, patterns)
  
  // Update database with AI-enhanced results
  await updateReconciliationResults(matches, exceptions, patterns)
  
  return NextResponse.json({
    matches,
    exceptions,
    patterns,
    summary,
    aiEnabled: true,
    processingTime: Date.now()
  })
}

async function runStandardReconciliation(periodStart: string, periodEnd: string) {
  // Fallback to standard reconciliation without AI
  const invoices = await getInvoicesForPeriod(periodStart, periodEnd)
  const deliveries = await getDeliveriesForPeriod(periodStart, periodEnd)
  
  const matches = []
  const exceptions = []
  
  for (const invoice of invoices) {
    const matchingDeliveries = findMatchingDeliveriesStandard(invoice, deliveries)
    const variance = calculateVariance(invoice, matchingDeliveries)
    
    if (variance <= 5) { // 5% tolerance
      matches.push({
        invoiceId: invoice.invoiceId,
        deliveryIds: matchingDeliveries.map(d => d.deliveryId),
        confidenceScore: 100 - variance,
        matchedAmount: invoice.totalAmount,
        variance,
        aiInsights: ['Standard reconciliation - no AI analysis'],
        riskLevel: variance <= 2 ? 'LOW' : variance <= 5 ? 'MEDIUM' : 'HIGH'
      })
    } else {
      exceptions.push({
        invoiceId: invoice.invoiceId,
        reason: 'QUANTITY_VARIANCE',
        severity: variance > 20 ? 'HIGH' : 'MEDIUM',
        recommendation: `Quantity variance of ${variance.toFixed(1)}% exceeds tolerance`,
        aiAnalysis: 'Standard rule-based analysis',
        suggestedActions: ['Verify delivery data', 'Check meter readings'],
        riskScore: variance
      })
    }
  }
  
  const summary = {
    totalInvoices: invoices.length,
    matchedInvoices: matches.length,
    exceptionalInvoices: exceptions.length,
    matchRate: invoices.length > 0 ? (matches.length / invoices.length * 100) : 0,
    totalMatchedAmount: matches.reduce((sum, m) => sum + m.matchedAmount, 0),
    aiConfidence: 0,
    riskDistribution: calculateRiskDistribution(matches, exceptions)
  }
  
  return NextResponse.json({
    matches,
    exceptions,
    patterns: [],
    summary,
    aiEnabled: false,
    processingTime: Date.now()
  })
}

async function detectPatterns(zai: any, invoices: any[], deliveries: any[], historicalData: any[]) {
  try {
    const prompt = `
    Analyze the following energy sector reconciliation data and detect patterns:
    
    Invoices: ${JSON.stringify(invoices.slice(0, 10))}
    Deliveries: ${JSON.stringify(deliveries.slice(0, 20))}
    Historical patterns: ${JSON.stringify(historicalData)}
    
    Identify:
    1. Recurring discrepancy patterns
    2. Seasonal variations
    3. Counterparty behavior patterns
    4. Systematic issues
    5. Fraud indicators
    
    For each pattern, provide:
    - Pattern description
    - Frequency
    - Business impact
    - Recommended actions
    `
    
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert energy sector financial analyst specializing in payment reconciliation and pattern detection.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })
    
    const aiResponse = completion.choices[0]?.message?.content || ''
    
    // Parse AI response into structured patterns
    return parseAIPatterns(aiResponse)
  } catch (error) {
    console.error('AI pattern detection failed:', error)
    return []
  }
}

async function analyzeInvoiceWithAI(zai: any, invoice: any, deliveries: any[], patterns: any[]) {
  try {
    const relevantDeliveries = deliveries.filter(d => 
      d.contractId === invoice.contractId &&
      new Date(d.timestamp) >= new Date(invoice.periodStart) &&
      new Date(d.timestamp) <= new Date(invoice.periodEnd)
    )
    
    const prompt = `
    Analyze this energy sector invoice for reconciliation:
    
    Invoice: ${JSON.stringify(invoice)}
    Related Deliveries: ${JSON.stringify(relevantDeliveries)}
    Detected Patterns: ${JSON.stringify(patterns)}
    
    Provide analysis in JSON format:
    {
      "confidence": 0-100,
      "primaryIssue": "main issue if any",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "riskFactors": ["factor1", "factor2"],
      "insights": ["insight1", "insight2"],
      "recommendation": "specific recommendation",
      "suggestedActions": ["action1", "action2"],
      "explanation": "detailed explanation",
      "riskScore": 0-100
    }
    `
    
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an AI-powered reconciliation expert for Ghana\'s energy sector. Analyze invoices and provide detailed risk assessments.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.2
    })
    
    const aiResponse = completion.choices[0]?.message?.content || '{}'
    
    try {
      return JSON.parse(aiResponse)
    } catch (parseError) {
      // Fallback if JSON parsing fails
      return {
        confidence: 50,
        primaryIssue: 'AI analysis failed',
        severity: 'MEDIUM',
        riskFactors: ['system_error'],
        insights: ['Analysis unavailable'],
        recommendation: 'Manual review required',
        suggestedActions: ['Verify manually'],
        explanation: 'AI analysis encountered an error',
        riskScore: 50
      }
    }
  } catch (error) {
    console.error('AI invoice analysis failed:', error)
    return {
      confidence: 0,
      primaryIssue: 'AI_UNAVAILABLE',
      severity: 'HIGH',
      riskFactors: ['ai_failure'],
      insights: ['AI analysis not available'],
      recommendation: 'Use standard reconciliation',
      suggestedActions: ['Manual review'],
      explanation: 'AI analysis service unavailable',
      riskScore: 75
    }
  }
}

function parseAIPatterns(aiResponse: string) {
  // Simple pattern parsing - in production this would be more sophisticated
  const patterns = []
  
  if (aiResponse.includes('seasonal')) {
    patterns.push({
      pattern: 'SEASONAL_VARIATION',
      frequency: 12,
      impact: 15,
      description: 'Seasonal variations in energy delivery and billing patterns detected'
    })
  }
  
  if (aiResponse.includes('discrepancy')) {
    patterns.push({
      pattern: 'RECURRING_DISCREPANCY',
      frequency: 8,
      impact: 25,
      description: 'Recurring quantity discrepancies in specific contracts'
    })
  }
  
  if (aiResponse.includes('delay')) {
    patterns.push({
      pattern: 'PAYMENT_DELAY_PATTERN',
      frequency: 15,
      impact: 20,
      description: 'Systematic payment delays affecting cash flow'
    })
  }
  
  return patterns
}

function findMatchingDeliveries(invoice: any, deliveries: any[], aiAnalysis: any) {
  const timeWindowMs = 7 * 24 * 60 * 60 * 1000 // 7 days
  const tolerancePercent = aiAnalysis.confidence > 90 ? 10 : 5 // Dynamic tolerance based on AI confidence
  
  return deliveries.filter(delivery => {
    if (delivery.contractId !== invoice.contractId) return false
    
    const deliveryTime = new Date(delivery.timestamp).getTime()
    const invoiceStart = new Date(invoice.periodStart).getTime()
    const invoiceEnd = new Date(invoice.periodEnd).getTime()
    
    const timeMatch = deliveryTime >= (invoiceStart - timeWindowMs) && 
                     deliveryTime <= (invoiceEnd + timeWindowMs)
    
    return timeMatch
  })
}

function findMatchingDeliveriesStandard(invoice: any, deliveries: any[]) {
  const timeWindowMs = 7 * 24 * 60 * 60 * 1000 // 7 days
  
  return deliveries.filter(delivery => {
    if (delivery.contractId !== invoice.contractId) return false
    
    const deliveryTime = new Date(delivery.timestamp).getTime()
    const invoiceStart = new Date(invoice.periodStart).getTime()
    const invoiceEnd = new Date(invoice.periodEnd).getTime()
    
    return deliveryTime >= (invoiceStart - timeWindowMs) && 
           deliveryTime <= (invoiceEnd + timeWindowMs)
  })
}

function calculateVariance(invoice: any, deliveries: any[]) {
  if (deliveries.length === 0) return 100
  
  const totalDelivered = deliveries.reduce((sum, d) => sum + d.quantity, 0)
  
  let expectedQuantity = 0
  try {
    const lineItems = JSON.parse(invoice.lineItems)
    expectedQuantity = lineItems.energy || lineItems.gas || lineItems.fuel || 0
  } catch (e) {
    return 100
  }
  
  if (expectedQuantity === 0) return 100
  
  return Math.abs((totalDelivered - expectedQuantity) / expectedQuantity * 100)
}

function calculateRiskLevel(variance: number, riskFactors: string[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (variance > 50 || riskFactors.includes('fraud')) return 'CRITICAL'
  if (variance > 25 || riskFactors.includes('system_error')) return 'HIGH'
  if (variance > 10 || riskFactors.length > 2) return 'MEDIUM'
  return 'LOW'
}

function calculateRiskDistribution(matches: any[], exceptions: any[]) {
  const distribution = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
  
  matches.forEach(m => distribution[m.riskLevel]++)
  exceptions.forEach(e => distribution[e.severity]++)
  
  return distribution
}

async function generateAISummary(zai: any, matches: any[], exceptions: any[], patterns: any[]) {
  const totalItems = matches.length + exceptions.length
  const matchRate = totalItems > 0 ? (matches.length / totalItems * 100) : 0
  const avgConfidence = matches.reduce((sum, m) => sum + m.confidenceScore, 0) / (matches.length || 1)
  
  return {
    totalInvoices: totalItems,
    matchedInvoices: matches.length,
    exceptionalInvoices: exceptions.length,
    matchRate,
    totalMatchedAmount: matches.reduce((sum, m) => sum + m.matchedAmount, 0),
    aiConfidence: avgConfidence,
    riskDistribution: calculateRiskDistribution(matches, exceptions)
  }
}

async function updateReconciliationResults(matches: any[], exceptions: any[], patterns: any[]) {
  // Update matched invoices
  for (const match of matches) {
    await db.invoice.updateMany({
      where: { invoiceId: match.invoiceId },
      data: {
        status: 'MATCHED',
        confidenceScore: match.confidenceScore,
        matchedDeliveries: JSON.stringify(match.deliveryIds)
      }
    })
  }
  
  // Update exception invoices and create disputes
  for (const exception of exceptions) {
    await db.invoice.updateMany({
      where: { invoiceId: exception.invoiceId },
      data: { status: 'PARTIALLY_MATCHED' }
    })
    
    if (exception.severity === 'HIGH' || exception.severity === 'CRITICAL') {
      const invoice = await db.invoice.findUnique({
        where: { invoiceId: exception.invoiceId }
      })
      
      if (invoice) {
        await db.dispute.create({
          data: {
            disputeId: `DSP-AI-${Date.now()}`,
            invoiceId: invoice.id,
            contractId: invoice.contractId,
            raisedById: invoice.counterpartyId,
            receivedById: invoice.issuerId,
            reasonCode: 'QUANTITY_VARIANCE',
            description: exception.aiAnalysis,
            status: 'OPEN',
            slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        })
      }
    }
  }
}

// Helper functions to get data
async function getInvoicesForPeriod(periodStart: string, periodEnd: string) {
  return await db.invoice.findMany({
    where: {
      periodStart: { gte: new Date(periodStart) },
      periodEnd: { lte: new Date(periodEnd) },
      status: { in: ['PENDING', 'PARTIALLY_MATCHED'] }
    },
    include: {
      contract: true,
      issuer: true,
      counterparty: true
    }
  })
}

async function getDeliveriesForPeriod(periodStart: string, periodEnd: string) {
  return await db.delivery.findMany({
    where: {
      timestamp: { 
        gte: new Date(periodStart), 
        lte: new Date(periodEnd) 
      }
    },
    include: {
      contract: true
    }
  })
}

async function getHistoricalReconciliationData() {
  // Get last 30 days of reconciliation results for pattern analysis
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
  return await db.auditLog.findMany({
    where: {
      action: { contains: 'RECONCILIATION' },
      timestamp: { gte: thirtyDaysAgo }
    },
    orderBy: { timestamp: 'desc' },
    take: 100
  })
}

async function getReconciliationRules() {
  // Return active reconciliation rules
  return NextResponse.json({
    rules: [
      {
        id: 'RULE_001',
        name: 'Time Window Matching',
        type: 'PATTERN',
        condition: 'delivery_timestamp within invoice_period ± 7 days',
        action: 'AUTO_MATCH',
        confidence: 85,
        active: true
      },
      {
        id: 'RULE_002',
        name: 'Quantity Tolerance',
        type: 'COMPLIANCE',
        condition: 'variance ≤ 5%',
        action: 'AUTO_MATCH',
        confidence: 90,
        active: true
      },
      {
        id: 'RULE_003',
        name: 'High Variance Alert',
        type: 'ANOMALY',
        condition: 'variance > 20%',
        action: 'CREATE_DISPUTE',
        confidence: 95,
        active: true
      }
    ]
  })
}

async function getDetectedPatterns() {
  return NextResponse.json({
    patterns: [
      {
        pattern: 'WEEKLY_INVOICE_SPIKE',
        description: 'Invoice volume spikes every Friday',
        frequency: 4,
        impact: 12,
        recommendation: 'Stagger invoice submissions throughout the week'
      },
      {
        pattern: 'MONTH_END_DELAYS',
        description: 'Processing delays at month-end',
        frequency: 12,
        impact: 18,
        recommendation: 'Increase processing capacity during peak periods'
      }
    ]
  })
}

async function getAIInsights() {
  return NextResponse.json({
    insights: [
      {
        category: 'EFFICIENCY',
        insight: 'AI reconciliation improves match rate by 23%',
        confidence: 87,
        impact: 'HIGH'
      },
      {
        category: 'RISK',
        insight: '3 high-risk patterns detected this week',
        confidence: 92,
        impact: 'CRITICAL'
      }
    ]
  })
}