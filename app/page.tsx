import Link from "next/link"
import { Button } from "@/components/ui/button"
import HeroScene from "@/components/HeroScene"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-yellow-500 selection:text-black no-scrollbar flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-between max-w-7xl mx-auto w-full animate-fade-in-up">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white">
            Taxi<span className="opacity-50 font-light">Guard</span>
          </span>
          <span className="hidden md:inline-block ml-4 text-xs font-medium tracking-[0.2em] uppercase opacity-40 border-l border-white/20 pl-4">
            République du Sénégal
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
        </nav>

        <Link href="/auth/login">
          <Button className="rounded-full bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white px-6 border border-white/10 transition-all hover:scale-105 active:scale-95 duration-300">
            Connexion
          </Button>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center relative w-full pt-20">

        {/* Desktop Hero Scene (Absolute Right Half) */}
        <div className="hidden md:block absolute top-0 right-0 w-[50vw] h-full z-0">
          <HeroScene />
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto w-full px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full h-full items-center">

            {/* Left Column: Typography */}
            <div className="space-y-8">
              <h1 className="text-5xl md:text-7xl font-bold leading-[0.95] tracking-tight text-white animate-fade-in-up delay-100">
                La garde <br />
                intelligente <br />
                du <span className="text-gradient-gold">transport.</span>
              </h1>

              <p className="max-w-md text-gray-400 text-lg leading-relaxed animate-fade-in-up delay-200">
                L'écosystème numérique de confiance pour la
                <span className="text-white font-medium"> surveillance et régularisation </span>
                des taxis au Sénégal.
              </p>

              <div className="pt-4 flex gap-4 animate-fade-in-up delay-300">
                <Link href="/auth/login">
                  <Button className="cursor-pointer rounded-full h-12 px-8 bg-white text-black hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 duration-300 text-base font-semibold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                    Accéder au système
                  </Button>
                </Link>

                <Link href="/about">
                  <Button variant="outline" className="cursor-pointer rounded-full h-12 px-8 bg-transparent border border-white/20 text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95 duration-300 text-base backdrop-blur-sm">
                    En savoir plus
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile Hero Scene (Stacked) */}
            <div className="md:hidden h-[500px] w-full relative animate-fade-in-up delay-500">
              <HeroScene />
            </div>

          </div>
        </div>
      </main>

      {/* Background Gradient Spot */}
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-red-600/10 blur-[120px] rounded-full pointer-events-none z-0 mix-blend-screen animate-pulse duration-[4000ms]" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-green-600/5 blur-[120px] rounded-full pointer-events-none z-0 mix-blend-screen animate-pulse duration-[5000ms]" />

    </div>
  )
}
