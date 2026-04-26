import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import OperatorDashboard from "@/components/operator-dashboard"

export default async function OperatorPage() {
  const cookieStore = await cookies()
  const isMocked = cookieStore.get("taxiguard_auth_bypass")?.value === "operator" || cookieStore.get("taxiguard_auth_bypass")?.value === "admin"

  if (isMocked) {
    return <OperatorDashboard operator={{
      id: "mock-id",
      full_name: "Opérateur Démo",
      badge_number: "DEMO-777",
      role: "operator",
      is_active: true,
      created_at: new Date().toISOString()
    }} />
  }

  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  const { data: operator } = await supabase.from("operators").select("*").eq("id", user.id).single()

  if (!operator) {
    return <div className="p-8 text-white">Operator profile not found. (Supabase Auth active)</div>
  }

  return <OperatorDashboard operator={operator} />
}
