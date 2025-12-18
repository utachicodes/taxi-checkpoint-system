import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminDashboard from "@/components/admin-dashboard"

export default async function AdminPage() {
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
