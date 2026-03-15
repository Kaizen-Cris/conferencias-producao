import { NextResponse } from 'next/server'
import { requireAdmin } from '../_utils'

function env(name: string) {
  const v = process.env[name]
  return v && v.trim() ? v : null
}

async function readJsonFromStorage(admin: any, bucket: string, file: string) {
  const { data, error } = await admin.storage.from(bucket).download(file)
  if (error || !data) {
    throw new Error('Falha ao baixar arquivo do storage.')
  }

  const arrayBuffer = await data.arrayBuffer()
  const text = Buffer.from(arrayBuffer).toString('utf-8')
  return JSON.parse(text)
}

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin(req)
    if ('error' in gate) return gate.error

    const { admin } = gate
    const bucket = env('BACKUP_BUCKET') || 'backups'

    const body = await req.json().catch(() => ({}))
    const file = String(body?.file || '')
    if (!file || !file.endsWith('.json')) {
      return NextResponse.json({ error: 'Arquivo inválido.' }, { status: 400 })
    }

    const payload = await readJsonFromStorage(admin, bucket, file)
    const rows = Array.isArray(payload?.rows) ? payload.rows : []

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Backup vazio ou inválido.' }, { status: 400 })
    }

    const batchSize = 500
    let processed = 0

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      const { error } = await admin
        .from('movimentacoes')
        .upsert(batch, { onConflict: 'id' })

      if (error) {
        console.error('[restore-backup] UPSERT ERROR:', error)
        return NextResponse.json({ error: 'Erro ao restaurar backup.' }, { status: 500 })
      }

      processed += batch.length
    }

    return NextResponse.json({ ok: true, count: processed })
  } catch (e: any) {
    console.error('[restore-backup] ERRO:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Erro interno.' }, { status: 500 })
  }
}
