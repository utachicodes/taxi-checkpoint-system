"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Shield, Search, LogOut, Camera, AlertTriangle, CheckCircle, RefreshCcw, Bell, History } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import type { Operator, Driver, Vehicle, DailyPayment } from "@/lib/types"

export default function OperatorDashboard({ operator }: { operator: Operator }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [driver, setDriver] = useState<Driver | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [dailyPayment, setDailyPayment] = useState<DailyPayment | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanStatus, setScanStatus] = useState<"idle" | "searching" | "found" | "not_found">("idle")
  const [history, setHistory] = useState<(Vehicle & { paid: boolean, time: string })[]>([])

  const audioContextRef = useRef<AudioContext | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Initialize Audio Context on first interaction
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  const playAlert = (type: "success" | "warning") => {
    if (!audioContextRef.current) return
    const ctx = audioContextRef.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === "success") {
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1)
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.2)
      osc.type = "sawtooth"
    }

    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    osc.start()
    osc.stop(ctx.currentTime + 0.3)
  }

  const handleScan = async () => {
    initAudio()
    if (!searchQuery) return

    setIsScanning(true)
    setScanStatus("searching")
    setDriver(null)
    setVehicle(null)
    setDailyPayment(null)

    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    try {
      const { data: vehicleData, error } = await supabase
        .from("vehicles")
        .select("*, driver:drivers(*)")
        .eq("plate_number", searchQuery.toUpperCase())
        .single()

      if (vehicleData) {
        setVehicle(vehicleData as Vehicle)
        setDriver(vehicleData.driver as Driver)
        setScanStatus("found")

        // Check today's payment
        const today = new Date().toISOString().split("T")[0]
        const { data: payment } = await supabase
          .from("daily_payments")
          .select("*")
          .eq("vehicle_id", vehicleData.id)
          .eq("payment_date", today)
          .single()

        if (payment) {
          setDailyPayment(payment as DailyPayment)
          playAlert("success")
          toast({ title: "Véhicule Conforme", description: "Le paiement journalier a été validé." })
        } else {
          playAlert("warning")
          toast({
            title: "Paiement Manquant",
            description: "Ce véhicule n'a pas encore payé sa taxe journalière !",
            variant: "destructive"
          })
        }

        // Add to history
        setHistory(prev => [{
          ...vehicleData,
          paid: !!payment,
          time: new Date().toLocaleTimeString()
        }, ...prev.slice(0, 9)])

      } else {
        setScanStatus("not_found")
        playAlert("warning")
        toast({
          title: "Inconnu",
          description: "Ce véhicule n'est pas enregistré dans le système.",
          variant: "destructive"
        })
      }
    } catch (err) {
      console.error(err)
      setScanStatus("not_found")
    } finally {
      setIsScanning(false)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!vehicle) return
    setIsProcessing(true)

    try {
      const today = new Date().toISOString().split("T")[0]
      const { data, error } = await supabase
        .from("daily_payments")
        .insert({
          vehicle_id: vehicle.id,
          payment_date: today,
          amount: 500,
          is_paid: true
        })
        .select()
        .single()

      if (error) throw error

      setDailyPayment(data as DailyPayment)
      playAlert("success")
      toast({ title: "Paiement Enregistré", description: "Le véhicule est maintenant à jour." })

      // Update history status
      setHistory(prev => prev.map(h => h.id === vehicle.id ? { ...h, paid: true } : h))
    } catch (err) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer le paiement.", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-yellow-500 selection:text-black flex flex-col overflow-x-hidden">
      {/* Premium Header */}
      <header className="z-50 px-8 py-6 flex items-center justify-between border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-lg">Portail Opérateur</h1>
            <p className="text-xs text-zinc-400 uppercase tracking-widest font-medium">#{operator.badge_number} — {operator.full_name}</p>
          </div>
        </div>
        <Button variant="ghost" onClick={handleLogout} className="text-zinc-400 hover:text-white transition-colors">
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </header>

      <main className="flex-1 container mx-auto px-6 py-10 grid lg:grid-cols-12 gap-8">

        {/* Left Column: Camera and Scan */}
        <div className="lg:col-span-8 space-y-8">

          {/* Simulated Camera Feed */}
          <div className="relative aspect-video bg-zinc-900 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 z-10" />

            {/* Camera Overlay Elements */}
            <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
              <span className="text-xs font-bold tracking-widest uppercase text-white/80">LIVE FEED — CHECKPOINT 01</span>
            </div>

            <div className="absolute bottom-6 left-6 z-20">
              <div className="glass-dark px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
                <Camera className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-300">HD Optical Sensor Alpha-9</span>
              </div>
            </div>

            {/* Scanning Animation */}
            {isScanning && (
              <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                <div className="w-full h-1 bg-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.8)] animate-scan" />
                <div className="absolute inset-0 bg-yellow-500/5 backdrop-blur-[2px]" />
              </div>
            )}

            {/* Camera Placeholder Image/Anim */}
            <div className="absolute inset-0 flex items-center justify-center">
              {!vehicle && !isScanning && (
                <div className="text-center space-y-4 opacity-20 group-hover:opacity-40 transition-opacity duration-500">
                  <Camera className="w-24 h-24 mx-auto" />
                  <p className="text-sm font-medium">En attente de détection...</p>
                </div>
              )}
              {vehicle && !isScanning && (
                <div className="w-full h-full flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                  <div className="animate-in zoom-in-95 duration-500 text-center z-20">
                    <span className="bg-white/10 border border-white/20 px-6 py-2 rounded-full text-4xl font-black tracking-tighter shadow-2xl backdrop-blur-md">
                      {vehicle.plate_number}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Corner Brackets */}
            <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-white/20 rounded-tl-sm pointer-events-none" />
            <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-white/20 rounded-tr-sm pointer-events-none" />
            <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-white/20 rounded-bl-sm pointer-events-none" />
            <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-white/20 rounded-br-sm pointer-events-none" />
          </div>

          {/* Scanner Control */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-dark p-8 rounded-[2rem] border border-white/10 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Saisie Manuelle / Scan</Label>
                <div className="flex gap-3">
                  <Input
                    placeholder="ENTRER PLAQUE..."
                    className="h-14 bg-white/5 border-white/10 rounded-2xl text-lg font-bold tracking-widest placeholder:opacity-40 uppercase"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  />
                  <Button
                    onClick={handleScan}
                    disabled={isScanning}
                    className="h-14 w-14 rounded-2xl bg-white text-black hover:bg-gray-200 shrink-0 shadow-lg shadow-white/5"
                  >
                    <Search className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <div className={`p-4 rounded-2xl border transition-all duration-500 flex-1 flex items-center justify-center gap-3 ${scanStatus === "found" ? "bg-green-500/10 border-green-500/20 text-green-400" :
                    scanStatus === "not_found" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                      "bg-white/5 border-white/10 text-zinc-500"
                  }`}>
                  {scanStatus === "found" ? <CheckCircle className="w-5 h-5" /> :
                    scanStatus === "not_found" ? <AlertTriangle className="w-5 h-5" /> :
                      <RefreshCcw className={`w-5 h-5 ${isScanning ? "animate-spin" : ""}`} />}
                  <span className="text-sm font-bold uppercase tracking-widest">
                    {isScanning ? "Analyse..." : scanStatus === "found" ? "Détecté" : scanStatus === "not_found" ? "Échec" : "Prêt"}
                  </span>
                </div>
              </div>
            </div>

            {/* Vehicle Info Card */}
            <div className={`glass-dark p-8 rounded-[2rem] border border-white/10 transition-all duration-700 overflow-hidden relative ${!vehicle && "opacity-40 grayscale"}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] rounded-full translate-x-10 -translate-y-10" />

              {vehicle ? (
                <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Propriétaire</p>
                      <h3 className="text-xl font-bold">{driver?.full_name}</h3>
                      <p className="text-sm text-zinc-400">{driver?.license_number}</p>
                    </div>
                    <Badge variant="outline" className="border-white/20 text-white rounded-lg">
                      {vehicle.make} {vehicle.model}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Status</p>
                      <p className={`text-sm font-bold uppercase ${vehicle.vehicle_status === "active" ? "text-green-400" : "text-red-400"}`}>
                        {vehicle.vehicle_status}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Assurance</p>
                      <p className="text-sm font-bold text-white">VALIDÉ</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                    <History className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-xs uppercase tracking-widest font-bold text-zinc-500">Aucune donnée</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Status & History */}
        <div className="lg:col-span-4 space-y-8">

          {/* Payment Status (The most important part) */}
          <div className={`p-8 rounded-[2rem] border-2 transition-all duration-500 text-center space-y-6 overflow-hidden relative bg-black ${!vehicle ? "border-white/10 opacity-50" :
              dailyPayment ? "border-green-500/40 shadow-[0_0_50px_rgba(34,197,94,0.1)]" :
                "border-red-500/40 shadow-[0_0_50px_rgba(239,68,68,0.15)]"
            }`}>
            {!vehicle ? (
              <div className="py-10 space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                  <Shield className="w-8 h-8 text-zinc-500" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">En attente d'un véhicule</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Statut de la Taxe Journalière</p>
                  <h2 className={`text-5xl font-black tracking-tighter ${dailyPayment ? "text-green-500" : "text-red-500"}`}>
                    {dailyPayment ? "PAYÉ" : "NON PAYÉ"}
                  </h2>
                </div>

                <div className={`p-6 rounded-[1.5rem] ${dailyPayment ? "bg-green-500/10" : "bg-red-500/10"} border border-white/5`}>
                  {dailyPayment ? (
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                      <p className="text-xs font-bold uppercase tracking-widest text-green-400">Transaction ID: {dailyPayment.id.slice(0, 8)}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <AlertTriangle className="w-10 h-10 text-red-500 mx-auto animate-bounce" />
                      <div className="space-y-4">
                        <p className="text-sm text-red-200 font-medium leading-relaxed">
                          Ce véhicule est en infraction. Veuillez régulariser la situation immédiatement.
                        </p>
                        <Button
                          onClick={handleMarkAsPaid}
                          disabled={isProcessing}
                          className="w-full h-14 rounded-2xl bg-white text-black hover:bg-gray-200 font-black shadow-xl"
                        >
                          {isProcessing ? "Traitement..." : "ENCAISSER 500 FCFA"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Activity Log */}
          <div className="glass-dark rounded-[2rem] border border-white/10 overflow-hidden flex flex-col h-[400px]">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold tracking-tight">Historique Récent</h3>
              <Bell className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
              {history.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center p-10">
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Aucune activité enregistrée</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {history.map((h, i) => (
                    <div key={i} className="p-4 rounded-2xl hover:bg-white/5 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-10 rounded-full ${h.paid ? "bg-green-500/50" : "bg-red-500/50"}`} />
                        <div>
                          <p className="font-bold tracking-tight uppercase">{h.plate_number}</p>
                          <p className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">{h.time}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`border-none ${h.paid ? "text-green-500" : "text-red-500"}`}>
                        {h.paid ? "Payé" : "Infraction"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Styles for animation */}
      <style jsx global>{`
        @keyframes scan {
          0%, 100% { top: 0; }
          50% { top: 100%; }
        }
        .animate-scan {
          position: absolute;
          width: 100%;
          animation: scan 3s ease-in-out infinite;
        }
        .text-gradient-gold {
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div>
  )
}
