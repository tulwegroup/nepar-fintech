import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash, randomBytes } from 'crypto'
import { UserRole } from '@prisma/client'

interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  partyId?: string
  permissions: Permission[]
  isActive: boolean
  lastLogin: Date
  sessionToken?: string
  mfaEnabled: boolean
  mfaSecret?: string
}

interface Permission {
  id: string
  name: string
  resource: string
  action: string
  description: string
  category: 'DASHBOARD' | 'SETTLEMENT' | 'RECONCILIATION' | 'AUDIT' | 'ADMIN' | 'AGENCY'
}

interface Role {
  id: UserRole
  name: string
  description: string
  permissions: string[]
  level: number // Higher number = higher privilege
  governanceApproval: boolean
}

interface Session {
  id: string
  userId: string
  token: string
  expiresAt: Date
  ipAddress: string
  userAgent: string
  isActive: boolean
  mfaVerified: boolean
}

interface GovernanceAction {
  id: string
  userId: string
  action: string
  resource: string
  resourceId: string
  timestamp: Date
  requiresApproval: boolean
  approvedBy?: string
  approvedAt?: Date
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()
    
    switch (action) {
      case 'LOGIN':
        return await login(data)
      case 'LOGOUT':
        return await logout(data)
      case 'VERIFY_MFA':
        return await verifyMFA(data)
      case 'CHECK_PERMISSION':
        return await checkPermission(data)
      case 'REQUEST_GOVERNANCE_APPROVAL':
        return await requestGovernanceApproval(data)
      case 'APPROVE_GOVERNANCE_ACTION':
        return await approveGovernanceAction(data)
      case 'CREATE_USER':
        return await createUser(data)
      case 'UPDATE_USER_ROLE':
        return await updateUserRole(data)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Auth operation error:', error)
    return NextResponse.json({ error: 'Authentication operation failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    switch (action) {
      case 'GET_PERMISSIONS':
        return await getPermissions()
      case 'GET_ROLES':
        return await getRoles()
      case 'GET_USER_PROFILE':
        const token = searchParams.get('token')
        return await getUserProfile(token!)
      case 'GET_GOVERNANCE_QUEUE':
        return await getGovernanceQueue()
      case 'GET_SESSION_STATUS':
        const sessionToken = searchParams.get('token')
        return await getSessionStatus(sessionToken!)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Auth query error:', error)
    return NextResponse.json({ error: 'Authentication query failed' }, { status: 500 })
  }
}

async function login(data: any) {
  const { email, password, mfaCode } = data
  
  // Find user
  const user = await db.user.findUnique({
    where: { email, isActive: true },
    include: { party: true }
  })
  
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  
  // Verify password (in production, use proper hashing)
  const passwordValid = await verifyPassword(password, user.password || '')
  if (!passwordValid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  
  // Check MFA if enabled
  if (user.mfaEnabled && !mfaCode) {
    return NextResponse.json({ 
      error: 'MFA required',
      requiresMFA: true 
    }, { status: 200 })
  }
  
  if (user.mfaEnabled && mfaCode) {
    const mfaValid = await verifyMFACode(user.id, mfaCode)
    if (!mfaValid) {
      return NextResponse.json({ error: 'Invalid MFA code' }, { status: 401 })
    }
  }
  
  // Create session
  const sessionToken = generateSessionToken()
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
  
  await db.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      isActive: true,
      mfaVerified: true
    }
  })
  
  // Update last login
  await db.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  })
  
  // Get user permissions
  const permissions = await getUserPermissions(user.role)
  
  // Log governance action for high-risk roles
  if (requiresGovernanceApproval(user.role)) {
    await logGovernanceAction({
      userId: user.id,
      action: 'LOGIN',
      resource: 'SYSTEM',
      resourceId: user.id,
      requiresApproval: false, // Login doesn't require approval
      status: 'COMPLETED'
    })
  }
  
  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      partyId: user.partyId,
      party: user.party,
      permissions,
      lastLogin: new Date()
    },
    sessionToken,
    expiresAt,
    message: 'Login successful'
  })
}

async function checkPermission(data: any) {
  const { token, resource, action } = data
  
  // Get session
  const session = await db.session.findUnique({
    where: { token, isActive: true },
    include: { user: true }
  })
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
  
  // Check session expiration
  if (new Date() > session.expiresAt) {
    await db.session.update({
      where: { id: session.id },
      data: { isActive: false }
    })
    return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  }
  
  // Get user permissions
  const userPermissions = await getUserPermissions(session.user.role)
  
  // Check specific permission
  const hasPermission = userPermissions.some(permission => 
    permission.resource === resource && 
    (permission.action === action || permission.action === '*')
  )
  
  // Log access attempt
  await logAccessAttempt({
    userId: session.user.id,
    resource,
    action,
    granted: hasPermission,
    ipAddress: data.ipAddress
  })
  
  return NextResponse.json({
    hasPermission,
    userRole: session.user.role,
    permissions: userPermissions,
    message: hasPermission ? 'Access granted' : 'Access denied'
  })
}

async function requestGovernanceApproval(data: any) {
  const { userId, action, resource, resourceId, justification } = data
  
  // Check if action requires approval
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || !requiresGovernanceApproval(user.role)) {
    return NextResponse.json({ error: 'Action does not require approval' }, { status: 400 })
  }
  
  // Create governance request
  const governanceAction = await db.governanceAction.create({
    data: {
      userId,
      action,
      resource,
      resourceId,
      timestamp: new Date(),
      requiresApproval: true,
      status: 'PENDING'
    }
  })
  
  // Notify approvers (in production, would send email/SMS)
  await notifyApprovers(governanceAction.id, user.role, action)
  
  return NextResponse.json({
    success: true,
    governanceActionId: governanceAction.id,
    status: 'PENDING_APPROVAL',
    message: 'Governance approval requested'
  })
}

async function approveGovernanceAction(data: any) {
  const { governanceActionId, approverId, approved, justification } = data
  
  // Verify approver authority
  const approver = await db.user.findUnique({ where: { id: approverId } })
  const governanceAction = await db.governanceAction.findUnique({ 
    where: { id: governanceActionId },
    include: { user: true }
  })
  
  if (!approver || !governanceAction) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  
  if (!canApproveAction(approver.role, governanceAction.user.role)) {
    return NextResponse.json({ error: 'Insufficient approval authority' }, { status: 403 })
  }
  
  // Update governance action
  const updatedAction = await db.governanceAction.update({
    where: { id: governanceActionId },
    data: {
      approvedBy: approverId,
      approvedAt: new Date(),
      status: approved ? 'APPROVED' : 'REJECTED'
    }
  })
  
  // If approved, execute the original action
  if (approved) {
    await executeApprovedAction(governanceAction, approverId)
  }
  
  return NextResponse.json({
    success: true,
    governanceAction: updatedAction,
    message: approved ? 'Action approved' : 'Action rejected'
  })
}

async function getPermissions() {
  const permissions: Permission[] = [
    // Dashboard permissions
    { id: 'DASHBOARD_VIEW', name: 'View Dashboard', resource: 'DASHBOARD', action: 'VIEW', description: 'View ministerial dashboard', category: 'DASHBOARD' },
    { id: 'DASHBOARD_EXPORT', name: 'Export Data', resource: 'DASHBOARD', action: 'EXPORT', description: 'Export dashboard data', category: 'DASHBOARD' },
    
    // Settlement permissions
    { id: 'SETTLEMENT_VIEW', name: 'View Settlements', resource: 'SETTLEMENT', action: 'VIEW', description: 'View settlement batches', category: 'SETTLEMENT' },
    { id: 'SETTLEMENT_APPROVE', name: 'Approve Settlements', resource: 'SETTLEMENT', action: 'APPROVE', description: 'Approve settlement batches', category: 'SETTLEMENT' },
    { id: 'SETTLEMENT_EXECUTE', name: 'Execute Settlements', resource: 'SETTLEMENT', action: 'EXECUTE', description: 'Execute settlement payments', category: 'SETTLEMENT' },
    
    // Reconciliation permissions
    { id: 'RECONCILIATION_RUN', name: 'Run Reconciliation', resource: 'RECONCILIATION', action: 'RUN', description: 'Run reconciliation engine', category: 'RECONCILIATION' },
    { id: 'RECONCILIATION_OVERRIDE', name: 'Override Reconciliation', resource: 'RECONCILIATION', action: 'OVERRIDE', description: 'Override reconciliation results', category: 'RECONCILIATION' },
    
    // Audit permissions
    { id: 'AUDIT_VIEW', name: 'View Audit Trail', resource: 'AUDIT', action: 'VIEW', description: 'View audit trail', category: 'AUDIT' },
    { id: 'AUDIT_EXPORT', name: 'Export Audit', resource: 'AUDIT', action: 'EXPORT', description: 'Export audit reports', category: 'AUDIT' },
    
    // Agency permissions
    { id: 'AGENCY_INVOICE_CREATE', name: 'Create Invoice', resource: 'AGENCY', action: 'INVOICE_CREATE', description: 'Create invoices', category: 'AGENCY' },
    { id: 'AGENCY_DISPUTE_RAISE', name: 'Raise Dispute', resource: 'AGENCY', action: 'DISPUTE_RAISE', description: 'Raise disputes', category: 'AGENCY' },
    { id: 'AGENCY_PAYMENT_APPROVE', name: 'Approve Payment', resource: 'AGENCY', action: 'PAYMENT_APPROVE', description: 'Approve payments', category: 'AGENCY' },
    
    // Admin permissions
    { id: 'ADMIN_USER_MANAGE', name: 'Manage Users', resource: 'ADMIN', action: 'USER_MANAGE', description: 'Manage user accounts', category: 'ADMIN' },
    { id: 'ADMIN_ROLE_MANAGE', name: 'Manage Roles', resource: 'ADMIN', action: 'ROLE_MANAGE', description: 'Manage user roles', category: 'ADMIN' },
    { id: 'ADMIN_SYSTEM_CONFIG', name: 'System Configuration', resource: 'ADMIN', action: 'SYSTEM_CONFIG', description: 'Configure system settings', category: 'ADMIN' }
  ]
  
  return NextResponse.json({ permissions })
}

async function getRoles() {
  const roles: Role[] = [
    {
      id: UserRole.MINISTER,
      name: 'Minister',
      description: 'Full access to all system functions and oversight capabilities',
      permissions: ['*'], // All permissions
      level: 100,
      governanceApproval: false
    },
    {
      id: UserRole.TREASURY,
      name: 'Treasury Official',
      description: 'Settlement approval and execution capabilities',
      permissions: ['DASHBOARD_VIEW', 'SETTLEMENT_VIEW', 'SETTLEMENT_APPROVE', 'SETTLEMENT_EXECUTE', 'RECONCILIATION_RUN', 'AUDIT_VIEW'],
      level: 90,
      governanceApproval: false
    },
    {
      id: UserRole.AGENCY_CFO,
      name: 'Agency CFO',
      description: 'Agency financial management and dispute resolution',
      permissions: ['DASHBOARD_VIEW', 'AGENCY_INVOICE_CREATE', 'AGENCY_DISPUTE_RAISE', 'AGENCY_PAYMENT_APPROVE', 'RECONCILIATION_RUN'],
      level: 70,
      governanceApproval: false
    },
    {
      id: UserRole.AGENCY_CLERK,
      name: 'Agency Clerk',
      description: 'Data entry and basic agency operations',
      permissions: ['DASHBOARD_VIEW', 'AGENCY_INVOICE_CREATE', 'RECONCILIATION_RUN'],
      level: 50,
      governanceApproval: false
    },
    {
      id: UserRole.AUDITOR,
      name: 'Auditor',
      description: 'Read-only access to audit trails and compliance reports',
      permissions: ['DASHBOARD_VIEW', 'AUDIT_VIEW', 'AUDIT_EXPORT'],
      level: 60,
      governanceApproval: false
    },
    {
      id: UserRole.VIEWER,
      name: 'Viewer',
      description: 'Read-only access to dashboards and reports',
      permissions: ['DASHBOARD_VIEW'],
      level: 30,
      governanceApproval: false
    }
  ]
  
  return NextResponse.json({ roles })
}

async function getUserProfile(token: string) {
  const session = await db.session.findUnique({
    where: { token, isActive: true },
    include: { 
      user: { 
        include: { party: true } 
      } 
    }
  })
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
  
  if (new Date() > session.expiresAt) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  }
  
  const permissions = await getUserPermissions(session.user.role)
  
  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      partyId: session.user.partyId,
      party: session.user.party,
      permissions,
      lastLogin: session.user.lastLogin
    },
    session: {
      token: session.token,
      expiresAt: session.expiresAt,
      isActive: session.isActive
    }
  })
}

// Helper functions
function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // In production, use bcrypt or similar
  return password === 'password' // Mock implementation
}

async function verifyMFACode(userId: string, code: string): Promise<boolean> {
  // Mock MFA verification
  return code === '123456'
}

async function getUserPermissions(role: UserRole): Promise<Permission[]> {
  // Return permissions based on role
  const roles = await getRoles()
  const userRole = roles.find(r => r.id === role)
  return userRole?.permissions || []
}

function requiresGovernanceApproval(role: UserRole): boolean {
  // Minister and Treasury actions might require additional approval
  return role === UserRole.MINISTER || role === UserRole.TREASURY
}

function canApproveAction(approverRole: UserRole, actionUserRole: UserRole): boolean {
  // Define approval hierarchy
  const approvalMatrix = {
    [UserRole.MINISTER]: [UserRole.TREASURY],
    [UserRole.TREASURY]: [UserRole.MINISTER],
    [UserRole.AUDITOR]: [UserRole.MINISTER, UserRole.TREASURY]
  }
  
  return approvalMatrix[approverRole]?.includes(actionUserRole) || false
}

async function logAccessAttempt(data: any) {
  // Log access attempts for audit trail
  await db.auditLog.create({
    data: {
      action: 'ACCESS_ATTEMPT',
      entityType: 'SESSION',
      entityId: data.userId,
      userId: data.userId,
      newValues: JSON.stringify({
        resource: data.resource,
        action: data.action,
        granted: data.granted,
        ipAddress: data.ipAddress
      })
    }
  })
}

async function logGovernanceAction(data: any) {
  // Log governance actions
  await db.governanceAction.create({
    data
  })
}

async function notifyApprovers(governanceActionId: string, role: UserRole, action: string) {
  // In production, send notifications to appropriate approvers
  console.log(`Notification sent for governance action ${governanceActionId}`)
}

async function executeApprovedAction(governanceAction: any, approverId: string) {
  // Execute the originally requested action after approval
  console.log(`Executing approved action ${governanceAction.action} for resource ${governanceAction.resourceId}`)
}

// Additional handlers
async function logout(data: any) { return { success: true } }
async function verifyMFA(data: any) { return { success: true } }
async function getGovernanceQueue() { return { queue: [] } }
async function getSessionStatus(token: string) { return { valid: true } }
async function createUser(data: any) { return { success: true, user: {} } }
async function updateUserRole(data: any) { return { success: true } }