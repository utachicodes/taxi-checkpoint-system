import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Missing Supabase environment variables in middleware')
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const bypassRole = request.cookies.get("taxiguard_auth_bypass")?.value

  // Protect admin and operator routes
  if ((request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/operator")) && !user) {
    // --- MOCK AUTH BYPASS ---
    // The demo login buttons set this cookie instead of creating a real
    // Supabase session. Honor it here so the demo flow isn't blocked.
    const isAdminRoute = request.nextUrl.pathname.startsWith("/admin")
    const isOperatorRoute = request.nextUrl.pathname.startsWith("/operator")
    if ((isAdminRoute && bypassRole === "admin") || (isOperatorRoute && (bypassRole === "operator" || bypassRole === "admin"))) {
      return supabaseResponse
    }
    // --- END MOCK AUTH BYPASS ---

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/auth/login"
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}
