import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // token de quem chamou (admin logado)
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const publicClient = createClient(supabaseUrl, anonKey)
    const { data: userData } = await publicClient.auth.getUser(token)
    if (!userData?.user) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 })

    const admin = createClient(supabaseUrl, serviceKey)

    // checa se quem chamou é ADMIN
    const { data: me } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (me?.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

    // pega profiles (role + is_disabled)
    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('id, role, is_disabled')

    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 400 })

    // pega usuários do Auth (email)
    const { data: usersRes, error: usersErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 400 })

    const byId = new Map((profiles ?? []).map(p => [p.id, p]))
    const merged = (usersRes.users ?? []).map(u => {
      const p = byId.get(u.id)
      return {
        id: u.id,
        email: u.email ?? '',
        role: p?.role ?? 'OPERADOR',
        is_disabled: p?.is_disabled ?? false,
        created_at: u.created_at ?? null,
      }
    }).sort((a, b) => a.email.localeCompare(b.email))

    return NextResponse.json({ users: merged })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
