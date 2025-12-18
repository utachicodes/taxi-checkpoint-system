"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Shield, Search, LogOut, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import type { Operator, Driver, Vehicle, CheckpointRecord, RecordStatus } from "@/lib/types"

export default function OperatorDashboard({ operator }: { operator: Operator }) {
  const [searchType, setSearchType] = useState<"license" | "plate">("license")
  const [searchQuery, setSearchQuery] = useState("")
  const [driver, setDriver] = useState<Driver | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [recordStatus, setRecordStatus] = useState<RecordStatus>("clear")
  const [notes, setNotes] = useState("")
  const [violationDetails, setViolationDetails] = useState("")
  const [fineAmount, setFineAmount] = useState("")
  const [recentRecords, setRecentRecords] = useState<CheckpointRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadRecentRecords()
  }, [])

  const loadRecentRecords = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from("checkpoint_records")
      .select(`
        *,
        driver:drivers(*),
        vehicle:vehicles(*),
        checkpoint:checkpoints(*)
      `)
      .eq("operator_id", operator.id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (data) setRecentRecords(data as unknown as CheckpointRecord[])
    setIsLoading(false)
  }

  const handleSearch = async () => {
    setIsSearching(true)
    setDriver(null)
    setVehicle(null)

    try {
      if (searchType === "license") {
        const { data: driverData } = await supabase
          .from("drivers")
          .select("*")
          .eq("license_number", searchQuery.toUpperCase())
          .single()

        if (driverData) {
          setDriver(driverData as Driver)

          const { data: vehicleData } = await supabase
            .from("vehicles")
            .select("*")
            .eq("driver_id", driverData.id)
            .single()

          if (vehicleData) setVehicle(vehicleData as Vehicle)

          toast({
            title: "Conducteur trouvé",
            description: `${driverData.full_name} - ${driverData.license_number}`,
          })
        } else {
          toast({
            title: "Aucun résultat",
            description: "Aucun conducteur trouvé avec ce numéro de permis",
            variant: "destructive",
          })
        }
      } else {
        const { data: vehicleData } = await supabase
          .from("vehicles")
          .select("*, driver:drivers(*)")
          .eq("plate_number", searchQuery.toUpperCase())
          .single()

        if (vehicleData) {
          setVehicle(vehicleData as Vehicle)
          setDriver(vehicleData.driver as Driver)

          toast({
            title: "Véhicule trouvé",
            description: `${vehicleData.plate_number} - ${vehicleData.make} ${vehicleData.model}`,
          })
        } else {
          toast({
            title: "Aucun résultat",
            description: "Aucun véhicule trouvé avec cette plaque d'immatriculation",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("[v0] Search error:", error)
      toast({
        title: "Erreur de recherche",
        description: "Une erreur s'est produite lors de la recherche",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmitRecord = async () => {
    if (!driver || !vehicle || !operator.checkpoint_id) return

    setIsLoading(true)
    try {
      const { error } = await supabase.from("checkpoint_records").insert({
        checkpoint_id: operator.checkpoint_id,
        operator_id: operator.id,
        driver_id: driver.id,
        vehicle_id: vehicle.id,
        record_status: recordStatus,
        notes: notes || null,
        violation_details: violationDetails || null,
        fine_amount: fineAmount ? Number.parseFloat(fineAmount) : null,
      })

      if (error) throw error

      toast({
        title: "Enregistrement réussi",
        description: "Le contrôle a été enregistré avec succès",
      })

      // Reset form
      setSearchQuery("")
      setDriver(null)
      setVehicle(null)
      setRecordStatus("clear")
      setNotes("")
      setViolationDetails("")
      setFineAmount("")

      // Reload recent records
      loadRecentRecords()
    } catch (error) {
      console.error("[v0] Submit error:", error)
      toast({
        title: "Erreur d'enregistrement",
        description: "Impossible d'enregistrer le contrôle",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "clear":
        return <CheckCircle2 className="h-4 w-4 text-[color:var(--senegal-green)]" />
      case "warning":
        return <Clock className="h-4 w-4 text-[color:var(--senegal-yellow)]" />
      default:
        return <AlertCircle className="h-4 w-4 text-[color:var(--senegal-red)]" />
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-50 border-t-4 border-t-[color:var(--gov-blue)]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="h-6 w-6 text-[color:var(--gov-blue)]" />
              <div className="absolute -top-1 -right-1 flex gap-0.5">
                <div className="w-1 h-3 bg-[color:var(--senegal-green)]" />
                <div className="w-1 h-3 bg-[color:var(--senegal-yellow)]" />
                <div className="w-1 h-3 bg-[color:var(--senegal-red)]" />
              </div>
            </div>
            <div>
              <h1 className="font-bold text-lg">Portail Opérateur</h1>
              <p className="text-sm text-slate-600">
                {operator.full_name} - {operator.badge_number}
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Search & Verification */}
          <div className="space-y-6">
            <Card className="border-t-4 border-t-[color:var(--senegal-green)]">
              <CardHeader>
                <CardTitle>Recherche Conducteur/Véhicule</CardTitle>
                <CardDescription>Rechercher par numéro de permis ou plaque d'immatriculation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={searchType} onValueChange={(v: "license" | "plate") => setSearchType(v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="license">Permis</SelectItem>
                      <SelectItem value="plate">Plaque</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder={searchType === "license" ? "DL-2024-001" : "KAA-123B"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="bg-[color:var(--gov-blue)] hover:bg-[color:var(--gov-blue-dark)] text-white"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {isSearching && (
                  <div className="space-y-2">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                )}

                {!isSearching && driver && (
                  <div className="border rounded-lg p-4 bg-slate-50 border-l-4 border-l-[color:var(--senegal-green)]">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      Informations du Conducteur
                      {driver.license_status === "active" && (
                        <CheckCircle2 className="h-4 w-4 text-[color:var(--senegal-green)]" />
                      )}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Nom:</span> {driver.full_name}
                      </p>
                      <p>
                        <span className="font-medium">Permis:</span> {driver.license_number}
                      </p>
                      <p>
                        <span className="font-medium">Téléphone:</span> {driver.phone}
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="font-medium">Statut:</span>
                        <Badge
                          variant={driver.license_status === "active" ? "default" : "destructive"}
                          className={driver.license_status === "active" ? "bg-[color:var(--senegal-green)]" : ""}
                        >
                          {driver.license_status}
                        </Badge>
                      </p>
                    </div>
                  </div>
                )}

                {!isSearching && vehicle && (
                  <div className="border rounded-lg p-4 bg-slate-50 border-l-4 border-l-[color:var(--senegal-yellow)]">
                    <h3 className="font-semibold mb-2">Informations du Véhicule</h3>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Plaque:</span> {vehicle.plate_number}
                      </p>
                      <p>
                        <span className="font-medium">Marque/Modèle:</span> {vehicle.make} {vehicle.model} (
                        {vehicle.year})
                      </p>
                      <p>
                        <span className="font-medium">Couleur:</span> {vehicle.color}
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="font-medium">Statut:</span>
                        <Badge variant={vehicle.vehicle_status === "active" ? "default" : "destructive"}>
                          {vehicle.vehicle_status}
                        </Badge>
                      </p>
                      {vehicle.insurance_expiry && (
                        <p>
                          <span className="font-medium">Expiration Assurance:</span>{" "}
                          {new Date(vehicle.insurance_expiry).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {driver && vehicle && (
              <Card className="border-t-4 border-t-[color:var(--gov-blue)]">
                <CardHeader>
                  <CardTitle>Enregistrer le Contrôle</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Statut</Label>
                    <Select value={recordStatus} onValueChange={(v: RecordStatus) => setRecordStatus(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clear">Conforme</SelectItem>
                        <SelectItem value="warning">Avertissement</SelectItem>
                        <SelectItem value="violation">Violation</SelectItem>
                        <SelectItem value="detained">Détenu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Observations générales..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  {(recordStatus === "violation" || recordStatus === "detained") && (
                    <>
                      <div>
                        <Label>Détails de la Violation</Label>
                        <Textarea
                          placeholder="Décrire la violation..."
                          value={violationDetails}
                          onChange={(e) => setViolationDetails(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Montant de l'Amende (FCFA)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={fineAmount}
                          onChange={(e) => setFineAmount(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <Button
                    onClick={handleSubmitRecord}
                    className="w-full bg-[color:var(--gov-blue)] hover:bg-[color:var(--gov-blue-dark)] text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? "Enregistrement..." : "Enregistrer le Contrôle"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="border-t-4 border-t-[color:var(--senegal-red)]">
            <CardHeader>
              <CardTitle>Contrôles Récents</CardTitle>
              <CardDescription>Vos 10 dernières entrées</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentRecords.map((record) => (
                    <div key={record.id} className="border rounded-lg p-3 text-sm hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {getStatusIcon(record.record_status)}
                            {record.driver?.full_name}
                          </p>
                          <p className="text-slate-600">{record.vehicle?.plate_number}</p>
                        </div>
                        <Badge
                          variant={record.record_status === "clear" ? "default" : "destructive"}
                          className={
                            record.record_status === "clear"
                              ? "bg-[color:var(--senegal-green)]"
                              : "bg-[color:var(--senegal-red)]"
                          }
                        >
                          {record.record_status}
                        </Badge>
                      </div>
                      {record.fine_amount && (
                        <p className="text-slate-600 text-xs mb-1">Amende: {record.fine_amount} FCFA</p>
                      )}
                      <p className="text-slate-500 text-xs">{new Date(record.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
