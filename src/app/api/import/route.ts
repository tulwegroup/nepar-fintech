import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { PartyType, ContractType, InvoiceStatus, PaymentStatus, DisputeReason, DisputeStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json()
    
    switch (type) {
      case 'parties':
        return await importParties(data)
      case 'contracts':
        return await importContracts(data)
      case 'invoices':
        return await importInvoices(data)
      case 'deliveries':
        return await importDeliveries(data)
      case 'payments':
        return await importPayments(data)
      case 'disputes':
        return await importDisputes(data)
      default:
        return NextResponse.json({ error: 'Invalid import type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error importing data:', error)
    return NextResponse.json({ error: 'Failed to import data' }, { status: 500 })
  }
}

async function importParties(parties: any[]) {
  const results = []
  
  for (const party of parties) {
    try {
      const existing = await db.party.findUnique({
        where: { partyId: party.PartyID }
      })
      
      if (!existing) {
        const newParty = await db.party.create({
          data: {
            partyId: party.PartyID,
            name: party.Name,
            type: mapPartyType(party.Type),
            bankDetails: party.BankDetails,
            taxId: party.TaxID,
            isActive: true
          }
        })
        results.push({ action: 'created', data: newParty })
      } else {
        results.push({ action: 'skipped', reason: 'already exists', partyId: party.PartyID })
      }
    } catch (error) {
      results.push({ action: 'error', partyId: party.PartyID, error: error.message })
    }
  }
  
  return NextResponse.json({ results, total: parties.length })
}

async function importContracts(contracts: any[]) {
  const results = []
  
  for (const contract of contracts) {
    try {
      // Find parties
      const partyA = await db.party.findFirst({ where: { partyId: contract.PartyA_ID } })
      const partyB = await db.party.findFirst({ where: { partyId: contract.PartyB_ID } })
      
      if (!partyA || !partyB) {
        results.push({ action: 'error', contractId: contract.ContractID, error: 'Party not found' })
        continue
      }
      
      const existing = await db.contract.findUnique({
        where: { contractId: contract.ContractID }
      })
      
      if (!existing) {
        const newContract = await db.contract.create({
          data: {
            contractId: contract.ContractID,
            partyAId: partyA.id,
            partyBId: partyB.id,
            type: mapContractType(contract.Type),
            pricingFormula: contract.PricingFormula || '{}',
            meteringPoints: contract.MeteringPoints,
            slas: contract.SLAs,
            startDate: new Date(contract.StartDate),
            endDate: contract.EndDate ? new Date(contract.EndDate) : null,
            currency: contract.Currency || 'GHS',
            isActive: true
          }
        })
        results.push({ action: 'created', data: newContract })
      } else {
        results.push({ action: 'skipped', reason: 'already exists', contractId: contract.ContractID })
      }
    } catch (error) {
      results.push({ action: 'error', contractId: contract.ContractID, error: error.message })
    }
  }
  
  return NextResponse.json({ results, total: contracts.length })
}

async function importInvoices(invoices: any[]) {
  const results = []
  
  for (const invoice of invoices) {
    try {
      // Find contract and parties
      const contract = await db.contract.findFirst({ where: { contractId: invoice.ContractID } })
      const issuer = await db.party.findFirst({ where: { partyId: invoice.Issuer } })
      const counterparty = await db.party.findFirst({ where: { partyId: invoice.Counterparty } })
      
      if (!contract || !issuer || !counterparty) {
        results.push({ action: 'error', invoiceId: invoice.InvoiceID, error: 'Contract or party not found' })
        continue
      }
      
      const existing = await db.invoice.findUnique({
        where: { invoiceId: invoice.InvoiceID }
      })
      
      if (!existing) {
        const lineItems = {
          energy: invoice.Energy_MWh || 0,
          gas: invoice.Gas_mmscf || 0,
          fuel: invoice.Fuel_ltrs || 0
        }
        
        const newInvoice = await db.invoice.create({
          data: {
            invoiceId: invoice.InvoiceID,
            contractId: contract.id,
            issuerId: issuer.id,
            counterpartyId: counterparty.id,
            periodStart: new Date(invoice.PeriodStart),
            periodEnd: new Date(invoice.PeriodEnd),
            currency: invoice.Currency || 'GHS',
            totalAmount: parseFloat(invoice.Amount),
            taxAmount: invoice.Taxes ? parseFloat(invoice.Taxes) : null,
            lineItems: JSON.stringify(lineItems),
            status: InvoiceStatus.PENDING,
            hash: generateHash(invoice)
          }
        })
        results.push({ action: 'created', data: newInvoice })
      } else {
        results.push({ action: 'skipped', reason: 'already exists', invoiceId: invoice.InvoiceID })
      }
    } catch (error) {
      results.push({ action: 'error', invoiceId: invoice.InvoiceID, error: error.message })
    }
  }
  
  return NextResponse.json({ results, total: invoices.length })
}

async function importDeliveries(deliveries: any[]) {
  const results = []
  
  for (const delivery of deliveries) {
    try {
      const contract = await db.contract.findFirst({ where: { contractId: delivery.ContractID } })
      
      if (!contract) {
        results.push({ action: 'error', deliveryId: delivery.DeliveryID, error: 'Contract not found' })
        continue
      }
      
      const existing = await db.delivery.findUnique({
        where: { deliveryId: delivery.DeliveryID }
      })
      
      if (!existing) {
        const newDelivery = await db.delivery.create({
          data: {
            deliveryId: delivery.DeliveryID,
            contractId: contract.id,
            timestamp: new Date(delivery.Timestamp),
            meterReadStart: parseFloat(delivery.MeterReadStart),
            meterReadEnd: parseFloat(delivery.MeterReadEnd),
            quantity: parseFloat(delivery.Quantity),
            sourceSystem: delivery.SourceSystem,
            proofHash: delivery.ProofHash,
            fileReference: delivery.FileRef,
            qualityScore: delivery.QualityScore ? parseFloat(delivery.QualityScore) : null
          }
        })
        results.push({ action: 'created', data: newDelivery })
      } else {
        results.push({ action: 'skipped', reason: 'already exists', deliveryId: delivery.DeliveryID })
      }
    } catch (error) {
      results.push({ action: 'error', deliveryId: delivery.DeliveryID, error: error.message })
    }
  }
  
  return NextResponse.json({ results, total: deliveries.length })
}

async function importPayments(payments: any[]) {
  const results = []
  
  for (const payment of payments) {
    try {
      const invoice = payment.InvoiceID ? 
        await db.invoice.findFirst({ where: { invoiceId: payment.InvoiceID } }) : null
      
      const payer = await db.party.findFirst({ where: { partyId: payment.Payer } })
      const payee = await db.party.findFirst({ where: { partyId: payment.Payee } })
      
      if (!payer || !payee) {
        results.push({ action: 'error', paymentId: payment.PaymentID, error: 'Party not found' })
        continue
      }
      
      const existing = await db.payment.findUnique({
        where: { paymentId: payment.PaymentID }
      })
      
      if (!existing) {
        const newPayment = await db.payment.create({
          data: {
            paymentId: payment.PaymentID,
            invoiceId: invoice?.id,
            payerId: payer.id,
            payeeId: payee.id,
            amount: parseFloat(payment.Amount),
            currency: payment.Currency || 'GHS',
            valueDate: new Date(payment.ValueDate),
            bankReference: payment.BankRef,
            status: PaymentStatus.COMPLETED
          }
        })
        results.push({ action: 'created', data: newPayment })
      } else {
        results.push({ action: 'skipped', reason: 'already exists', paymentId: payment.PaymentID })
      }
    } catch (error) {
      results.push({ action: 'error', paymentId: payment.PaymentID, error: error.message })
    }
  }
  
  return NextResponse.json({ results, total: payments.length })
}

async function importDisputes(disputes: any[]) {
  const results = []
  
  for (const dispute of disputes) {
    try {
      const contract = await db.contract.findFirst({ where: { contractId: dispute.ContractID } })
      const invoice = dispute.InvoiceID ? 
        await db.invoice.findFirst({ where: { invoiceId: dispute.InvoiceID } }) : null
      const raisedBy = await db.party.findFirst({ where: { partyId: dispute.RaisedBy } })
      const receivedBy = await db.party.findFirst({ where: { partyId: dispute.ReceivedBy } })
      
      if (!contract || !raisedBy || !receivedBy) {
        results.push({ action: 'error', disputeId: dispute.DisputeID, error: 'Contract or party not found' })
        continue
      }
      
      const existing = await db.dispute.findUnique({
        where: { disputeId: dispute.DisputeID }
      })
      
      if (!existing) {
        const newDispute = await db.dispute.create({
          data: {
            disputeId: dispute.DisputeID,
            invoiceId: invoice?.id,
            contractId: contract.id,
            raisedById: raisedBy.id,
            receivedById: receivedBy.id,
            reasonCode: mapDisputeReason(dispute.ReasonCode),
            description: dispute.Description,
            status: mapDisputeStatus(dispute.Status),
            resolution: dispute.Resolution,
            rulingAmount: dispute.RulingAmount ? parseFloat(dispute.RulingAmount) : null,
            slaDeadline: new Date(dispute.SLADeadline)
          }
        })
        results.push({ action: 'created', data: newDispute })
      } else {
        results.push({ action: 'skipped', reason: 'already exists', disputeId: dispute.DisputeID })
      }
    } catch (error) {
      results.push({ action: 'error', disputeId: dispute.DisputeID, error: error.message })
    }
  }
  
  return NextResponse.json({ results, total: disputes.length })
}

function mapPartyType(type: string): PartyType {
  const typeMap: Record<string, PartyType> = {
    'GEN': PartyType.GENERATOR,
    'TRANS': PartyType.TRANSMISSION,
    'DIST': PartyType.DISTRIBUTOR,
    'FUEL': PartyType.FUEL_SUPPLIER,
    'REG': PartyType.REGULATOR,
    'FIN': PartyType.FINANCIAL
  }
  return typeMap[type] || PartyType.GENERATOR
}

function mapContractType(type: string): ContractType {
  const typeMap: Record<string, ContractType> = {
    'PPA': ContractType.PPA,
    'GSA': ContractType.GSA,
    'FSA': ContractType.FSA,
    'WHEELING': ContractType.WHEELING
  }
  return typeMap[type] || ContractType.PPA
}

function mapDisputeReason(reason: string): DisputeReason {
  const reasonMap: Record<string, DisputeReason> = {
    'QUANTITY_VARIANCE': DisputeReason.QUANTITY_VARIANCE,
    'PRICE_VARIANCE': DisputeReason.PRICE_VARIANCE,
    'MISSING_DELIVERY_PROOF': DisputeReason.MISSING_DELIVERY_PROOF,
    'LATE_DELIVERY': DisputeReason.LATE_DELIVERY,
    'QUALITY_ISSUE': DisputeReason.QUALITY_ISSUE,
    'DUPLICATE_INVOICE': DisputeReason.DUPLICATE_INVOICE,
    'FX_MISMATCH': DisputeReason.FX_MISMATCH,
    'CONTRACT_BREACH': DisputeReason.CONTRACT_BREACH,
    'OTHER': DisputeReason.OTHER
  }
  return reasonMap[reason] || DisputeReason.OTHER
}

function mapDisputeStatus(status: string): DisputeStatus {
  const statusMap: Record<string, DisputeStatus> = {
    'OPEN': DisputeStatus.OPEN,
    'UNDER_REVIEW': DisputeStatus.UNDER_REVIEW,
    'EVIDENCE_REQUESTED': DisputeStatus.EVIDENCE_REQUESTED,
    'PARTIALLY_ACCEPTED': DisputeStatus.PARTIALLY_ACCEPTED,
    'RESOLVED': DisputeStatus.RESOLVED,
    'ESCALATED': DisputeStatus.ESCALATED,
    'CLOSED': DisputeStatus.CLOSED
  }
  return statusMap[status] || DisputeStatus.OPEN
}

function generateHash(data: any): string {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
}