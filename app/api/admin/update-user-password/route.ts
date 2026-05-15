import { NextResponse } from 'next/server'
import { requireAdmin } from '../_utils'

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin(req)
    if ('error' in gate) return gate.error

    const { admin } = gate

    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId || '')
    const newPassword = String(body?.password || '')

    if (!userId || !newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Dados inválidos. Senha deve ter pelo menos 8 caracteres.' }, { status: 400 })
    }

    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (error) {
      console.error('[update-user-password] ERRO:', error.message)
      return NextResponse.json({ error: 'Erro ao alterar senha.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[update-user-password] ERRO:', e?.message || e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}