import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function env(name: string) {
  const v = process.env[name]
  return v && v.trim() ? v : null
}

function getEnv() {
  const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
  const cronSecret = env('CRON_SECRET')
  const bucket = env('BACKUP_BUCKET') || 'backups'

  const missing: string[] = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!cronSecret) missing.push('CRON_SECRET')

  if (missing.length) {
    throw new Error(`ENV faltando: ${missing.join(', ')}`)
  }

  return { supabaseUrl: supabaseUrl!, serviceKey: serviceKey!, cronSecret: cronSecret!, bucket }
}

function isAuthorized(req: Request, cronSecret: string) {
  const auth = req.headers.get('authorization') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null
  const headerSecret = req.headers.get('x-cron-secret')
  const url = new URL(req.url)
  const querySecret = url.searchParams.get('secret')

  return bearer === cronSecret || headerSecret === cronSecret || querySecret === cronSecret
}

export async function GET(req: Request) {
  try {
    const { supabaseUrl, serviceKey, cronSecret, bucket } = getEnv()

    if (!isAuthorized(req, cronSecret)) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const all: any[] = []
    const batchSize = 1000
    let from = 0

    while (true) {
      const { data, error } = await admin
        .from('movimentacoes')
        .select('id,item,lote,qtd_informada,caixas,qtd_por_caixa,unidades_avulsas,status,criado_por,criado_em')
        .order('criado_em', { ascending: true })
        .range(from, from + batchSize - 1)

      if (error) {
        console.error('[backup] SELECT ERROR:', error)
        return NextResponse.json({ error: 'Erro ao buscar movimentações.' }, { status: 500 })
      }

      const rows = (data as any[]) ?? []
      if (rows.length === 0) break
      all.push(...rows)
      if (rows.length < batchSize) break
      from += batchSize
    }

    const now = new Date()
    const stamp = now.toISOString().replace(/[:.]/g, '-')
    const filename = `movimentacoes_${stamp}.json`

    const payload = {
      generated_at: now.toISOString(),
      count: all.length,
      rows: all,
    }

    const fileBody = Buffer.from(JSON.stringify(payload, null, 2))

    const { error: upErr } = await admin.storage
      .from(bucket)
      .upload(filename, fileBody, {
        contentType: 'application/json',
        upsert: true,
      })

    if (upErr) {
      console.error('[backup] UPLOAD ERROR:', upErr)
      return NextResponse.json({ error: 'Erro ao enviar backup para o storage.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, file: filename, count: all.length })
  } catch (e: any) {
    console.error('[backup] ERRO:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Erro interno.' }, { status: 500 })
  }
}
