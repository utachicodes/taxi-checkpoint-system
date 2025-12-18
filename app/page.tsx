import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Users, MapPin, CheckCircle, BarChart3, FileDown } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="h-8 w-8 text-[color:var(--gov-blue)]" />
              <div className="absolute -top-1 -right-1 flex gap-0.5">
                <div className="w-1 h-3 bg-[color:var(--senegal-green)]" />
                <div className="w-1 h-3 bg-[color:var(--senegal-yellow)]" />
                <div className="w-1 h-3 bg-[color:var(--senegal-red)]" />
              </div>
            </div>
            <span className="text-xl font-bold text-slate-900">Contrôle TaxiGuard</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button className="bg-[color:var(--gov-blue)] hover:bg-[color:var(--gov-blue-dark)] text-white">
                Connexion
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center gap-2 mb-6">
            <div className="w-16 h-1 bg-[color:var(--senegal-green)] rounded" />
            <div className="w-16 h-1 bg-[color:var(--senegal-yellow)] rounded" />
            <div className="w-16 h-1 bg-[color:var(--senegal-red)] rounded" />
          </div>
          <h1 className="text-5xl font-bold text-slate-900 mb-6 text-balance">
            Système de Gestion des Points de Contrôle Taxi
          </h1>
          <p className="text-xl text-slate-600 mb-8 text-pretty">
            Rationalisez les opérations d'application de la loi avec la vérification des conducteurs en temps réel, le
            suivi des points de contrôle et la gestion complète des violations.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/auth/login">
              <Button size="lg" className="bg-[color:var(--gov-blue)] hover:bg-[color:var(--gov-blue-dark)] text-white">
                Accès au Système
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-t-4 border-t-[color:var(--senegal-green)]">
            <CardHeader>
              <Shield className="h-10 w-10 text-[color:var(--gov-blue)] mb-2" />
              <CardTitle>Vérification en Temps Réel</CardTitle>
              <CardDescription>
                Vérifications instantanées du permis et du statut du véhicule aux points de contrôle
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-t-4 border-t-[color:var(--senegal-yellow)]">
            <CardHeader>
              <Users className="h-10 w-10 text-[color:var(--senegal-green)] mb-2" />
              <CardTitle>Accès Multi-Portail</CardTitle>
              <CardDescription>
                Interfaces séparées pour les opérateurs de terrain et les administrateurs système
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-t-4 border-t-[color:var(--senegal-red)]">
            <CardHeader>
              <MapPin className="h-10 w-10 text-[color:var(--senegal-red)] mb-2" />
              <CardTitle>Suivi des Points de Contrôle</CardTitle>
              <CardDescription>
                Surveiller toutes les activités des points de contrôle et les performances des opérateurs
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-t-4 border-t-[color:var(--gov-blue)]">
            <CardHeader>
              <CheckCircle className="h-10 w-10 text-[color:var(--gov-blue)] mb-2" />
              <CardTitle>Gestion des Violations</CardTitle>
              <CardDescription>Historique complet des violations et suivi des paiements d'amendes</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-t-4 border-t-[color:var(--senegal-green)]">
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-[color:var(--senegal-yellow)] mb-2" />
              <CardTitle>Analyses et Rapports</CardTitle>
              <CardDescription>Tableaux de bord complets avec graphiques et visualisations de données</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-t-4 border-t-[color:var(--senegal-yellow)]">
            <CardHeader>
              <FileDown className="h-10 w-10 text-[color:var(--senegal-red)] mb-2" />
              <CardTitle>Export de Données</CardTitle>
              <CardDescription>Exportation des rapports en formats PDF et Excel pour l'archivage</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-white rounded-lg p-8 shadow-sm border-t-4 border-t-[color:var(--gov-blue)]">
          <h2 className="text-3xl font-bold text-center mb-12">Aperçu du Système</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-[color:var(--gov-blue)] mb-2">24/7</div>
              <div className="text-slate-600">Surveillance des Points de Contrôle</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[color:var(--senegal-green)] mb-2">100%</div>
              <div className="text-slate-600">Sécurité RLS</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[color:var(--senegal-red)] mb-2">Temps Réel</div>
              <div className="text-slate-600">Synchronisation des Données</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center gap-2 mb-4">
            <div className="w-12 h-1 bg-[color:var(--senegal-green)] rounded" />
            <div className="w-12 h-1 bg-[color:var(--senegal-yellow)] rounded" />
            <div className="w-12 h-1 bg-[color:var(--senegal-red)] rounded" />
          </div>
          <p className="text-center text-slate-600">
            &copy; 2025 Contrôle TaxiGuard. Système de gestion des points de contrôle certifié gouvernemental.
          </p>
        </div>
      </footer>
    </div>
  )
}
