import { NextResponse } from 'next/server'
import { requireAdmin } from '../_utils'

type Role = 'OPERADOR' | 'CONFERENTE' | 'ADMIN'

export async function GET(req: Request) {
  try {
    const gate = await requireAdmin(req)
    if ('error' in gate) return gate.error

    const { admin } = gate

    // lista usuários do Auth
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 200, page: 1 })
    if (error) {
      return NextResponse.json({ error: error.message || 'Falha ao listar usuários.' }, { status: 500 })
    }

    const authUsers = data?.users || []
    const ids = authUsers.map((u) => u.id)

    // pega roles/is_disabled do profiles
    const { data: profs, error: profErr } = await admin
      .from('profiles')
      .select('id, nome, role, is_disabled')
      .in('id', ids)

    if (profErr) {
      return NextResponse.json({ error: 'Falha ao ler profiles.' }, { status: 500 })
    }

    const profMap = new Map<string, { role: Role; is_disabled: boolean }>()
    ;(profs || []).forEach((p: any) => {
      profMap.set(p.id, {
        role: (p.role as Role) || 'OPERADOR',
        is_disabled: Boolean(p.is_disabled),
      })
    })

    const users = authUsers.map((u) => {
      const p = profMap.get(u.id)
      return {
        id: u.id,
        email: u.email || '',
        role: p?.role || 'OPERADOR',
        is_disabled: p?.is_disabled || false,
      }
    })

    return NextResponse.json({ ok: true, users })
  } catch (e: any) {
    console.error('[list-users] ERRO:', e?.message || e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
