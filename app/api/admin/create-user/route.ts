import { NextResponse } from 'next/server'
import { requireAdmin } from '../_utils'

type Role = 'OPERADOR' | 'CONFERENTE' | 'ADMIN'

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin(req)
    if ('error' in gate) return gate.error

    const { admin } = gate

    const body = (await req.json()) as { email: string; nome: string; password: string; role: Role }
    const email = (body.email || '').trim().toLowerCase()
    const nome = body.nome || ''
    const password = body.password || ''
    const role = body.role

    if (!email || !nome || !password || !role) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Senha muito curta (mínimo recomendado: 8).' }, { status: 400 })
    }

    // cria usuário
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createErr || !created.user) {
      return NextResponse.json({ error: createErr?.message || 'Falha ao criar usuário.' }, { status: 400 })
    }

    // cria/atualiza profile
    const { error: upErr } = await admin.from('profiles').upsert({
      id: created.user.id,
      nome: nome || null,
      role,
      is_disabled: false, // <<< importante p/ o toggle/list
    })

    if (upErr) {
      return NextResponse.json(
        { error: 'Usuário criado, mas falhou ao salvar perfil (profiles).' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, userId: created.user.id })
  } catch (e: any) {
    console.error('[create-user] ERRO:', e?.message || e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
