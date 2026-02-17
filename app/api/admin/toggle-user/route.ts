import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const publicClient = createClient(supabaseUrl, anonKey)
    const { data: userData } = await publicClient.auth.getUser(token)
    if (!userData?.user) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 })

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: me } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (me?.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

    const body = await req.json()
    const userId = String(body.userId || '')
    const is_disabled = Boolean(body.is_disabled)

    if (!userId) return NextResponse.json({ error: 'userId inválido.' }, { status: 400 })

    const { error } = await admin
      .from('profiles')
      .update({ is_disabled })
      .eq('id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
