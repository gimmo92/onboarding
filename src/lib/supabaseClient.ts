import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null | undefined
let configError: string | null | undefined

const SERVICE_ROLE_BROWSER_MESSAGE =
  'In Vercel imposta VITE_SUPABASE_ANON_KEY con la chiave anon/public di Supabase, non la service role secret.'

function decodeJwtRole(key: string): string | null {
  try {
    const parts = key.split('.')
    if (parts.length < 2) {
      return null
    }

    const payload = JSON.parse(
      atob(parts[1].replaceAll('-', '+').replaceAll('_', '/'))
    ) as { role?: string }

    return payload.role ?? null
  } catch {
    return null
  }
}

export function getSupabaseBrowserKeyError(): string | null {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!key) {
    return null
  }

  if (decodeJwtRole(key) === 'service_role') {
    return SERVICE_ROLE_BROWSER_MESSAGE
  }

  return null
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      !getSupabaseBrowserKeyError()
  )
}

export function getSupabaseConfigError(): string | null {
  if (configError !== undefined) {
    return configError
  }

  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    configError = null
    return configError
  }

  configError = getSupabaseBrowserKeyError()
  return configError
}

export function getSupabaseClient(): SupabaseClient | null {
  const browserKeyError = getSupabaseConfigError()
  if (browserKeyError) {
    client = null
    return null
  }

  if (!isSupabaseConfigured()) {
    return null
  }

  if (client === undefined) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
  }

  return client
}

export function mapSupabaseClientError(message?: string): string | undefined {
  if (!message) {
    return undefined
  }

  if (message.toLowerCase().includes('secret api key')) {
    return SERVICE_ROLE_BROWSER_MESSAGE
  }

  return message
}
