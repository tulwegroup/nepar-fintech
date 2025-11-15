'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  FileText,
  DollarSign,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Download,
  RefreshCw,
  ExternalLink
} from 'lucide-react'

// Types for dashboard data
interface KPIData {
  totalArrears: number
  nettedThisPeriod: number
  dso: number
  liquidityIndex: number
  disputeCount: number
  reconciliationRate: number
  cashFlowOptimization: number
}

interface AgencyPerformance {
  name: string
  arrears: number
  payments: number
  efficiency: number
  status: string
}

interface DebtChain {
  id: number
  chain: string
  amount: number
  status: string
}

interface RecentActivity {
  id: number
  type: string
  description: string
  amount: number
  time: string
  status: string
}

interface DashboardData {
  kpis: KPIData
  agencyPerformance: AgencyPerformance[]
  topDebtChains: DebtChain[]
  recentActivities: RecentActivity[]
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000000) {
    return `₵${(amount / 1000000000).toFixed(2)}B`
  } else if (amount >= 1000000) {
    return `₵${(amount / 1000000).toFixed(1)}M`
  } else if (amount >= 1000) {
    return `₵${(amount / 1000).toFixed(1)}K`
  }
  return `₵${amount.toFixed(0)}`
}

function getStatusColor(status: string): string {
  switch (status) {
    case "critical": return "bg-red-500"
    case "high": return "bg-orange-500"
    case "medium": return "bg-yellow-500"
    case "low": return "bg-green-500"
    case "success": return "text-green-600"
    case "warning": return "text-yellow-600"
    case "error": return "text-red-600"
    default: return "bg-gray-500"
  }
}

function KPICard({ title, value, change, icon: Icon, format = "currency", isLoading = false }: {
  title: string
  value: number | string
  change?: number
  icon: any
  format?: "currency" | "percentage" | "days" | "number"
  isLoading?: boolean
}) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val
    switch (format) {
      case "currency": return formatCurrency(val)
      case "percentage": return `${val.toFixed(1)}%`
      case "days": return `${val} days`
      case "number": return val.toLocaleString()
      default: return val.toString()
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">...</div>
          <div className="flex items-center text-xs text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground">
            {change > 0 ? (
              <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={change > 0 ? "text-green-600" : "text-red-600"}>
              {Math.abs(change).toFixed(1)}%
            </span>
            <span className="ml-1">from last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function NEPARDashboard() {
  const [selectedView, setSelectedView] = useState('minister')
  const [isLoading, setIsLoading] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/dashboard?view=${selectedView}`)
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [selectedView])

  const handleRefresh = () => {
    fetchDashboardData()
  }

  const handleRunReconciliation = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          periodEnd: new Date().toISOString()
        })
      })
      
      if (response.ok) {
        await fetchDashboardData() // Refresh data
      }
    } catch (error) {
      console.error('Error running reconciliation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRunNetting = async () => {
    try {
      setIsLoading(true)
      const period = new Date().toISOString().slice(0, 7) // YYYY-MM format
      const response = await fetch('/api/netting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, fxRate: 1.0 })
      })
      
      if (response.ok) {
        await fetchDashboardData() // Refresh data
      }
    } catch (error) {
      console.error('Error running netting:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRunAIReconciliation = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/reconciliation-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          periodEnd: new Date().toISOString(),
          useAI: true
        })
      })
      
      if (response.ok) {
        await fetchDashboardData() // Refresh data
      }
    } catch (error) {
      console.error('Error running AI reconciliation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBlockchainVerification = async () => {
    try {
      const response = await fetch('/api/blockchain?action=GET_LEDGER_SNAPSHOT')
      if (response.ok) {
        const data = await response.json()
        console.log('Blockchain Ledger:', data)
      }
    } catch (error) {
      console.error('Error fetching blockchain data:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6" />
              <h1 className="text-xl font-semibold">NEPAR</h1>
              <Badge variant="secondary" className="text-xs">
                National Energy Payment & Arrears Reconciliation
              </Badge>
            </div>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            {selectedView === 'minister' && (
              <>
                <Button variant="outline" size="sm" onClick={handleRunReconciliation} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Run Reconciliation
                </Button>
                <Button variant="outline" size="sm" onClick={handleRunAIReconciliation} disabled={isLoading}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Run AI Reconciliation
                </Button>
                <Button variant="outline" size="sm" onClick={handleRunNetting} disabled={isLoading}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Run Netting
                </Button>
                <Button variant="outline" size="sm" onClick={handleBlockchainVerification} disabled={isLoading}>
                  <Activity className="h-4 w-4 mr-2" />
                  Verify Blockchain
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="minister">Minister's Cockpit</TabsTrigger>
            <TabsTrigger value="treasury">Treasury Control</TabsTrigger>
            <TabsTrigger value="agency">Agency Workspace</TabsTrigger>
            <TabsTrigger value="audit">Audit View</TabsTrigger>
          </TabsList>

          {/* Minister's Cockpit */}
          <TabsContent value="minister" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KPICard
                title="Total Arrears"
                value={dashboardData?.kpis.totalArrears || 0}
                change={-2.3}
                icon={TrendingUp}
                isLoading={isLoading}
              />
              <KPICard
                title="Netted This Period"
                value={dashboardData?.kpis.nettedThisPeriod || 0}
                change={15.7}
                icon={DollarSign}
                isLoading={isLoading}
              />
              <KPICard
                title="Days Sales Outstanding"
                value={dashboardData?.kpis.dso || 0}
                change={-5.2}
                icon={Clock}
                format="days"
                isLoading={isLoading}
              />
              <KPICard
                title="Liquidity Index"
                value={dashboardData?.kpis.liquidityIndex || 0}
                change={8.4}
                icon={Activity}
                format="percentage"
                isLoading={isLoading}
              />
            </div>

            {/* Two Column Layout */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Top Debt Chains */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Top Cross-Debt Chains
                  </CardTitle>
                  <CardDescription>
                    Critical payment chains requiring attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(dashboardData?.topDebtChains || []).map((chain) => (
                      <div key={chain.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(chain.status)}`}></div>
                          <div>
                            <p className="font-medium">{chain.chain}</p>
                            <p className="text-sm text-muted-foreground">{formatCurrency(chain.amount)}</p>
                          </div>
                        </div>
                        <Badge variant={chain.status === 'critical' ? 'destructive' : 'secondary'}>
                          {chain.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Recent Activities
                  </CardTitle>
                  <CardDescription>
                    Latest system events and transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(dashboardData?.recentActivities || []).map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className={`mt-1 ${getStatusColor(activity.status)}`}>
                          {activity.type === 'settlement' && <CheckCircle className="h-4 w-4" />}
                          {activity.type === 'dispute' && <AlertTriangle className="h-4 w-4" />}
                          {activity.type === 'reconciliation' && <FileText className="h-4 w-4" />}
                          {activity.type === 'payment' && <DollarSign className="h-4 w-4" />}
                          {activity.type === 'alert' && <AlertTriangle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{activity.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-muted-foreground">{activity.time}</span>
                            {activity.amount > 0 && (
                              <span className="text-xs font-medium">{formatCurrency(activity.amount)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Agency Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Agency Performance Overview
                </CardTitle>
                <CardDescription>
                  Reconciliation efficiency and payment status by agency
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(dashboardData?.agencyPerformance || []).map((agency) => (
                    <div key={agency.name} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{agency.name}</h4>
                          <Badge variant="outline">{agency.efficiency.toFixed(1)}% efficient</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Arrears:</span>
                            <span className="ml-2 font-medium">{formatCurrency(agency.arrears)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Payments:</span>
                            <span className="ml-2 font-medium">{formatCurrency(agency.payments)}</span>
                          </div>
                        </div>
                        <Progress value={agency.efficiency} className="mt-2" />
                      </div>
                      <div className={`ml-4 w-3 h-3 rounded-full ${getStatusColor(agency.status)}`}></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Treasury Control Room */}
          <TabsContent value="treasury" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Treasury Control Room
                </CardTitle>
                <CardDescription>
                  Complete settlement queue and escrow management system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <KPICard title="Settlement Queue" value={12} icon={Clock} format="number" isLoading={isLoading} />
                  <KPICard title="Escrow Balance" value={2340000000} icon={DollarSign} isLoading={isLoading} />
                  <KPICard title="Pending Approvals" value={3} icon={FileText} format="number" isLoading={isLoading} />
                </div>
                
                <div className="text-center py-8">
                  <Button asChild size="lg">
                    <a href="/treasury" className="flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Treasury Control Room
                    </a>
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Access comprehensive settlement management, escrow monitoring, and liquidity forecasting
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agency Workspace */}
          <TabsContent value="agency" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Agency CFO Workspace
                </CardTitle>
                <CardDescription>
                  Complete aging reports, payment approvals, and dispute management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <KPICard title="Unmatched Items" value={23} icon={AlertTriangle} format="number" isLoading={isLoading} />
                  <KPICard title="Expected Receipts" value={567000000} icon={DollarSign} isLoading={isLoading} />
                  <KPICard title="Dispute Console" value={8} icon={FileText} format="number" isLoading={isLoading} />
                </div>
                
                <div className="text-center py-8">
                  <Button asChild size="lg">
                    <a href="/cfo" className="flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Agency CFO Workspace
                    </a>
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Access aging reports, payment approvals, and dispute resolution tools
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit View */}
          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Audit & Compliance View
                </CardTitle>
                <CardDescription>
                  Immutable audit trail and compliance monitoring
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <KPICard title="Reconciliation Coverage" value={94.2} icon={CheckCircle} format="percentage" isLoading={isLoading} />
                  <KPICard title="Exceptions by Reason" value={15} icon={AlertTriangle} format="number" isLoading={isLoading} />
                  <KPICard title="Audit Trail Entries" value={12847} icon={FileText} format="number" isLoading={isLoading} />
                </div>
                
                <div className="text-center py-8">
                  <Button asChild size="lg">
                    <a href="/audit" className="flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Audit & Compliance View
                    </a>
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Access audit logs, compliance reports, and blockchain verification
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}