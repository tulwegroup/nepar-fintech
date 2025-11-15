import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

interface SmartContractTransaction {
  txId: string
  contractType: 'INVOICE_REGISTRATION' | 'DELIVERY_LINK' | 'DISPUTE_OPEN' | 'SETTLEMENT_APPROVAL' | 'SETTLEMENT_EXECUTION'
  parties: string[]
  data: any
  hash: string
  timestamp: Date
  blockNumber: number
  status: 'PENDING' | 'CONFIRMED' | 'FAILED'
}

// Mock blockchain state - in production this would be a real distributed ledger
let blockchainState: {
  transactions: SmartContractTransaction[]
  currentBlock: number
  consensus: Map<string, boolean>
} = {
  transactions: [],
  currentBlock: 0,
  consensus: new Map()
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()
    
    switch (action) {
      case 'REGISTER_INVOICE':
        return await registerInvoice(data)
      case 'LINK_DELIVERY':
        return await linkDelivery(data)
      case 'OPEN_DISPUTE':
        return await openDispute(data)
      case 'APPROVE_SETTLEMENT':
        return await approveSettlement(data)
      case 'EXECUTE_SETTLEMENT':
        return await executeSettlement(data)
      case 'VERIFY_PROOF':
        return await verifyProof(data)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Blockchain operation error:', error)
    return NextResponse.json({ error: 'Blockchain operation failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    switch (action) {
      case 'GET_TRANSACTION':
        const txId = searchParams.get('txId')
        return getTransaction(txId!)
      case 'GET_LEDGER_SNAPSHOT':
        return getLedgerSnapshot()
      case 'GET_CONSENSUS_STATUS':
        return getConsensusStatus()
      case 'GET_BLOCK_HEIGHT':
        return getBlockHeight()
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Blockchain query error:', error)
    return NextResponse.json({ error: 'Blockchain query failed' }, { status: 500 })
  }
}

async function registerInvoice(invoiceData: any) {
  const txId = `TX_INV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const hash = createHash('sha256').update(JSON.stringify(invoiceData)).digest('hex')
  
  const transaction: SmartContractTransaction = {
    txId,
    contractType: 'INVOICE_REGISTRATION',
    parties: [invoiceData.issuerId, invoiceData.counterpartyId],
    data: {
      invoiceId: invoiceData.invoiceId,
      contractId: invoiceData.contractId,
      amount: invoiceData.amount,
      period: invoiceData.period,
      hash: invoiceData.hash
    },
    hash,
    timestamp: new Date(),
    blockNumber: blockchainState.currentBlock + 1,
    status: 'PENDING'
  }
  
  // Simulate consensus
  const consensus = await simulateConsensus(transaction)
  transaction.status = consensus ? 'CONFIRMED' : 'FAILED'
  
  if (consensus) {
    blockchainState.transactions.push(transaction)
    blockchainState.currentBlock++
    
    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'BLOCKCHAIN_INVOICE_REGISTER',
        entityType: 'invoice',
        entityId: invoiceData.invoiceId,
        newValues: JSON.stringify({ txId, blockNumber: transaction.blockNumber, hash }),
        timestamp: new Date()
      }
    })
  }
  
  return NextResponse.json({
    success: consensus,
    transaction,
    message: consensus ? 'Invoice registered on blockchain' : 'Consensus failed'
  })
}

async function linkDelivery(deliveryData: any) {
  const txId = `TX_DEL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const hash = createHash('sha256').update(JSON.stringify(deliveryData)).digest('hex')
  
  const transaction: SmartContractTransaction = {
    txId,
    contractType: 'DELIVERY_LINK',
    parties: deliveryData.parties,
    data: {
      invoiceId: deliveryData.invoiceId,
      deliveryIds: deliveryData.deliveryIds,
      confidenceScore: deliveryData.confidenceScore,
      matchedAmount: deliveryData.matchedAmount
    },
    hash,
    timestamp: new Date(),
    blockNumber: blockchainState.currentBlock + 1,
    status: 'PENDING'
  }
  
  const consensus = await simulateConsensus(transaction)
  transaction.status = consensus ? 'CONFIRMED' : 'FAILED'
  
  if (consensus) {
    blockchainState.transactions.push(transaction)
    blockchainState.currentBlock++
  }
  
  return NextResponse.json({
    success: consensus,
    transaction,
    message: consensus ? 'Delivery linked on blockchain' : 'Consensus failed'
  })
}

async function openDispute(disputeData: any) {
  const txId = `TX_DSP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const hash = createHash('sha256').update(JSON.stringify(disputeData)).digest('hex')
  
  const transaction: SmartContractTransaction = {
    txId,
    contractType: 'DISPUTE_OPEN',
    parties: [disputeData.raisedById, disputeData.receivedById],
    data: {
      disputeId: disputeData.disputeId,
      invoiceId: disputeData.invoiceId,
      reasonCode: disputeData.reasonCode,
      description: disputeData.description,
      evidenceHash: disputeData.evidenceHash
    },
    hash,
    timestamp: new Date(),
    blockNumber: blockchainState.currentBlock + 1,
    status: 'PENDING'
  }
  
  const consensus = await simulateConsensus(transaction)
  transaction.status = consensus ? 'CONFIRMED' : 'FAILED'
  
  if (consensus) {
    blockchainState.transactions.push(transaction)
    blockchainState.currentBlock++
  }
  
  return NextResponse.json({
    success: consensus,
    transaction,
    message: consensus ? 'Dispute recorded on blockchain' : 'Consensus failed'
  })
}

async function approveSettlement(settlementData: any) {
  const txId = `TX_APP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const hash = createHash('sha256').update(JSON.stringify(settlementData)).digest('hex')
  
  const transaction: SmartContractTransaction = {
    txId,
    contractType: 'SETTLEMENT_APPROVAL',
    parties: settlementData.approvers,
    data: {
      batchId: settlementData.batchId,
      totalAmount: settlementData.totalAmount,
      netPositions: settlementData.netPositions,
      approvals: settlementData.approvals
    },
    hash,
    timestamp: new Date(),
    blockNumber: blockchainState.currentBlock + 1,
    status: 'PENDING'
  }
  
  // Settlement requires multi-sig approval
  const requiredApprovals = Math.ceil(settlementData.approvers.length * 0.67) // 67% threshold
  const hasQuorum = settlementData.approvals.length >= requiredApprovals
  
  const consensus = await simulateConsensus(transaction) && hasQuorum
  transaction.status = consensus ? 'CONFIRMED' : 'FAILED'
  
  if (consensus) {
    blockchainState.transactions.push(transaction)
    blockchainState.currentBlock++
    
    // Update settlement batch status
    await db.settlementBatch.updateMany({
      where: { batchId: settlementData.batchId },
      data: { 
        status: 'APPROVED',
        smartContractTxId: txId
      }
    })
  }
  
  return NextResponse.json({
    success: consensus,
    transaction,
    message: consensus ? 'Settlement approved on blockchain' : 'Insufficient approvals or consensus failed'
  })
}

async function executeSettlement(executionData: any) {
  const txId = `TX_EXEC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const hash = createHash('sha256').update(JSON.stringify(executionData)).digest('hex')
  
  const transaction: SmartContractTransaction = {
    txId,
    contractType: 'SETTLEMENT_EXECUTION',
    parties: executionData.parties,
    data: {
      batchId: executionData.batchId,
      settlementLegs: executionData.settlementLegs,
      totalAmount: executionData.totalAmount,
      bankReferences: executionData.bankReferences,
      executionTime: executionData.executionTime
    },
    hash,
    timestamp: new Date(),
    blockNumber: blockchainState.currentBlock + 1,
    status: 'PENDING'
  }
  
  const consensus = await simulateConsensus(transaction)
  transaction.status = consensus ? 'CONFIRMED' : 'FAILED'
  
  if (consensus) {
    blockchainState.transactions.push(transaction)
    blockchainState.currentBlock++
    
    // Update settlement batch status
    await db.settlementBatch.updateMany({
      where: { batchId: executionData.batchId },
      data: { 
        status: 'EXECUTED',
        executedAt: new Date()
      }
    })
    
    // Create payment records
    for (const leg of executionData.settlementLegs) {
      await db.payment.create({
        data: {
          paymentId: `PAY_SETT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          payerId: leg.payerId,
          payeeId: leg.payeeId,
          amount: leg.amount,
          currency: leg.currency,
          valueDate: new Date(),
          bankReference: leg.bankReference,
          status: 'COMPLETED',
          settlementBatchId: executionData.batchIdId
        }
      })
    }
  }
  
  return NextResponse.json({
    success: consensus,
    transaction,
    message: consensus ? 'Settlement executed on blockchain' : 'Consensus failed'
  })
}

async function verifyProof(proofData: any) {
  const { txId, merkleProof, expectedHash } = proofData
  
  const transaction = blockchainState.transactions.find(tx => tx.txId === txId)
  
  if (!transaction) {
    return NextResponse.json({ 
      valid: false, 
      error: 'Transaction not found' 
    })
  }
  
  // Simulate Merkle proof verification
  const isValid = transaction.hash === expectedHash
  
  return NextResponse.json({
    valid: isValid,
    transaction: isValid ? transaction : null,
    proof: {
      merkleRoot: '0x' + createHash('sha256').update(JSON.stringify(blockchainState.transactions)).digest('hex'),
      verifiedAt: new Date()
    }
  })
}

async function simulateConsensus(transaction: SmartContractTransaction): Promise<boolean> {
  // Simulate Byzantine Fault Tolerant consensus
  // In production, this would involve multiple validator nodes
  const validators = ['MoE', 'MoF', 'CAGD', 'BoG', 'NRA']
  const approvals = Math.floor(validators.length * 0.8) // 80% approval rate
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
  
  // Simulate consensus success (95% success rate for demo)
  return Math.random() > 0.05
}

function getTransaction(txId: string) {
  const transaction = blockchainState.transactions.find(tx => tx.txId === txId)
  
  if (!transaction) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }
  
  return NextResponse.json({ transaction })
}

function getLedgerSnapshot() {
  return NextResponse.json({
    blockHeight: blockchainState.currentBlock,
    totalTransactions: blockchainState.transactions.length,
    ledgerHash: createHash('sha256').update(JSON.stringify(blockchainState.transactions)).digest('hex'),
    timestamp: new Date()
  })
}

function getConsensusStatus() {
  const pendingTransactions = blockchainState.transactions.filter(tx => tx.status === 'PENDING')
  const confirmedTransactions = blockchainState.transactions.filter(tx => tx.status === 'CONFIRMED')
  
  return NextResponse.json({
    pendingCount: pendingTransactions.length,
    confirmedCount: confirmedTransactions.length,
    consensusRate: blockchainState.transactions.length > 0 ? 
      (confirmedTransactions.length / blockchainState.transactions.length * 100) : 0,
    lastConsensus: blockchainState.transactions.length > 0 ? 
      blockchainState.transactions[blockchainState.transactions.length - 1].timestamp : null
  })
}

function getBlockHeight() {
  return NextResponse.json({
    blockHeight: blockchainState.currentBlock,
    timestamp: new Date()
  })
}