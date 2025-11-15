'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { 
  Shield, 
  FileText, 
  Search, 
  Download, 
  RefreshCw,
  Eye,
  Filter,
  Calendar,
  User,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  Database,
  Lock,
  BarChart3,
  TrendingUp,
  Users,
  FileCheck,
  AlertCircle,
  ArrowLeft,
  Home
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AuditLog {
  id: string
  timestamp: string
  userId: string
  userName: string
  action: string
  resource: string
  resourceId: string
  details: string
  ipAddress: string
  userAgent: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'user_action' | 'system_event' | 'security' | 'compliance' | 'data_access'
  status: 'success' | 'failed' | 'pending'
  blockchainHash?: string
}

interface ComplianceReport {
  id: string
  name: string
  type: 'AML' | 'KYC' | 'Regulatory' | 'Internal' | 'External'
  status: 'compliant' | 'non_compliant' | 'pending' | 'review'
  score: number
  lastRun: string
  nextRun: string
  findings: number
  criticalFindings: number
  generatedBy: string
  approvedBy?: string
}

interface BlockchainTransaction {
  id: string
  hash: string
  timestamp: string
  type: 'payment' | 'settlement' | 'contract' | 'dispute' | 'audit'
  from: string
  to: string
  amount?: number
  currency?: string
  status: 'confirmed' | 'pending' | 'failed'
  blockNumber: number
  gasUsed: number
  confirmations: number
}

export default function AuditView() {
  const { toast } = useToast()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [complianceReports, setComplianceReports] = useState<ComplianceReport[]>([])
  const [blockchainTransactions, setBlockchainTransactions] = useState<BlockchainTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    fetchAuditData()
  }, [])

  const fetchAuditData = async () => {
    try {
      const [logsRes, reportsRes, blockchainRes] = await Promise.all([
        fetch('/api/audit/logs'),
        fetch('/api/audit/compliance-reports'),
        fetch('/api/audit/blockchain-transactions')
      ])

      if (logsRes.ok) {
        const logsData = await logsRes.json()
        setAuditLogs(logsData)
      }

      if (reportsRes.ok) {
        const reportsData = await reportsRes.json()
        setComplianceReports(reportsData)
      }

      if (blockchainRes.ok) {
        const blockchainData = await blockchainRes.json()
        setBlockchainTransactions(blockchainData)
      }
    } catch (error) {
      console.error('Error fetching audit data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load audit data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'compliant': return 'bg-green-100 text-green-800'
      case 'non_compliant': return 'bg-red-100 text-red-800'
      case 'review': return 'bg-orange-100 text-orange-800'
      case 'confirmed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'user_action': return <User className="h-4 w-4" />
      case 'system_event': return <Activity className="h-4 w-4" />
      case 'security': return <Shield className="h-4 w-4" />
      case 'compliance': return <FileCheck className="h-4 w-4" />
      case 'data_access': return <Database className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const totalLogs = auditLogs.length
  const criticalLogs = auditLogs.filter(log => log.severity === 'critical').length
  const failedLogs = auditLogs.filter(log => log.status === 'failed').length
  const compliantReports = complianceReports.filter(report => report.status === 'compliant').length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit & Compliance</h1>
          <p className="text-gray-600">Monitor system activity, compliance, and blockchain transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAuditData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" asChild>
            <Home className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Audit Logs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLogs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalLogs}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Actions</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{failedLogs}</div>
            <p className="text-xs text-muted-foreground">System failures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {complianceReports.length > 0 ? Math.round((compliantReports / complianceReports.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Reports compliant</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="audit-logs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Reports</TabsTrigger>
          <TabsTrigger value="blockchain">Blockchain Ledger</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="audit-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Immutable audit trail of all system activities</CardDescription>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Categories</option>
                  <option value="user_action">User Actions</option>
                  <option value="system_event">System Events</option>
                  <option value="security">Security</option>
                  <option value="compliance">Compliance</option>
                  <option value="data_access">Data Access</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Blockchain</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>{log.userName}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>{log.resource}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(log.category)}
                            <span className="capitalize">{log.category.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(log.severity)}>
                            {log.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.blockchainHash ? (
                            <Button variant="ghost" size="sm">
                              <Lock className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Reports</CardTitle>
              <CardDescription>Regulatory compliance monitoring and reporting</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {complianceReports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium">{report.name}</p>
                            <p className="text-sm text-gray-600">{report.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(report.status)}>
                            {report.status.replace('_', ' ')}
                          </Badge>
                          <span className="font-bold">{report.score}%</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Total Findings</p>
                          <p className="font-semibold">{report.findings}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Critical Findings</p>
                          <p className="font-semibold text-red-600">{report.criticalFindings}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Last Run</p>
                          <p className="font-semibold">{new Date(report.lastRun).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Next Run</p>
                          <p className="font-semibold">{new Date(report.nextRun).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Generated by: {report.generatedBy}</span>
                        {report.approvedBy && <span>Approved by: {report.approvedBy}</span>}
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Report
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blockchain" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blockchain Ledger</CardTitle>
              <CardDescription>Immutable blockchain transaction records</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Block</TableHead>
                      <TableHead>Confirmations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockchainTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">
                          {new Date(tx.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="capitalize">{tx.type}</TableCell>
                        <TableCell className="font-mono text-sm">{tx.from.slice(0, 8)}...</TableCell>
                        <TableCell className="font-mono text-sm">{tx.to.slice(0, 8)}...</TableCell>
                        <TableCell>
                          {tx.amount && tx.currency ? 
                            `${tx.currency} ${tx.amount.toLocaleString()}` : 
                            '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(tx.status)}>
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{tx.blockNumber}</TableCell>
                        <TableCell>{tx.confirmations}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Activity Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">User Actions</span>
                    <span className="font-semibold">{auditLogs.filter(l => l.category === 'user_action').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">System Events</span>
                    <span className="font-semibold">{auditLogs.filter(l => l.category === 'system_event').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Security Events</span>
                    <span className="font-semibold">{auditLogs.filter(l => l.category === 'security').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Compliance Checks</span>
                    <span className="font-semibold">{auditLogs.filter(l => l.category === 'compliance').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Data Access</span>
                    <span className="font-semibold">{auditLogs.filter(l => l.category === 'data_access').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Compliance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Average Compliance Score</span>
                    <span className="font-semibold text-green-600">96.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Critical Issues Resolved</span>
                    <span className="font-semibold text-blue-600">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Audit Trail Integrity</span>
                    <span className="font-semibold text-green-600">100%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Blockchain Verification</span>
                    <span className="font-semibold text-green-600">1,247 verified</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Regulatory Filings</span>
                    <span className="font-semibold">24/24 on-time</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}