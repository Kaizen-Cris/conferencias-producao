import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function env(name: string) {
  const v = process.env[name]
  return v && v.trim() ? v : null
}

export function getEnv() {
  const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = env('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY') // server-only, SEM NEXT_PUBLIC

  const missing = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length) {
    // Em DEV, devolve a causa real (pra não ficar “Erro interno” eterno)
    throw new Error(`ENV faltando: ${missing.join(', ')}`)
  }

  return { supabaseUrl, anonKey, serviceKey }
}

export async function requireAdmin(req: Request) {
  const { supabaseUrl, anonKey, serviceKey } = getEnv()

  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null

  if (!token) {
    return { error: NextResponse.json({ error: 'Não autorizado (sem token).' }, { status: 401 }) as const }
  }

  // valida token do usuário que chamou
  const publicClient = createClient(supabaseUrl, anonKey)
  const { data: userData, error: userErr } = await publicClient.auth.getUser(token)

  if (userErr || !userData.user) {
    return { error: NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 }) as const }
  }

  // client admin (service role)
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // confere role do chamador (profiles)
  const { data: prof, error: profErr } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profErr) {
    return {
      error: NextResponse.json({ error: `Erro ao validar permissão: ${profErr.message}` }, { status: 500 }) as const,
    }
  }

  if (prof?.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Sem permissão (não é ADMIN).' }, { status: 403 }) as const }
  }

  return { admin, callerId: userData.user.id }
}
