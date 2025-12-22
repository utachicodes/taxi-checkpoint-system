"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shield, Users, Car, CreditCard, LogOut, Plus, Search, Trash2, CheckCircle2, XCircle, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { createOperatorAction, getOperatorsAction, deleteOperatorAction } from "@/lib/actions/operator-actions"
import type { Operator, Vehicle, Driver, DailyPayment, Checkpoint } from "@/lib/types"
import ScanLive from "@/components/supabase/ScanLive"

export default function AdminDashboard({ operator }: { operator: Operator }) {
  const [stats, setStats] = useState({ drivers: 0, vehicles: 0, paymentsToday: 0, revenueToday: 0 })
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [payments, setPayments] = useState<DailyPayment[]>([])
  const [operators, setOperators] = useState<any[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // New Vehicle Form State
  const [newPlate, setNewPlate] = useState("")
  const [newMake, setNewMake] = useState("")
  const [newModel, setNewModel] = useState("")
  const [driverName, setDriverName] = useState("")

  // New Operator Form State
  const [newOpEmail, setNewOpEmail] = useState("")
  const [newOpName, setNewOpName] = useState("")
  const [newOpBadge, setNewOpBadge] = useState("")
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string | undefined>()

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    const today = new Date().toISOString().split("T")[0]

    const [driversRes, vehiclesRes, paymentsRes, checkpointsRes] = await Promise.all([
      supabase.from("drivers").select("*").order("full_name"),
      supabase.from("vehicles").select("*, driver:drivers(*)").order("created_at", { ascending: false }),
      supabase.from("daily_payments").select("*, vehicle:vehicles(*)").eq("payment_date", today),
      supabase.from("checkpoints").select("*").order("name")
    ])

    if (driversRes.data) setDrivers(driversRes.data as Driver[])
    if (vehiclesRes.data) setVehicles(vehiclesRes.data as Vehicle[])
    if (checkpointsRes.data) setCheckpoints(checkpointsRes.data as Checkpoint[])

    // Load operators via server action
    try {
      const ops = await getOperatorsAction()
      setOperators(ops)
    } catch (err) {
      console.error("Failed to load operators:", err)
    }
    if (paymentsRes.data) {
      setPayments(paymentsRes.data as DailyPayment[])
      const total = paymentsRes.data.reduce((acc, curr) => acc + Number(curr.amount), 0)
      setStats({
        drivers: driversRes.data?.length || 0,
        vehicles: vehiclesRes.data?.length || 0,
        paymentsToday: paymentsRes.data.length,
        revenueToday: total
      })
    }
    setIsLoading(false)
  }

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlate || !newMake || !driverName) return

    try {
      // First, create or find the driver
      let driverId = null

      // Try to find existing driver by name
      const { data: existingDriver } = await supabase
        .from("drivers")
        .select("id")
        .eq("full_name", driverName)
        .single()

      if (existingDriver) {
        driverId = existingDriver.id
      } else {
        // Create new driver
        const { data: newDriver, error: driverError } = await supabase
          .from("drivers")
          .insert({
            full_name: driverName,
            license_number: `AUTO-${Date.now()}`, // Auto-generate license number
            phone: "N/A",
            license_status: "active",
            date_of_birth: "1990-01-01"
          })
          .select()
          .single()

        if (driverError) throw driverError
        driverId = newDriver.id
      }

      // Now insert the vehicle
      const { error } = await supabase.from("vehicles").insert({
        plate_number: newPlate.toUpperCase(),
        make: newMake,
        model: newModel,
        year: new Date().getFullYear(),
        color: "Inconnu",
        driver_id: driverId,
        vehicle_status: "active"
      })

      if (error) throw error

      toast({ title: "Succès", description: "Le véhicule a été enregistré." })
      setNewPlate("")
      setNewMake("")
      setNewModel("")
      setDriverName("")
      loadData()
    } catch (err) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer le véhicule.", variant: "destructive" })
    }
  }

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce véhicule ?")) return

    try {
      const { error } = await supabase.from("vehicles").delete().eq("id", id)
      if (error) throw error

      toast({ title: "Succès", description: "Le véhicule a été supprimé." })
      loadData()
    } catch (err) {
      toast({ title: "Erreur", description: "Impossible de supprimer le véhicule.", variant: "destructive" })
    }
  }

  const handleAddOperator = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOpEmail || !newOpName || !newOpBadge) return

    setIsLoading(true)
    try {
      await createOperatorAction({
        email: newOpEmail,
        fullName: newOpName,
        badgeNumber: newOpBadge,
        checkpointId: selectedCheckpointId
      })

      toast({ title: "Succès", description: "Le compte opérateur a été créé." })
      setNewOpEmail("")
      setNewOpName("")
      setNewOpBadge("")

      // Refresh operators list
      const ops = await getOperatorsAction()
      setOperators(ops)
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible de créer le compte.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteOperator = async (id: string) => {
    if (!confirm("Supprimer ce compte définitivement ?")) return

    try {
      await deleteOperatorAction(id)
      toast({ title: "Succès", description: "Compte supprimé." })
      const ops = await getOperatorsAction()
      setOperators(ops)
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }


  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-600 selection:text-white flex flex-col overflow-x-hidden">
      {/* Premium Header */}
      <header className="z-50 px-8 py-6 flex items-center justify-between border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-lg">Administration</h1>
            <p className="text-xs text-zinc-400 uppercase tracking-widest font-medium">Contrôle National TaxiGuard</p>
          </div>
        </div>
        <Button variant="ghost" onClick={handleLogout} className="text-zinc-400 hover:text-white transition-colors">
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </header>

      <main className="flex-1 container mx-auto px-6 py-10 space-y-10">

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="bg-white/5 border-white/10 rounded-3xl p-6 hover:bg-white/[0.08] transition-colors border-l-4 border-l-blue-500">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Véhicules Total</p>
            <div className="flex items-end justify-between">
              <h2 className="text-4xl font-black">{stats.vehicles}</h2>
              <Car className="w-8 h-8 opacity-40" />
            </div>
          </Card>
          <Card className="bg-white/5 border-white/10 rounded-3xl p-6 hover:bg-white/[0.08] transition-colors border-l-4 border-l-green-500">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Paiements (Auj)</p>
            <div className="flex items-end justify-between">
              <h2 className="text-4xl font-black">{stats.paymentsToday}</h2>
              <CreditCard className="w-8 h-8 opacity-40" />
            </div>
          </Card>
          <Card className="bg-white/5 border-white/10 rounded-3xl p-6 hover:bg-white/[0.08] transition-colors border-l-4 border-l-yellow-500">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Recettes (FCFA)</p>
            <div className="flex items-end justify-between">
              <h2 className="text-4xl font-black text-yellow-500">{stats.revenueToday}</h2>
              <span className="text-xs font-bold opacity-40">XOF</span>
            </div>
          </Card>
          <Card className="bg-white/5 border-white/10 rounded-3xl p-6 hover:bg-white/[0.08] transition-colors border-l-4 border-l-red-500">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Chauffeurs</p>
            <div className="flex items-end justify-between">
              <h2 className="text-4xl font-black">{stats.drivers}</h2>
              <Users className="w-8 h-8 opacity-40" />
            </div>
          </Card>
        </div>

        {/* Live Scans Panel */}
        <div className="mb-6">
          <ScanLive />
        </div>

        <Tabs defaultValue="vehicles" className="space-y-8">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl h-14">
            <TabsTrigger value="vehicles" className="rounded-xl px-8 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              Véhicules
            </TabsTrigger>
            <TabsTrigger value="add" className="rounded-xl px-8 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              Enregistrer
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl px-8 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              Journalier
            </TabsTrigger>
            <TabsTrigger value="ops" className="rounded-xl px-8 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              Gestion Agents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles">
            <div className="glass-dark border border-white/10 rounded-[2rem] overflow-hidden">
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <h3 className="text-xl font-bold">Flotte de Véhicules Enregistrés</h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input placeholder="Rechercher..." className="pl-10 bg-white/5 border-white/10 rounded-xl placeholder:opacity-40" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/[0.01]">
                    <tr className="border-b border-white/5">
                      <th className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-400">Plaque ID</th>
                      <th className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-400">Marque / Modèle</th>
                      <th className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-400">Conducteur</th>
                      <th className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-400">Statut</th>
                      <th className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-400">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v) => (
                      <tr key={v.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                        <td className="p-6">
                          <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg font-bold tracking-tighter text-lg">
                            {v.plate_number}
                          </span>
                        </td>
                        <td className="p-6 font-medium text-zinc-200">{v.make} {v.model}</td>
                        <td className="p-6">
                          <div className="flex flex-col">
                            <span className="font-bold">{v.driver?.full_name}</span>
                            <span className="text-xs text-zinc-400 font-medium">{v.driver?.license_number}</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <Badge variant="outline" className="border-green-500/20 text-green-500 bg-green-500/5">
                            {v.vehicle_status}
                          </Badge>
                        </td>
                        <td className="p-6">
                          <Button
                            variant="ghost"
                            onClick={() => handleDeleteVehicle(v.id)}
                            className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="add">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="glass-dark border border-white/10 rounded-[2rem] p-10 space-y-8">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Nouveau Véhicule</h3>
                  <p className="text-zinc-400">Enregistrer un nouveau véhicule dans le système national.</p>
                </div>

                <form onSubmit={handleAddVehicle} className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Plaque d'immatriculation</Label>
                      <Input
                        placeholder="KAA-000-XX"
                        className="h-14 bg-white/5 border-white/10 rounded-2xl text-lg font-bold placeholder:opacity-40"
                        value={newPlate}
                        onChange={(e) => setNewPlate(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Marque</Label>
                        <Input
                          placeholder="Toyota"
                          className="h-14 bg-white/5 border-white/10 rounded-2xl placeholder:opacity-40"
                          value={newMake}
                          onChange={(e) => setNewMake(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Modèle</Label>
                        <Input
                          placeholder="Corolla"
                          className="h-14 bg-white/5 border-white/10 rounded-2xl placeholder:opacity-40"
                          value={newModel}
                          onChange={(e) => setNewModel(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nom du Chauffeur</Label>
                      <Input
                        placeholder="Ex: Mamadou Diallo"
                        className="h-14 bg-white/5 border-white/10 rounded-2xl placeholder:opacity-40"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button className="w-full h-14 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 font-bold transition-all hover:scale-[1.02]">
                    Valider l'enregistrement
                  </Button>
                </form>
              </Card>

              <div className="space-y-6">
                <div className="glass-dark border border-white/10 rounded-[2rem] p-8 space-y-4">
                  <Plus className="w-10 h-10 text-blue-500" />
                  <h4 className="text-lg font-bold text-gray-200 italic leading-relaxed">
                    "La sécurité routière commence par un système d'identification rigoureux et transparent."
                  </h4>
                  <p className="text-sm text-zinc-400">— Ministère des Transports Terrestres</p>
                </div>
                <div className="p-8 rounded-[2rem] bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/20 space-y-4 flex flex-col justify-end h-64">
                  <Users className="w-12 h-12 text-blue-400" />
                  <div>
                    <h3 className="text-xl font-bold">Chauffeurs Enregistrés</h3>
                    <p className="text-sm text-blue-300">Gérez les permis et les infractions des conducteurs nationaux.</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="glass-dark border border-white/10 rounded-[2rem] overflow-hidden">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Encaissements du Jour</h3>
                  <p className="text-sm text-zinc-400">Liste des véhicules ayant payé leur taxe aujourd'hui.</p>
                </div>
                <Badge className="bg-blue-600 text-white font-black px-4 py-2">TOTAL: {stats.revenueToday} FCFA</Badge>
              </div>
              <div className="p-8 grid md:grid-cols-3 gap-6">
                {payments.length === 0 ? (
                  <div className="col-span-3 py-20 text-center opacity-40">
                    <CreditCard className="w-16 h-16 mx-auto mb-4" />
                    <p className="font-bold uppercase tracking-widest text-zinc-400">Aucun paiement aujourd'hui</p>
                  </div>
                ) : (
                  payments.map(p => (
                    <div key={p.id} className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <span className="bg-white/10 px-3 py-1 rounded-lg font-bold tracking-tighter text-sm">
                          {p.vehicle?.plate_number}
                        </span>
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-black">{p.amount} <span className="text-xs font-bold opacity-30">XOF</span></p>
                        <p className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">{new Date(p.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="ops">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Operator List */}
              <div className="md:col-span-2 glass-dark border border-white/10 rounded-[2rem] overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Agents Opérateurs</h3>
                  <Badge className="bg-blue-600 text-white">{operators.length} Actifs</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.01]">
                        <th className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-400">Agent</th>
                        <th className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-400">Badge</th>
                        <th className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-400">Point d'Attache</th>
                        <th className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-400">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operators.map(op => (
                        <tr key={op.id} className="border-b border-white/5 hover:bg-white/[0.02] group transition-colors">
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                                {op.full_name.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold">{op.full_name}</span>
                                <span className="text-xs text-zinc-500">{op.role === 'admin' ? 'Administrateur' : 'Opérateur'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <code className="bg-white/5 px-2 py-1 rounded text-zinc-300 font-mono text-sm">{op.badge_number}</code>
                          </td>
                          <td className="p-6 text-zinc-400 text-sm">
                            {op.checkpoint?.name || "Non assigné"}
                          </td>
                          <td className="p-6">
                            {op.id !== operator.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteOperator(op.id)}
                                className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Operator Form */}
              <div className="space-y-6">
                <Card className="glass-dark border border-white/10 rounded-[2rem] p-8 space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <UserPlus className="w-6 h-6 text-blue-400" />
                    <h3 className="text-xl font-bold">Nouvel Agent</h3>
                  </div>
                  <form onSubmit={handleAddOperator} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nom Complet</Label>
                      <Input
                        placeholder="Jean Dupont"
                        value={newOpName}
                        onChange={e => setNewOpName(e.target.value)}
                        className="bg-white/5 border-white/10 h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Email Professionnel</Label>
                      <Input
                        type="email"
                        placeholder="agent@min-transport.sn"
                        value={newOpEmail}
                        onChange={e => setNewOpEmail(e.target.value)}
                        className="bg-white/5 border-white/10 h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Numéro de Badge</Label>
                      <Input
                        placeholder="TG-2025-XXXX"
                        value={newOpBadge}
                        onChange={e => setNewOpBadge(e.target.value)}
                        className="bg-white/5 border-white/10 h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Point de Contrôle</Label>
                      <Select onValueChange={setSelectedCheckpointId}>
                        <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                          {checkpoints.map(cp => (
                            <SelectItem key={cp.id} value={cp.id}>{cp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      disabled={isLoading}
                    >
                      {isLoading ? "Création..." : "Créer le compte"}
                    </Button>
                    <p className="text-[10px] text-zinc-500 text-center italic">
                      L'agent recevra ses identifiants par email de service.
                    </p>
                  </form>
                </Card>

                <div className="p-6 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Sécurité</span>
                  </div>
                  <p className="text-xs text-amber-200/70 leading-relaxed">
                    Les mots de passe par défaut sont générés automatiquement. Les agents devront les changer dès leur première connexion via le portail de sécurité.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
