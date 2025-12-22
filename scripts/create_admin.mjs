import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load env vars from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

const email = 'admin@taxiguard.sn'
const password = 'AdminPassword123!'
const fullName = 'Admin Principal'
const badgeNumber = 'TG-ADMIN-001'

async function createAdmin() {
    console.log(`Attempting to create admin user: ${email}...`)

    // 1. Create user in Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
    })

    if (authError) {
        if (authError.message.includes('already registered')) {
            console.log('User already exists in Auth. Checking operators table...')
            // Try to get the user ID if they already exist
            const { data: users } = await supabase.auth.admin.listUsers()
            const existingUser = users.users.find(u => u.email === email)
            if (existingUser) {
                await upsertOperator(existingUser.id)
            }
        } else {
            console.error('Error creating auth user:', authError.message)
        }
        return
    }

    console.log('Auth user created successfully.')
    await upsertOperator(authData.user.id)
}

async function upsertOperator(userId) {
    // 2. Create/Update record in operators table
    const { error: opError } = await supabase
        .from('operators')
        .upsert({
            id: userId,
            full_name: fullName,
            badge_number: badgeNumber,
            role: 'admin',
            is_active: true
        })

    if (opError) {
        console.error('Error creating operator record:', opError.message)
    } else {
        console.log('Admin operator record created/updated successfully.')
        console.log('\n--- Credentials ---')
        console.log(`Email: ${email}`)
        console.log(`Password: ${password}`)
        console.log('-------------------\n')
    }
}

createAdmin()
