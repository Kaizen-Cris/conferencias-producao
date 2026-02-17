import { NextResponse } from 'next/server'
import { requireAdmin } from '../_utils'

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin(req)
    if ('error' in gate) return gate.error

    const { admin } = gate

    const body = (await req.json()) as { userId: string; is_disabled: boolean }
    const userId = body.userId
    const is_disabled = Boolean(body.is_disabled)

    if (!userId) {
      return NextResponse.json({ error: 'userId inválido.' }, { status: 400 })
    }

    const { error } = await admin.from('profiles').update({ is_disabled }).eq('id', userId)
    if (error) {
      return NextResponse.json({ error: 'Falha ao atualizar profiles.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[toggle-user] ERRO:', e?.message || e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
