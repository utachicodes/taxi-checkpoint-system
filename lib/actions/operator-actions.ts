"use server"

import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

// Creates a Supabase client with the Service Role Key for administrative tasks
const getAdminClient = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}

// Normal user client to check permissions
const getUserClient = async () => {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Ignore if called in a Server Component
                    }
                },
            },
        }
    )
}

export async function createOperatorAction(formData: {
    email: string
    fullName: string
    badgeNumber: string
    checkpointId?: string
}) {
    const supabase = await getUserClient()

    // 1. Verify the requester is an admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Non authentifié")

    const { data: admin } = await supabase
        .from("operators")
        .select("role")
        .eq("id", user.id)
        .single()

    if (admin?.role !== "admin") {
        throw new Error("Accès refusé : Seuls les administrateurs peuvent créer des opérateurs")
    }

    const adminClient = getAdminClient()

    // 2. Create the user in Supabase Auth
    // We use a temporary dummy password that they should change, 
    // or we can just send an invite. For this demo, let's set a default one.
    const tempPassword = "Password123!"

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: formData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: formData.fullName }
    })

    if (authError) throw authError

    // 3. Create the operator profile in the operators table
    const { error: profileError } = await adminClient
        .from("operators")
        .insert({
            id: authData.user.id,
            full_name: formData.fullName,
            badge_number: formData.badgeNumber,
            checkpoint_id: formData.checkpointId,
            role: 'operator'
        })

    if (profileError) {
        // Cleanup the auth user if profile creation fails
        await adminClient.auth.admin.deleteUser(authData.user.id)
        throw profileError
    }

    return { success: true, message: "Compte opérateur créé avec succès" }
}

export async function getOperatorsAction() {
    const supabase = await getUserClient()
    const { data, error } = await supabase
        .from("operators")
        .select("*, checkpoint:checkpoints(name)")
        .order("created_at", { ascending: false })

    if (error) throw error
    return data
}

export async function deleteOperatorAction(id: string) {
    const supabase = await getUserClient()

    // Verify admin status
    const { data: { user } } = await supabase.auth.getUser()
    const { data: admin } = await supabase.from("operators").select("role").eq("id", user?.id).single()
    if (admin?.role !== "admin") throw new Error("Accès refusé")

    const adminClient = getAdminClient()

    // Delete from Auth (which cascades to operators table due to REFERENCES auth.users(id) ON DELETE CASCADE)
    const { error } = await adminClient.auth.admin.deleteUser(id)
    if (error) throw error

    return { success: true }
}
