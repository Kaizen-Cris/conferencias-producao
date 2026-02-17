import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Role = 'OPERADOR' | 'CONFERENTE' | 'ADMIN'

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // 1) Pega token do usuário logado (quem está tentando criar)
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    // 2) Client público só pra validar quem é o usuário do token
    const publicClient = createClient(supabaseUrl, anonKey)
    const { data: userData, error: userErr } = await publicClient.auth.getUser(token)
    if (userErr || !userData.user) {
      return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 })
    }

    // 3) Client admin (service role) para bypass de RLS
    const admin = createClient(supabaseUrl, serviceKey)

    // 4) Confere se quem chamou é ADMIN
    const { data: prof, error: profErr } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (profErr || prof?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }

    // 5) Lê body e cria usuário
    const body = (await req.json()) as { email: string; password: string; role: Role }
    const email = (body.email || '').trim()
    const password = body.password || ''
    const role = body.role

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createErr || !created.user) {
      return NextResponse.json({ error: createErr?.message || 'Falha ao criar usuário.' }, { status: 400 })
    }

    // 6) Cria/atualiza profile com role
    const { error: upErr } = await admin
      .from('profiles')
      .upsert({ id: created.user.id, role })

    if (upErr) {
      return NextResponse.json({ error: 'Usuário criado, mas falhou ao salvar perfil.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, userId: created.user.id })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
