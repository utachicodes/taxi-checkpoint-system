import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import OperatorDashboard from "@/components/operator-dashboard"

export default async function OperatorPage() {
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
    return <div className="p-8">Operator profile not found. Please contact admin.</div>
  }

  return <OperatorDashboard operator={operator} />
}
