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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="h-10 w-10 text-[color:var(--gov-blue)]" />
              <div className="absolute -top-1 -right-1 flex gap-0.5">
                <div className="w-1.5 h-4 bg-[color:var(--senegal-green)]" />
                <div className="w-1.5 h-4 bg-[color:var(--senegal-yellow)]" />
                <div className="w-1.5 h-4 bg-[color:var(--senegal-red)]" />
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-900">TaxiGuard</span>
          </div>
        </div>

        <Card className="border-t-4 border-t-[color:var(--gov-blue)]">
          <CardHeader>
            <CardTitle>Connexion au Système</CardTitle>
            <CardDescription>Accédez au système de gestion des points de contrôle</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Adresse Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="operateur@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Mot de Passe</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[color:var(--gov-blue)] hover:bg-[color:var(--gov-blue-dark)] text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Connexion en cours..." : "Se Connecter"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                <Link href="/" className="text-[color:var(--gov-blue)] hover:underline">
                  Retour à l'accueil
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
