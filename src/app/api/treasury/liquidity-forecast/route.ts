import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Generate 12-month liquidity forecast
    const forecast = []
    const currentBalance = 1040000000 // Current total balance
    
    for (let i = 0; i < 12; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() + i)
      
      const inflow = Math.floor(Math.random() * 200000000) + 300000000 // 300M-500M
      const outflow = Math.floor(Math.random() * 150000000) + 250000000 // 250M-400M
      const netFlow = inflow - outflow
      const projectedBalance = i === 0 ? currentBalance + netFlow : forecast[i-1].projectedBalance + netFlow
      const confidence = Math.floor(Math.random() * 15) + 75 // 75-90%
      
      forecast.push({
        period: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        inflow,
        outflow,
        netFlow,
        projectedBalance,
        confidence
      })
    }

    return NextResponse.json(forecast)
  } catch (error) {
    console.error('Error fetching liquidity forecast:', error)
    return NextResponse.json({ error: 'Failed to fetch liquidity forecast' }, { status: 500 })
  }
}