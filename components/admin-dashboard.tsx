"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Shield, Users, MapPin, AlertCircle, LogOut, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Operator, CheckpointRecord, Checkpoint, Driver } from "@/lib/types"

export default function AdminDashboard({ operator }: { operator: Operator }) {
  const [stats, setStats] = useState({ drivers: 0, vehicles: 0, records: 0, violations: 0 })
  const [recentRecords, setRecentRecords] = useState<CheckpointRecord[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // Load stats
    const [driversCount, vehiclesCount, recordsCount, violationsCount] = await Promise.all([
      supabase.from("drivers").select("*", { count: "exact", head: true }),
      supabase.from("vehicles").select("*", { count: "exact", head: true }),
      supabase.from("checkpoint_records").select("*", { count: "exact", head: true }),
      supabase.from("violations").select("*", { count: "exact", head: true }),
    ])

    setStats({
      drivers: driversCount.count || 0,
      vehicles: vehiclesCount.count || 0,
      records: recordsCount.count || 0,
      violations: violationsCount.count || 0,
    })

    // Load recent records
    const { data: records } = await supabase
      .from("checkpoint_records")
      .select(`
        *,
        driver:drivers(*),
        vehicle:vehicles(*),
        checkpoint:checkpoints(*),
        operator:operators(*)
      `)
      .order("created_at", { ascending: false })
      .limit(20)

    if (records) setRecentRecords(records as unknown as CheckpointRecord[])

    // Load checkpoints
    const { data: checkpointsData } = await supabase.from("checkpoints").select("*").order("name")

    if (checkpointsData) setCheckpoints(checkpointsData as Checkpoint[])

    // Load drivers
    const { data: driversData } = await supabase.from("drivers").select("*").order("full_name")

    if (driversData) setDrivers(driversData as Driver[])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="font-bold text-lg">Admin Portal</h1>
              <p className="text-sm text-slate-600">{operator.full_name}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
              <Users className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.drivers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
              <MapPin className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.vehicles}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Checkpoint Records</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.records}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Violations</CardTitle>
              <AlertCircle className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.violations}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="records" className="space-y-6">
          <TabsList>
            <TabsTrigger value="records">Recent Records</TabsTrigger>
            <TabsTrigger value="checkpoints">Checkpoints</TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
          </TabsList>

          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle>Recent Checkpoint Records</CardTitle>
                <CardDescription>Latest checkpoint entries across all locations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentRecords.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{record.driver?.full_name}</p>
                          <p className="text-sm text-slate-600">
                            {record.vehicle?.plate_number} - {record.vehicle?.make} {record.vehicle?.model}
                          </p>
                          <p className="text-sm text-slate-500">{record.checkpoint?.name}</p>
                        </div>
                        <Badge variant={record.record_status === "clear" ? "default" : "destructive"}>
                          {record.record_status}
                        </Badge>
                      </div>
                      {record.notes && <p className="text-sm text-slate-600 mt-2">{record.notes}</p>}
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(record.created_at).toLocaleString()} - {record.operator?.full_name}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkpoints">
            <Card>
              <CardHeader>
                <CardTitle>Active Checkpoints</CardTitle>
                <CardDescription>Manage checkpoint locations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {checkpoints.map((checkpoint) => (
                    <div key={checkpoint.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{checkpoint.name}</p>
                          <p className="text-sm text-slate-600">{checkpoint.location}</p>
                          <Badge className="mt-2" variant={checkpoint.is_active ? "default" : "secondary"}>
                            {checkpoint.checkpoint_type}
                          </Badge>
                        </div>
                        <Badge variant={checkpoint.is_active ? "default" : "secondary"}>
                          {checkpoint.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drivers">
            <Card>
              <CardHeader>
                <CardTitle>Registered Drivers</CardTitle>
                <CardDescription>View all drivers in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {drivers.map((driver) => (
                    <div key={driver.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{driver.full_name}</p>
                          <p className="text-sm text-slate-600">{driver.license_number}</p>
                          <p className="text-sm text-slate-500">{driver.phone}</p>
                        </div>
                        <Badge variant={driver.license_status === "active" ? "default" : "destructive"}>
                          {driver.license_status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
