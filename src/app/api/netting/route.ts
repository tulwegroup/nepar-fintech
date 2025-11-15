import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface NettingPosition {
  partyId: string
  partyName: string
  totalReceivable: number
  totalPayable: number
  netPosition: number
}

interface SettlementLeg {
  payerId: string
  payerName: string
  payeeId: string
  payeeName: string
  amount: number
  currency: string
}

interface NettingResult {
  period: string
  fxRate: number
  positions: NettingPosition[]
  settlementLegs: SettlementLeg[]
  summary: {
    totalGrossAmount: number
    totalNetAmount: number
    cashLegsReduction: number
    efficiencyGain: number
    numberOfLegs: {
      gross: number
      net: number
      reduction: number
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { period, fxRate = 1.0 } = await request.json()
    
    // Get all confirmed invoices and payments for the period
    const [startDate, endDate] = getPeriodRange(period)
    
    const invoices = await db.invoice.findMany({
      where: {
        periodStart: { gte: startDate },
        periodEnd: { lte: endDate },
        status: { in: ['MATCHED', 'PAID', 'PARTIALLY_PAID'] }
      },
      include: {
        issuer: { select: { id: true, name: true } },
        counterparty: { select: { id: true, name: true } },
        payments: {
          where: { status: 'COMPLETED' }
        }
      }
    })
    
    // Calculate netting positions
    const positions = calculateNettingPositions(invoices)
    
    // Generate optimal settlement legs
    const settlementLegs = generateSettlementLegs(positions)
    
    // Calculate summary metrics
    const summary = calculateSummary(positions, settlementLegs)
    
    const result: NettingResult = {
      period,
      fxRate,
      positions,
      settlementLegs,
      summary
    }
    
    // Create settlement batch record
    await createSettlementBatch(result)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error computing netting:', error)
    return NextResponse.json({ error: 'Failed to compute netting' }, { status: 500 })
  }
}

function getPeriodRange(period: string): [Date, Date] {
  // period format: YYYY-MM
  const [year, month] = period.split('-').map(Number)
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59) // Last day of month
  return [startDate, endDate]
}

function calculateNettingPositions(invoices: any[]): NettingPosition[] {
  const positionMap = new Map<string, NettingPosition>()
  
  for (const invoice of invoices) {
    const totalPaid = invoice.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0)
    const outstanding = invoice.totalAmount - totalPaid
    
    if (outstanding <= 0) continue // Already fully paid
    
    // Update issuer position (receivable)
    const issuerKey = invoice.issuer.id
    if (!positionMap.has(issuerKey)) {
      positionMap.set(issuerKey, {
        partyId: invoice.issuer.id,
        partyName: invoice.issuer.name,
        totalReceivable: 0,
        totalPayable: 0,
        netPosition: 0
      })
    }
    const issuerPos = positionMap.get(issuerKey)!
    issuerPos.totalReceivable += outstanding
    issuerPos.netPosition += outstanding
    
    // Update counterparty position (payable)
    const counterpartyKey = invoice.counterparty.id
    if (!positionMap.has(counterpartyKey)) {
      positionMap.set(counterpartyKey, {
        partyId: invoice.counterparty.id,
        partyName: invoice.counterparty.name,
        totalReceivable: 0,
        totalPayable: 0,
        netPosition: 0
      })
    }
    const counterpartyPos = positionMap.get(counterpartyKey)!
    counterpartyPos.totalPayable += outstanding
    counterpartyPos.netPosition -= outstanding
  }
  
  return Array.from(positionMap.values())
}

function generateSettlementLegs(positions: NettingPosition[]): SettlementLeg[] {
  const legs: SettlementLeg[] = []
  const debtors = positions.filter(p => p.netPosition < 0).sort((a, b) => a.netPosition - b.netPosition)
  const creditors = positions.filter(p => p.netPosition > 0).sort((a, b) => b.netPosition - a.netPosition)
  
  let debtorIndex = 0
  let creditorIndex = 0
  
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]
    
    const debtorOwes = Math.abs(debtor.netPosition)
    const creditorIsOwed = creditor.netPosition
    
    const settlementAmount = Math.min(debtorOwes, creditorIsOwed)
    
    if (settlementAmount > 0) {
      legs.push({
        payerId: debtor.partyId,
        payerName: debtor.partyName,
        payeeId: creditor.partyId,
        payeeName: creditor.partyName,
        amount: settlementAmount,
        currency: 'GHS'
      })
      
      // Update positions
      debtor.netPosition += settlementAmount
      creditor.netPosition -= settlementAmount
      
      // Move to next debtor if current is settled
      if (Math.abs(debtor.netPosition) < 0.01) {
        debtorIndex++
      }
      
      // Move to next creditor if current is fully paid
      if (creditor.netPosition < 0.01) {
        creditorIndex++
      }
    }
  }
  
  return legs
}

function calculateSummary(positions: NettingPosition[], legs: SettlementLeg[]) {
  const totalReceivable = positions.reduce((sum, p) => sum + p.totalReceivable, 0)
  const totalPayable = positions.reduce((sum, p) => sum + p.totalPayable, 0)
  const totalGrossAmount = Math.max(totalReceivable, totalPayable)
  const totalNetAmount = legs.reduce((sum, leg) => sum + leg.amount, 0)
  
  // Calculate gross legs (each invoice would be a separate payment)
  const grossLegs = positions.filter(p => p.totalPayable > 0).length + 
                   positions.filter(p => p.totalReceivable > 0).length
  
  return {
    totalGrossAmount,
    totalNetAmount,
    cashLegsReduction: totalGrossAmount - totalNetAmount,
    efficiencyGain: totalGrossAmount > 0 ? ((totalGrossAmount - totalNetAmount) / totalGrossAmount * 100) : 0,
    numberOfLegs: {
      gross: grossLegs,
      net: legs.length,
      reduction: grossLegs - legs.length
    }
  }
}

async function createSettlementBatch(result: NettingResult) {
  const batchId = `SB-${result.period.replace('-', '')}-${Date.now()}`
  
  await db.settlementBatch.create({
    data: {
      batchId,
      period: result.period,
      fxRate: result.fxRate,
      totalNetAmount: result.summary.totalNetAmount,
      status: 'COMPUTED'
    }
  })
  
  return batchId
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')
    
    if (!period) {
      return NextResponse.json({ error: 'Period parameter is required' }, { status: 400 })
    }
    
    const batches = await db.settlementBatch.findMany({
      where: { period },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(batches)
  } catch (error) {
    console.error('Error fetching settlement batches:', error)
    return NextResponse.json({ error: 'Failed to fetch settlement batches' }, { status: 500 })
  }
}