/**
 * Application configuration
 * Centralized configuration for API URLs and environment variables
 */

export const config = {
  api: {
    visionApiUrl: process.env.NEXT_PUBLIC_VISION_API_URL || 'http://localhost:8000',
    visionApiEndpoint: `${process.env.NEXT_PUBLIC_VISION_API_URL || 'http://localhost:8000'}/api/v1/ocr/`,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  app: {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },
} as const

// Validate required environment variables
export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }
}

// Validate on module load in production
if (config.app.isProduction) {
  validateEnv()
}

