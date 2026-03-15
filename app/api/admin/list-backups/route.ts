import { NextResponse } from 'next/server'
import { requireAdmin } from '../_utils'

function env(name: string) {
  const v = process.env[name]
  return v && v.trim() ? v : null
}

export async function GET(req: Request) {
  try {
    const gate = await requireAdmin(req)
    if ('error' in gate) return gate.error

    const { admin } = gate
    const bucket = env('BACKUP_BUCKET') || 'backups'

    const { data, error } = await admin.storage.from(bucket).list('', {
      limit: 200,
      sortBy: { column: 'name', order: 'desc' },
    })

    if (error) {
      return NextResponse.json({ error: 'Falha ao listar backups.' }, { status: 500 })
    }

    const files = (data || [])
      .filter((f) => f.name?.endsWith('.json'))
      .map((f) => ({
        name: f.name,
        created_at: f.created_at || null,
        updated_at: f.updated_at || null,
      }))

    return NextResponse.json({ ok: true, files })
  } catch (e: any) {
    console.error('[list-backups] ERRO:', e?.message || e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
