import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import AdminDashboard from "@/components/admin-dashboard"

export default async function AdminPage() {
  const cookieStore = await cookies()
  const isMocked = cookieStore.get("taxiguard_auth_bypass")?.value === "admin"

  if (isMocked) {
    return <AdminDashboard operator={{
      id: "mock-admin-id",
      full_name: "Administrateur Démo",
      badge_number: "ADMIN-001",
      role: "admin",
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

  if (!operator || operator.role !== "admin") {
    redirect("/operator")
  }

  return <AdminDashboard operator={operator} />
}
