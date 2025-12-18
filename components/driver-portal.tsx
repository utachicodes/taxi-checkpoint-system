"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Shield, Search, AlertCircle } from "lucide-react"
import type { Driver, Vehicle, CheckpointRecord } from "@/lib/types"

export default function DriverPortal() {
  const [licenseNumber, setLicenseNumber] = useState("")
  const [driver, setDriver] = useState<Driver | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [records, setRecords] = useState<CheckpointRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleSearch = async () => {
    setIsLoading(true)
    setDriver(null)
    setVehicle(null)
    setRecords([])

    try {
      const { data: driverData } = await supabase
        .from("drivers")
        .select("*")
        .eq("license_number", licenseNumber.toUpperCase())
        .single()

      if (driverData) {
        setDriver(driverData as Driver)

        const { data: vehicleData } = await supabase
          .from("vehicles")
          .select("*")
          .eq("driver_id", driverData.id)
          .single()

        if (vehicleData) setVehicle(vehicleData as Vehicle)

        const { data: recordsData } = await supabase
          .from("checkpoint_records")
          .select(`
            *,
            checkpoint:checkpoints(*)
          `)
          .eq("driver_id", driverData.id)
          .order("created_at", { ascending: false })

        if (recordsData) setRecords(recordsData as unknown as CheckpointRecord[])
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="font-bold text-lg">Driver Portal</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Check Your Status</CardTitle>
            <CardDescription>Enter your license number to view your records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="license">License Number</Label>
                <Input
                  id="license"
                  placeholder="DL-2024-001"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading} className="mt-auto">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {driver && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600">Full Name</p>
                  <p className="font-medium">{driver.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">License Number</p>
                  <p className="font-medium">{driver.license_number}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">License Status</p>
                  <Badge variant={driver.license_status === "active" ? "default" : "destructive"}>
                    {driver.license_status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Contact</p>
                  <p className="font-medium">{driver.phone}</p>
                </div>
              </CardContent>
            </Card>

            {vehicle && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Vehicle</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Plate Number</p>
                      <p className="font-medium">{vehicle.plate_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Make & Model</p>
                      <p className="font-medium">
                        {vehicle.make} {vehicle.model}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Year</p>
                      <p className="font-medium">{vehicle.year}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Color</p>
                      <p className="font-medium">{vehicle.color}</p>
                    </div>
                    {vehicle.insurance_expiry && (
                      <div>
                        <p className="text-sm text-slate-600">Insurance Expiry</p>
                        <p className="font-medium">{new Date(vehicle.insurance_expiry).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Checkpoint History</CardTitle>
                <CardDescription>Your recent checkpoint encounters</CardDescription>
              </CardHeader>
              <CardContent>
                {records.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No checkpoint records found</p>
                ) : (
                  <div className="space-y-3">
                    {records.map((record) => (
                      <div key={record.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{record.checkpoint?.name}</p>
                            <p className="text-sm text-slate-600">{record.checkpoint?.location}</p>
                          </div>
                          <Badge variant={record.record_status === "clear" ? "default" : "destructive"}>
                            {record.record_status}
                          </Badge>
                        </div>
                        {record.notes && <p className="text-sm text-slate-600 mt-2">{record.notes}</p>}
                        {record.violation_details && (
                          <div className="mt-2 p-2 bg-red-50 rounded flex gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-900">{record.violation_details}</p>
                          </div>
                        )}
                        {record.fine_amount && (
                          <p className="text-sm font-medium text-red-600 mt-2">
                            Fine: ${record.fine_amount.toFixed(2)}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">{new Date(record.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
