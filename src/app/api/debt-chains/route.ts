import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ZAI } from 'z-ai-web-dev-sdk'

interface DebtChain {
  id: string
  chain: string[]
  totalAmount: number
  netFlow: number
  circularity: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  parties: Array<{
    id: string
    name: string
    type: string
    position: number
    cumulativeDebt: number
    riskFactors: string[]
  }>
  breakdown: Array<{
    from: string
    to: string
    amount: number
    percentage: number
    contractType: string
    aging: number
  }>
  optimization: {
    currentLegs: number
    optimalLegs: number
    savings: number
    efficiencyGain: number
    recommendedActions: string[]
  }
}

interface NetworkAnalysis {
  nodes: Array<{
    id: string
    name: string
    type: string
    totalReceivable: number
    totalPayable: number
    netPosition: number
    riskScore: number
    connections: number
  }>
  edges: Array<{
    from: string
    to: string
    amount: number
    weight: number
    contractType: string
    status: string
  }>
  metrics: {
    totalNetworkDebt: number
    averagePathLength: number
    networkDensity: number
    criticalNodes: string[]
    systemicRisk: number
    liquidityBottlenecks: string[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()
    
    switch (action) {
      case 'ANALYZE_CHAINS':
        return await analyzeDebtChains(data)
      case 'OPTIMIZE_CHAINS':
        return await optimizeDebtChains(data)
      case 'IDENTIFY_CIRCULARITY':
        return await identifyCircularDebt(data)
      case 'CALCULATE_SAVINGS':
        return await calculateNettingSavings(data)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Debt chain analysis error:', error)
    return NextResponse.json({ error: 'Debt chain analysis failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    switch (action) {
      case 'GET_CHAINS':
        return await getDebtChains()
      case 'GET_NETWORK_ANALYSIS':
        return await getNetworkAnalysis()
      case 'GET_OPTIMIZATION_RECOMMENDATIONS':
        return await getOptimizationRecommendations()
      case 'GET_CIRCULARITY_METRICS':
        return await getCircularityMetrics()
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Debt chain query error:', error)
    return NextResponse.json({ error: 'Debt chain query failed' }, { status: 500 })
  }
}

async function analyzeDebtChains(data: any) {
  const { period, includeHistorical = true, minAmount = 1000000 } = data
  
  // Get all invoices and payments for the period
  const invoices = await getInvoicesForPeriod(period?.start || '2025-10-01', period?.end || '2025-11-13')
  const payments = await getPaymentsForPeriod(period?.start || '2025-10-01', period?.end || '2025-11-13')
  
  // Build debt relationship matrix
  const debtMatrix = buildDebtMatrix(invoices, payments)
  
  // Identify debt chains using graph traversal
  const chains = await identifyDebtChains(debtMatrix, minAmount)
  
  // Analyze each chain for risk and optimization opportunities
  const analyzedChains = await Promise.all(chains.map(async (chain) => {
    return await analyzeChain(chain, invoices, payments)
  }))
  
  return NextResponse.json({
    chains: analyzedChains,
    summary: {
      totalChains: chains.length,
      totalDebt: chains.reduce((sum, c) => sum + c.totalAmount, 0),
      averageChainLength: chains.reduce((sum, c) => sum + c.chain.length, 0) / chains.length,
      criticalChains: chains.filter(c => c.riskLevel === 'CRITICAL').length,
      optimizationPotential: chains.reduce((sum, c) => sum + c.optimization.savings, 0)
    },
    period: period || { start: '2025-10-01', end: '2025-11-13' },
    generatedAt: new Date()
  })
}

async function optimizeDebtChains(data: any) {
  const { chains, optimizationGoals = ['MINIMIZE_LEGS', 'REDUCE_RISK', 'IMPROVE_LIQUIDITY'] } = data
  
  const zai = await ZAI.create()
  
  try {
    const prompt = `
    Optimize these circular debt chains for Ghana's energy sector:
    
    Debt Chains: ${JSON.stringify(chains)}
    Optimization Goals: ${optimizationGoals.join(', ')}
    
    Provide optimization recommendations in JSON format:
    {
      "recommendations": [
        {
          "chainId": "CHAIN_001",
          "currentLegs": 5,
          "optimizedLegs": 2,
          "savings": 150000000,
          "actions": ["merge_settlements", "use_escrow", "restructure_payments"],
          "riskReduction": 25,
          "implementationComplexity": "MEDIUM"
        }
      ],
      "networkOptimizations": [
        {
          "type": "CENTRAL_CLEARING",
          "description": "Implement centralized clearinghouse",
          "impact": "HIGH",
          "estimatedSavings": 500000000
        }
      ],
      "prioritization": [
        {
          "chainId": "CHAIN_001",
          "priority": "CRITICAL",
          "reason": "High circularity and systemic risk"
        }
      ]
    }
    `
    
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert in financial optimization and circular debt resolution for energy sectors.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3
    })
    
    const aiResponse = completion.choices[0]?.message?.content || '{}'
    
    let optimization
    try {
      optimization = JSON.parse(aiResponse)
    } catch (parseError) {
      optimization = generateFallbackOptimization(chains)
    }
    
    return NextResponse.json({
      optimization,
      aiGenerated: true,
      chainsAnalyzed: chains.length,
      estimatedTotalSavings: optimization.recommendations?.reduce((sum, r) => sum + (r.savings || 0), 0) || 0,
      implementationPlan: generateImplementationPlan(optimization)
    })
  } catch (error) {
    console.error('Debt chain optimization AI failed:', error)
    return NextResponse.json({
      optimization: generateFallbackOptimization(chains),
      aiGenerated: false,
      error: 'AI optimization unavailable, using fallback'
    })
  }
}

async function identifyCircularDebt(data: any) {
  const { minCircularity = 3, includeIndirect = true } = data
  
  // Get all payment relationships
  const paymentGraph = await buildPaymentGraph(includeIndirect)
  
  // Detect circular debt patterns
  const circularChains = detectCircularDebtPatterns(paymentGraph, minCircularity)
  
  // Calculate circularity metrics
  const circularityMetrics = await calculateCircularityMetrics(circularChains, paymentGraph)
  
  return NextResponse.json({
    circularChains,
    metrics: circularityMetrics,
    analysis: {
      totalCircularChains: circularChains.length,
      averageCircularity: circularChains.reduce((sum, c) => sum + c.circularity, 0) / circularChains.length,
      systemicRisk: calculateSystemicRisk(circularChains),
      affectedParties: getAffectedParties(circularChains),
      recommendedActions: generateCircularityRecommendations(circularChains)
    },
    generatedAt: new Date()
  })
}

async function calculateNettingSavings(data: any) {
  const { chains, currentNettingEfficiency = 0.65, targetEfficiency = 0.85 } = data
  
  let totalCurrentLegs = 0
  let totalOptimizedLegs = 0
  let totalCurrentAmount = 0
  let totalOptimizedAmount = 0
  
  const savingsAnalysis = chains.map(chain => {
    const currentLegs = chain.chain.length - 1
    const optimizedLegs = Math.ceil(chain.chain.length / 2) // Netting can reduce legs by ~50%
    
    totalCurrentLegs += currentLegs
    totalOptimizedLegs += optimizedLegs
    
    const transactionCost = chain.totalAmount * 0.0025 // 0.25% transaction cost
    const currentCost = chain.totalAmount + (currentLegs * transactionCost)
    const optimizedCost = chain.totalAmount + (optimizedLegs * transactionCost)
    
    totalCurrentAmount += currentCost
    totalOptimizedAmount += optimizedCost
    
    return {
      chainId: chain.id,
      currentLegs,
      optimizedLegs,
      currentCost,
      optimizedCost,
      savings: currentCost - optimizedCost,
      efficiencyGain: ((currentCost - optimizedCost) / currentCost) * 100
    }
  })
  
  const totalSavings = totalCurrentAmount - totalOptimizedAmount
  const overallEfficiencyGain = totalCurrentAmount > 0 ? (totalSavings / totalCurrentAmount) * 100 : 0
  
  return NextResponse.json({
    savingsAnalysis,
    summary: {
      totalCurrentLegs,
      totalOptimizedLegs,
      legReduction: totalCurrentLegs - totalOptimizedLegs,
      legReductionPercentage: ((totalCurrentLegs - totalOptimizedLegs) / totalCurrentLegs) * 100,
      totalSavings,
      overallEfficiencyGain,
      annualProjectedSavings: totalSavings * 12, // Monthly to annual
      implementationCost: totalOptimizedLegs * 5000, // ₵5,000 per settlement leg
      netAnnualBenefit: (totalSavings * 12) - (totalOptimizedLegs * 5000),
      paybackPeriod: totalOptimizedLegs * 5000 / (totalSavings * 12) // months
    },
    assumptions: {
      transactionCost: 0.25,
      currentEfficiency: currentNettingEfficiency,
      targetEfficiency: targetEfficiency,
      settlementFrequency: 'Monthly'
    }
  })
}

async function getDebtChains() {
  const chains = await analyzeCurrentDebtChains()
  
  return NextResponse.json({
    chains,
    summary: {
      totalChains: chains.length,
      criticalChains: chains.filter(c => c.riskLevel === 'CRITICAL').length,
      highRiskChains: chains.filter(c => c.riskLevel === 'HIGH').length,
      totalChainValue: chains.reduce((sum, c) => sum + c.totalAmount, 0),
      averageOptimizationPotential: chains.reduce((sum, c) => sum + c.optimization.savings, 0) / chains.length
    },
    lastAnalyzed: new Date()
  })
}

async function getNetworkAnalysis() {
  // Build comprehensive network analysis
  const network = await buildSectorNetwork()
  
  return NextResponse.json({
    network,
    metrics: {
      totalNodes: network.nodes.length,
      totalEdges: network.edges.length,
      networkDensity: calculateNetworkDensity(network),
      averagePathLength: calculateAveragePathLength(network),
      criticalNodes: identifyCriticalNodes(network),
      liquidityBottlenecks: identifyLiquidityBottlenecks(network),
      systemicRisk: calculateNetworkSystemicRisk(network)
    },
    visualization: {
      nodePositions: generateNodePositions(network.nodes),
      edgeWeights: normalizeEdgeWeights(network.edges),
      clusterGroups: identifyNetworkClusters(network)
    }
  })
}

async function getOptimizationRecommendations() {
  const zai = await ZAI.create()
  
  try {
    const currentChains = await analyzeCurrentDebtChains()
    const networkData = await buildSectorNetwork()
    
    const prompt = `
    Based on current Ghana energy sector debt patterns, provide strategic recommendations:
    
    Current Chains: ${JSON.stringify(currentChains)}
    Network Data: ${JSON.stringify(networkData)}
    
    Provide recommendations in JSON format:
    {
      "immediateActions": [
        {
          "action": "EXPAND_ESCROW",
          "priority": "HIGH",
          "impact": "Reduce settlement time by 60%",
          "implementation": "2 weeks"
        }
      ],
      "strategicInitiatives": [
        {
          "initiative": "CENTRAL_CLEARINGHOUSE",
          "timeline": "6 months",
          "expectedSavings": 2000000000,
          "riskReduction": 75
        }
      ],
      "policyRecommendations": [
        {
          "policy": "MANDATORY_NETTING",
          "description": "Require all energy sector payments to use NEPAR",
          "stakeholders": ["MoE", "MoF", "ECG", "VRA", "IPPs"]
        }
      ]
    }
    `
    
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a strategic advisor for Ghana\'s energy sector financial optimization.'
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
    
    let recommendations
    try {
      recommendations = JSON.parse(aiResponse)
    } catch (parseError) {
      recommendations = generateFallbackRecommendations()
    }
    
    return NextResponse.json({
      recommendations,
      aiGenerated: true,
      basedOnData: {
        chainsAnalyzed: currentChains.length,
        networkNodes: networkData.nodes.length,
        analysisDate: new Date()
      }
    })
  } catch (error) {
    console.error('Optimization recommendations AI failed:', error)
    return NextResponse.json({
      recommendations: generateFallbackRecommendations(),
      aiGenerated: false
    })
  }
}

async function getCircularityMetrics() {
  const circularChains = await detectAllCircularDebt()
  
  const metrics = {
    totalCircularChains: circularChains.length,
    averageCircularity: circularChains.reduce((sum, c) => sum + c.circularity, 0) / circularChains.length,
    maxCircularity: Math.max(...circularChains.map(c => c.circularity)),
    systemicRiskScore: calculateSystemicRiskScore(circularChains),
    affectedParties: getUniqueAffectedParties(circularChains),
    resolutionComplexity: calculateResolutionComplexity(circularChains)
  }
  
  return NextResponse.json({
    metrics,
    chains: circularChains,
    trends: await analyzeCircularityTrends(),
    recommendations: generateCircularityResolutionPlan(metrics)
  })
}

// Helper functions
async function buildDebtMatrix(invoices: any[], payments: any[]) {
  // Build adjacency matrix of debt relationships
  const matrix = new Map()
  
  // Process invoices (create debt relationships)
  invoices.forEach(invoice => {
    const key = `${invoice.counterpartyId}-${invoice.issuerId}`
    const currentAmount = matrix.get(key) || 0
    matrix.set(key, currentAmount + invoice.totalAmount)
  })
  
  // Process payments (reduce debt)
  payments.forEach(payment => {
    const key = `${payment.payerId}-${payment.payeeId}`
    const currentAmount = matrix.get(key) || 0
    matrix.set(key, Math.max(0, currentAmount - payment.amount))
  })
  
  return matrix
}

async function identifyDebtChains(debtMatrix: Map<string, number>, minAmount: number) {
  const chains = []
  const visited = new Set()
  
  // Find all debt relationships above minimum threshold
  const significantDebts = Array.from(debtMatrix.entries())
    .filter(([_, amount]) => amount >= minAmount)
  
  // Build chains using DFS
  for (const [relationship, amount] of significantDebts) {
    const [from, to] = relationship.split('-')
    
    if (!visited.has(relationship)) {
      const chain = await buildChain(from, to, debtMatrix, visited)
      if (chain.length > 2) { // Only consider chains with 3+ parties
        chains.push({
          id: `CHAIN_${chains.length + 1}`,
          chain: [...chain],
          totalAmount: calculateChainAmount(chain, debtMatrix),
          netFlow: calculateNetFlow(chain, debtMatrix)
        })
      }
    }
  }
  
  return chains
}

async function buildChain(start: string, current: string, debtMatrix: Map<string, number>, visited: Set<string>): Promise<string[]> {
  const chain = [start, current]
  visited.add(`${start}-${current}`)
  
  // Try to extend the chain
  const nextRelationships = Array.from(debtMatrix.keys())
    .filter(key => key.startsWith(`${current}-`))
  
  for (const relationship of nextRelationships) {
    const [_, next] = relationship.split('-')
    if (!visited.has(relationship) && chain.length < 6) { // Limit chain length
      const extendedChain = await buildChain(start, next, debtMatrix, visited)
      if (extendedChain.length > chain.length) {
        return extendedChain
      }
    }
  }
  
  return chain
}

function calculateChainAmount(chain: string[], debtMatrix: Map<string, number>): number {
  let totalAmount = 0
  
  for (let i = 0; i < chain.length - 1; i++) {
    const relationship = `${chain[i]}-${chain[i + 1]}`
    totalAmount += debtMatrix.get(relationship) || 0
  }
  
  return totalAmount
}

function calculateNetFlow(chain: string[], debtMatrix: Map<string, number>): number {
  let netFlow = 0
  
  for (let i = 0; i < chain.length - 1; i++) {
    const relationship = `${chain[i]}-${chain[i + 1]}`
    netFlow += debtMatrix.get(relationship) || 0
  }
  
  return netFlow
}

async function analyzeChain(chain: any, invoices: any[], payments: any[]) {
  // Detailed analysis of individual chain
  const parties = await Promise.all(chain.map(async (partyId, index) => {
    const party = await db.party.findUnique({ where: { id: partyId } })
    const position = calculatePartyPosition(partyId, chain, invoices, payments)
    
    return {
      id: partyId,
      name: party?.name || 'Unknown',
      type: party?.type || 'UNKNOWN',
      position: position.amount,
      cumulativeDebt: position.cumulative,
      riskFactors: identifyRiskFactors(party, position)
    }
  }))
  
  const breakdown = await generateChainBreakdown(chain, invoices, payments)
  const circularity = calculateCircularityScore(chain)
  const riskLevel = assessChainRisk(parties, circularity, breakdown)
  const optimization = await calculateChainOptimization(chain, breakdown)
  
  return {
    ...chain,
    parties,
    breakdown,
    circularity,
    riskLevel,
    optimization
  }
}

// Additional helper functions (mock implementations)
async function analyzeCurrentDebtChains() { return [] }
async function buildSectorNetwork() { return { nodes: [], edges: [] } }
async function detectCircularDebtPatterns(graph: any, minCircularity: number) { return [] }
async function calculateCircularityMetrics(chains: any[], graph: any) { return {} }
function generateFallbackOptimization(chains: any[]) { return { recommendations: [] } }
function generateImplementationPlan(optimization: any) { return [] }
function calculateSystemicRisk(chains: any[]) { return 0 }
function getAffectedParties(chains: any[]) { return [] }
function generateCircularityRecommendations(chains: any[]) { return [] }
function calculateNetworkDensity(network: any) { return 0 }
function calculateAveragePathLength(network: any) { return 0 }
function identifyCriticalNodes(network: any) { return [] }
function identifyLiquidityBottlenecks(network: any) { return [] }
function calculateNetworkSystemicRisk(network: any) { return 0 }
function generateNodePositions(nodes: any[]) { return [] }
function normalizeEdgeWeights(edges: any[]) { return [] }
function identifyNetworkClusters(network: any) { return [] }
function generateFallbackRecommendations() { return { immediateActions: [], strategicInitiatives: [], policyRecommendations: [] } }
async function detectAllCircularDebt() { return [] }
function getUniqueAffectedParties(chains: any[]) { return [] }
function calculateResolutionComplexity(chains: any[]) { return 0 }
function analyzeCircularityTrends() { return [] }
function generateCircularityResolutionPlan(metrics: any) { return [] }
async function calculatePartyPosition(partyId: string, chain: string[], invoices: any[], payments: any[]) { return { amount: 0, cumulative: 0 } }
function identifyRiskFactors(party: any, position: any) { return [] }
async function generateChainBreakdown(chain: string[], invoices: any[], payments: any[]) { return [] }
function calculateCircularityScore(chain: string[]) { return 0 }
function assessChainRisk(parties: any[], circularity: number, breakdown: any) { return 'MEDIUM' }
async function calculateChainOptimization(chain: string[], breakdown: any[]) { return { currentLegs: chain.length - 1, optimalLegs: Math.ceil(chain.length / 2), savings: 0, efficiencyGain: 0, recommendedActions: [] } }
async function getInvoicesForPeriod(start: string, end: string) { return [] }
async function getPaymentsForPeriod(start: string, end: string) { return [] }
function calculateSystemicRiskScore(chains: any[]) { return 0 }