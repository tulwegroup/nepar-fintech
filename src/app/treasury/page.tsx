'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  TrendingUp,
  Shield,
  Eye,
  Download,
  RefreshCw,
  ArrowRight,
  Lock,
  Unlock,
  FileText,
  BarChart3,
  PieChart,
  Activity,
  ArrowLeft,
  Home
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SettlementQueueItem {
  id: string
  contractId: string
  parties: {
    payer: string
    receiver: string
  }
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  submittedAt: string
  estimatedCompletion: string
  blockchainTx?: string
  verificationScore: number
}

interface EscrowAccount {
  id: string
  name: string
  balance: number
  currency: string
  status: 'active' | 'frozen' | 'pending'
  lastActivity: string
  reservedAmount: number
  availableBalance: number
}

interface LiquidityForecast {
  period: string
  inflow: number
  outflow: number
  netFlow: number
  projectedBalance: number
  confidence: number
}

export default function TreasuryControlRoom() {
  const { toast } = useToast()
  const [settlementQueue, setSettlementQueue] = useState<SettlementQueueItem[]>([])
  const [escrowAccounts, setEscrowAccounts] = useState<EscrowAccount[]>([])
  const [liquidityForecast, setLiquidityForecast] = useState<LiquidityForecast[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedQueueItem, setSelectedQueueItem] = useState<SettlementQueueItem | null>(null)

  useEffect(() => {
    fetchTreasuryData()
  }, [])

  const fetchTreasuryData = async () => {
    try {
      const [queueRes, escrowRes, forecastRes] = await Promise.all([
        fetch('/api/treasury/settlement-queue'),
        fetch('/api/treasury/escrow-accounts'),
        fetch('/api/treasury/liquidity-forecast')
      ])

      if (queueRes.ok) {
        const queueData = await queueRes.json()
        setSettlementQueue(queueData)
      }

      if (escrowRes.ok) {
        const escrowData = await escrowRes.json()
        setEscrowAccounts(escrowData)
      }

      if (forecastRes.ok) {
        const forecastData = await forecastRes.json()
        setLiquidityForecast(forecastData)
      }
    } catch (error) {
      console.error('Error fetching treasury data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load treasury data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveSettlement = async (itemId: string) => {
    try {
      const response = await fetch(`/api/treasury/settlement-queue/${itemId}/approve`, {
        method: 'POST'
      })

      if (response.ok) {
        toast({
          title: 'Settlement Approved',
          description: 'The settlement has been approved and queued for processing'
        })
        fetchTreasuryData()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve settlement',
        variant: 'destructive'
      })
    }
  }

  const handleFreezeEscrow = async (accountId: string) => {
    try {
      const response = await fetch(`/api/treasury/escrow-accounts/${accountId}/freeze`, {
        method: 'POST'
      })

      if (response.ok) {
        toast({
          title: 'Account Frozen',
          description: 'The escrow account has been frozen for security'
        })
        fetchTreasuryData()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to freeze account',
        variant: 'destructive'
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
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

  const totalEscrowBalance = escrowAccounts.reduce((sum, account) => sum + account.balance, 0)
  const pendingSettlements = settlementQueue.filter(item => item.status === 'pending').length
  const criticalSettlements = settlementQueue.filter(item => item.priority === 'critical').length

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
          <h1 className="text-3xl font-bold text-gray-900">Treasury Control Room</h1>
          <p className="text-gray-600">Manage settlement queues, escrow accounts, and liquidity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTreasuryData}>
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
            <CardTitle className="text-sm font-medium">Total Escrow Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEscrowBalance)}</div>
            <p className="text-xs text-muted-foreground">Across all accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Settlements</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingSettlements}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalSettlements}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">98.5%</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settlement-queue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settlement-queue">Settlement Queue</TabsTrigger>
          <TabsTrigger value="escrow">Escrow Accounts</TabsTrigger>
          <TabsTrigger value="liquidity">Liquidity Forecast</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="settlement-queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Settlement Queue</CardTitle>
              <CardDescription>Manage and approve pending settlements</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {settlementQueue.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getPriorityColor(item.priority)}`} />
                          <div>
                            <p className="font-medium">{item.parties.payer} → {item.parties.receiver}</p>
                            <p className="text-sm text-gray-600">{item.contractId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                          <span className="font-bold">{formatCurrency(item.amount, item.currency)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Submitted: {new Date(item.submittedAt).toLocaleDateString()}</span>
                        <span>Est. completion: {new Date(item.estimatedCompletion).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Verification Score:</span>
                          <Progress value={item.verificationScore} className="w-20" />
                          <span className="text-sm">{item.verificationScore}%</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedQueueItem(item)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                          {item.status === 'pending' && (
                            <Button size="sm" onClick={() => handleApproveSettlement(item.id)}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escrow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Escrow Accounts</CardTitle>
              <CardDescription>Monitor and manage escrow account balances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {escrowAccounts.map((account) => (
                  <Card key={account.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{account.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          {account.status === 'active' ? (
                            <Unlock className="h-4 w-4 text-green-600" />
                          ) : (
                            <Lock className="h-4 w-4 text-red-600" />
                          )}
                          <Badge variant={account.status === 'active' ? 'default' : 'destructive'}>
                            {account.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Total Balance</p>
                        <p className="text-2xl font-bold">{formatCurrency(account.balance, account.currency)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Available Balance</p>
                        <p className="text-lg font-semibold text-green-600">
                          {formatCurrency(account.availableBalance, account.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Reserved Amount</p>
                        <p className="text-lg font-semibold text-orange-600">
                          {formatCurrency(account.reservedAmount, account.currency)}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        Last activity: {new Date(account.lastActivity).toLocaleDateString()}
                      </div>
                      {account.status === 'active' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleFreezeEscrow(account.id)}
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Freeze Account
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="liquidity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Liquidity Forecast</CardTitle>
              <CardDescription>12-month cash flow projections and analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {liquidityForecast.map((forecast, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{forecast.period}</h4>
                        <Badge variant={forecast.netFlow >= 0 ? 'default' : 'destructive'}>
                          {forecast.netFlow >= 0 ? 'Surplus' : 'Deficit'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Inflow</p>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(forecast.inflow)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Outflow</p>
                          <p className="font-semibold text-red-600">
                            {formatCurrency(forecast.outflow)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Net Flow</p>
                          <p className={`font-semibold ${forecast.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(forecast.netFlow)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Projected Balance</p>
                          <p className="font-bold">
                            {formatCurrency(forecast.projectedBalance)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm">
                          <span>Confidence Level</span>
                          <span>{forecast.confidence}%</span>
                        </div>
                        <Progress value={forecast.confidence} className="mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Monitor</CardTitle>
              <CardDescription>Regulatory compliance and audit tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      AML Compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Screening Pass Rate</span>
                        <span className="font-semibold text-green-600">100%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Flagged Transactions</span>
                        <span className="font-semibold">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Review</span>
                        <span className="text-sm text-gray-600">Today</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Regulatory Reporting
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Reports Filed</span>
                        <span className="font-semibold">24/24</span>
                      </div>
                      <div className="flex justify-between">
                        <span>On-time Submission</span>
                        <span className="font-semibold text-green-600">100%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Next Deadline</span>
                        <span className="text-sm text-gray-600">15 days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                      Audit Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Audit Score</span>
                        <span className="font-semibold text-green-600">98.5%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Open Findings</span>
                        <span className="font-semibold">2</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Audit</span>
                        <span className="text-sm text-gray-600">30 days ago</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}