'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  TrendingUp,
  FileText,
  Eye,
  Download,
  RefreshCw,
  Calendar,
  Users,
  Receipt,
  CreditCard,
  AlertCircle,
  BarChart3,
  PieChart,
  Filter,
  Search,
  ArrowLeft,
  Home
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AgingReport {
  id: string
  invoiceId: string
  contractId: string
  counterparty: string
  amount: number
  currency: string
  agingBucket: '0-30' | '31-60' | '61-90' | '90+'
  dueDate: string
  issueDate: string
  status: 'current' | 'overdue' | 'disputed' | 'paid'
  daysOutstanding: number
}

interface PaymentApproval {
  id: string
  invoiceId: string
  amount: number
  currency: string
  payer: string
  receiver: string
  submittedDate: string
  scheduledDate: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'approved' | 'rejected' | 'processed'
  verificationScore: number
  supportingDocs: number
}

interface DisputeItem {
  id: string
  invoiceId: string
  type: 'quantity' | 'price' | 'quality' | 'delivery' | 'other'
  description: string
  amount: number
  currency: string
  status: 'open' | 'investigating' | 'resolved' | 'escalated'
  createdDate: string
  resolutionDate?: string
  assignedTo: string
  priority: 'low' | 'medium' | 'high'
}

export default function AgencyCFOWorkspace() {
  const { toast } = useToast()
  const [agingReport, setAgingReport] = useState<AgingReport[]>([])
  const [paymentApprovals, setPaymentApprovals] = useState<PaymentApproval[]>([])
  const [disputes, setDisputes] = useState<DisputeItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAgency, setSelectedAgency] = useState<string>('all')

  useEffect(() => {
    fetchCFOData()
  }, [selectedAgency])

  const fetchCFOData = async () => {
    try {
      const [agingRes, paymentsRes, disputesRes] = await Promise.all([
        fetch(`/api/cfo/aging-report?agency=${selectedAgency}`),
        fetch(`/api/cfo/payment-approvals?agency=${selectedAgency}`),
        fetch(`/api/cfo/disputes?agency=${selectedAgency}`)
      ])

      if (agingRes.ok) {
        const agingData = await agingRes.json()
        setAgingReport(agingData)
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json()
        setPaymentApprovals(paymentsData)
      }

      if (disputesRes.ok) {
        const disputesData = await disputesRes.json()
        setDisputes(disputesData)
      }
    } catch (error) {
      console.error('Error fetching CFO data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load CFO workspace data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprovePayment = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/cfo/payment-approvals/${paymentId}/approve`, {
        method: 'POST'
      })

      if (response.ok) {
        toast({
          title: 'Payment Approved',
          description: 'The payment has been approved for processing'
        })
        fetchCFOData()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve payment',
        variant: 'destructive'
      })
    }
  }

  const handleRejectPayment = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/cfo/payment-approvals/${paymentId}/reject`, {
        method: 'POST'
      })

      if (response.ok) {
        toast({
          title: 'Payment Rejected',
          description: 'The payment has been rejected'
        })
        fetchCFOData()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject payment',
        variant: 'destructive'
      })
    }
  }

  const formatCurrency = (amount: number, currency: string = 'GHS') => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getAgingBucketColor = (bucket: string) => {
    switch (bucket) {
      case '0-30': return 'bg-green-100 text-green-800'
      case '31-60': return 'bg-yellow-100 text-yellow-800'
      case '61-90': return 'bg-orange-100 text-orange-800'
      case '90+': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const totalOutstanding = agingReport.reduce((sum, item) => sum + item.amount, 0)
  const pendingApprovals = paymentApprovals.filter(item => item.status === 'pending').length
  const openDisputes = disputes.filter(item => item.status === 'open').length
  const overdueAmount = agingReport.filter(item => item.status === 'overdue').reduce((sum, item) => sum + item.amount, 0)

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
          <h1 className="text-3xl font-bold text-gray-900">Agency CFO Workspace</h1>
          <p className="text-gray-600">Manage aging reports, payment approvals, and disputes</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={selectedAgency} 
            onChange={(e) => setSelectedAgency(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">All Agencies</option>
            <option value="ECG">ECG</option>
            <option value="VRA">VRA</option>
            <option value="GNPC">GNPC</option>
            <option value="GRIDCo">GRIDCo</option>
            <option value="BOST">BOST</option>
          </select>
          <Button variant="outline" onClick={fetchCFOData}>
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
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">Across all agencies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Awaiting your approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{openDisputes}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(overdueAmount)}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="aging-report" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="aging-report">Aging Report</TabsTrigger>
          <TabsTrigger value="payment-approvals">Payment Approvals</TabsTrigger>
          <TabsTrigger value="disputes">Dispute Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="aging-report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accounts Receivable Aging</CardTitle>
              <CardDescription>Track outstanding invoices by aging period</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Counterparty</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Aging Bucket</TableHead>
                      <TableHead>Days Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agingReport.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.invoiceId}</TableCell>
                        <TableCell>{item.counterparty}</TableCell>
                        <TableCell>{formatCurrency(item.amount, item.currency)}</TableCell>
                        <TableCell>
                          <Badge className={getAgingBucketColor(item.agingBucket)}>
                            {item.agingBucket} days
                          </Badge>
                        </TableCell>
                        <TableCell>{item.daysOutstanding}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'overdue' ? 'destructive' : 'default'}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(item.dueDate).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Approvals</CardTitle>
              <CardDescription>Review and approve pending payments</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {paymentApprovals.map((payment) => (
                    <div key={payment.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getPriorityColor(payment.priority)}`} />
                          <div>
                            <p className="font-medium">{payment.payer} → {payment.receiver}</p>
                            <p className="text-sm text-gray-600">{payment.invoiceId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={payment.status === 'pending' ? 'default' : 'secondary'}>
                            {payment.status}
                          </Badge>
                          <span className="font-bold">{formatCurrency(payment.amount, payment.currency)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Submitted: {new Date(payment.submittedDate).toLocaleDateString()}</span>
                        <span>Scheduled: {new Date(payment.scheduledDate).toLocaleDateString()}</span>
                        <span>Verification Score: {payment.verificationScore}%</span>
                        <span>Documents: {payment.supportingDocs}</span>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                        {payment.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => handleApprovePayment(payment.id)}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleRejectPayment(payment.id)}>
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dispute Management</CardTitle>
              <CardDescription>Track and resolve invoice disputes</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {disputes.map((dispute) => (
                    <div key={dispute.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getPriorityColor(dispute.priority)}`} />
                          <div>
                            <p className="font-medium">{dispute.invoiceId}</p>
                            <p className="text-sm text-gray-600">{dispute.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={dispute.status === 'open' ? 'destructive' : 'secondary'}>
                            {dispute.status}
                          </Badge>
                          <span className="font-bold">{formatCurrency(dispute.amount, dispute.currency)}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700">{dispute.description}</p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Created: {new Date(dispute.createdDate).toLocaleDateString()}</span>
                        <span>Assigned to: {dispute.assignedTo}</span>
                        {dispute.resolutionDate && (
                          <span>Resolved: {new Date(dispute.resolutionDate).toLocaleDateString()}</span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        {dispute.status === 'open' && (
                          <Button size="sm">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Aging Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['0-30', '31-60', '61-90', '90+'].map(bucket => {
                    const bucketTotal = agingReport
                      .filter(item => item.agingBucket === bucket)
                      .reduce((sum, item) => sum + item.amount, 0)
                    const percentage = totalOutstanding > 0 ? (bucketTotal / totalOutstanding) * 100 : 0
                    
                    return (
                      <div key={bucket} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{bucket} days</span>
                          <span>{formatCurrency(bucketTotal)}</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <div className="text-xs text-gray-600 text-right">{percentage.toFixed(1)}%</div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Payment Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Average Days Outstanding</span>
                    <span className="font-semibold">45 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Collection Rate</span>
                    <span className="font-semibold text-green-600">78%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Dispute Resolution Rate</span>
                    <span className="font-semibold text-blue-600">92%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Payment Processing Time</span>
                    <span className="font-semibold">3.2 days</span>
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