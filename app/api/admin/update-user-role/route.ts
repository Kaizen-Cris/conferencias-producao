import { NextResponse } from 'next/server'
import { requireAdmin } from '../_utils'

type Role = 'OPERADOR' | 'CONFERENTE' | 'SUPERVISOR' | 'ADMIN'

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin(req)
    if ('error' in gate) return gate.error

    const { admin } = gate

    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId || '')
    const newRole = String(body?.role || '') as Role

    const validRoles: Role[] = ['OPERADOR', 'CONFERENTE', 'SUPERVISOR', 'ADMIN']
    if (!userId || !validRoles.includes(newRole)) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }

    const { error } = await admin
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      return NextResponse.json({ error: 'Erro ao atualizar perfil.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, userId, role: newRole })
  } catch (e: any) {
    console.error('[update-user-role] ERRO:', e?.message || e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
