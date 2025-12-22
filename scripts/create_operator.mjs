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

const email = 'agent@taxiguard.sn'
const password = 'AgentPassword123!'
const fullName = 'Agent de Contrôle'
const badgeNumber = 'TG-AGENT-001'

async function createOperator() {
    console.log(`Attempting to create operator user: ${email}...`)

    // 1. Get first checkpoint ID
    const { data: checkpoints } = await supabase.from('checkpoints').select('id').limit(1)
    const checkpointId = checkpoints?.[0]?.id

    // 2. Create user in Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
    })

    if (authError) {
        if (authError.message.includes('already registered')) {
            console.log('User already exists in Auth. Checking operators table...')
            const { data: users } = await supabase.auth.admin.listUsers()
            const existingUser = users.users.find(u => u.email === email)
            if (existingUser) {
                await upsertOperator(existingUser.id, checkpointId)
            }
        } else {
            console.error('Error creating auth user:', authError.message)
        }
        return
    }

    console.log('Auth user created successfully.')
    await upsertOperator(authData.user.id, checkpointId)
}

async function upsertOperator(userId, checkpointId) {
    // 3. Create/Update record in operators table
    const { error: opError } = await supabase
        .from('operators')
        .upsert({
            id: userId,
            full_name: fullName,
            badge_number: badgeNumber,
            role: 'operator',
            checkpoint_id: checkpointId,
            is_active: true
        })

    if (opError) {
        console.error('Error creating operator record:', opError.message)
    } else {
        console.log('Operator record created/updated successfully.')
        console.log('\n--- Operator Credentials ---')
        console.log(`Email: ${email}`)
        console.log(`Password: ${password}`)
        console.log(`Role: Operator`)
        if (checkpointId) console.log(`Assigned Checkpoint: ${checkpointId}`)
        console.log('-----------------------------\n')
    }
}

createOperator()
