import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type GateOk = { admin: SupabaseClient; callerId: string }
type GateErr = { error: NextResponse }
export type Gate = GateOk | GateErr

function env(name: string) {
  const v = process.env[name]
  return v && v.trim() ? v : null
}

function getEnv() {
  const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = env('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY') // server-only

  const missing: string[] = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length) {
    throw new Error(`ENV faltando: ${missing.join(', ')}`)
  }

  return { supabaseUrl: supabaseUrl!, anonKey: anonKey!, serviceKey: serviceKey! }
}

export async function requireAdmin(req: Request): Promise<Gate> {
  try {
    const { supabaseUrl, anonKey, serviceKey } = getEnv()

    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null

    if (!token) {
      return { error: NextResponse.json({ error: 'Não autorizado (sem token).' }, { status: 401 }) }
    }

    // valida token do usuário
    const publicClient = createClient(supabaseUrl, anonKey)
    const { data: userData, error: userErr } = await publicClient.auth.getUser(token)

    if (userErr || !userData.user) {
      return { error: NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 }) }
    }

    // client admin (service role)
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // confere role do chamador
    const { data: prof, error: profErr } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (profErr) {
      return {
        error: NextResponse.json({ error: `Erro ao validar permissão: ${profErr.message}` }, { status: 500 }),
      }
    }

    if (prof?.role !== 'ADMIN') {
      return { error: NextResponse.json({ error: 'Sem permissão (não é ADMIN).' }, { status: 403 }) }
    }

    return { admin, callerId: userData.user.id }
  } catch (e: any) {
    console.error('[requireAdmin] ERRO:', e?.message || e)
    return { error: NextResponse.json({ error: e?.message || 'Erro interno.' }, { status: 500 }) }
  }
}
