"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import HeroScene from "@/components/HeroScene"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: operator } = await supabase.from("operators").select("role").eq("id", user?.id).single()

      toast({
        title: "Connexion réussie",
        description: "Bienvenue dans le système TaxiGuard",
      })

      if (operator?.role === "admin") {
        router.push("/admin")
      } else {
        router.push("/operator")
      }
    } catch (error: unknown) {
      toast({
        title: "Erreur de connexion",
        description: error instanceof Error ? error.message : "Une erreur s'est produite",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-yellow-500 selection:text-black no-scrollbar flex flex-col overflow-x-hidden">
      {/* Background 3D Scene */}
      <div className="hidden md:block fixed top-0 right-0 w-[50vw] h-full z-0 opacity-40">
        <HeroScene />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 group transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <Shield className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Taxi<span className="opacity-50 font-light">Guard</span>
          </span>
          <span className="hidden md:inline-block ml-4 text-xs font-medium tracking-[0.2em] uppercase opacity-60 border-l border-white/20 pl-4">
            République du Sénégal
          </span>
        </Link>
      </header>

      <main className="flex-1 flex items-center relative z-10 max-w-7xl mx-auto w-full px-8 py-20 mt-12 md:mt-0">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="mb-12 space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tighter">
              Connexion.
            </h1>
            <p className="text-zinc-400 text-lg max-w-sm leading-relaxed">
              Connectez-vous pour accéder au portail de contrôle national TaxiGuard.
            </p>
          </div>

          <div className="space-y-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2 group">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1 group-focus-within:text-white transition-colors">Adresse Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="operateur@min-transport.sn"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-white/10 h-16 rounded-2xl focus:ring-2 focus:ring-white/20 focus:border-white/20 placeholder:text-zinc-600 transition-all hover:bg-white/[0.08] text-lg px-6"
                  />
                </div>
                <div className="grid gap-2 group">
                  <Label htmlFor="password" name="password-label" className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1 group-focus-within:text-white transition-colors">Mot de Passe</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 h-16 rounded-2xl focus:ring-2 focus:ring-white/20 focus:border-white/20 placeholder:text-zinc-600 transition-all hover:bg-white/[0.08] text-lg px-6"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-16 rounded-2xl bg-white text-black hover:bg-gray-200 transition-all hover:scale-[1.02] active:scale-98 duration-300 font-bold shadow-[0_0_30px_rgba(255,255,255,0.15)] text-lg flex items-center justify-center gap-3"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    <>
                      Se Connecter
                      <Shield className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center pt-6">
                <Link href="/" className="text-sm font-medium text-zinc-400 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group">
                  <span className="group-hover:-translate-x-1 transition-transform inline-block">←</span>
                  Retour à la page d'accueil
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Background Ambient Glows */}
      <div className="fixed top-[-20%] right-[-10%] w-[800px] h-[800px] bg-red-600/[0.07] blur-[150px] rounded-full pointer-events-none z-0 mix-blend-screen animate-pulse duration-[8000ms]" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-green-600/[0.05] blur-[150px] rounded-full pointer-events-none z-0 mix-blend-screen animate-pulse duration-[10000ms]" />
    </div>
  )
}
