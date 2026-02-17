import { supabase } from './supabase'

export type Role = 'OPERADOR' | 'CONFERENTE' | 'ADMIN'

// ✅ cache simples em memória (evita Menu + Page chamarem toda hora)
let roleCache: { value: Role | null; userId: string | null; at: number } = {
  value: null,
  userId: null,
  at: 0,
}

const CACHE_MS = 10_000 // 10s (pode ajustar)

export async function getMyRole(opts?: { bypassCache?: boolean }): Promise<Role | null> {
  const bypassCache = opts?.bypassCache ?? false

  const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
  if (sessErr) {
    console.log('ROLE SESSION ERROR:', sessErr)
    return null
  }

  const userId = sessionData.session?.user?.id ?? null
  if (!userId) return null

  // ✅ cache
  if (!bypassCache) {
    const isSameUser = roleCache.userId === userId
    const fresh = Date.now() - roleCache.at < CACHE_MS
    if (isSameUser && fresh) return roleCache.value
  }

  // ✅ IMPORTANTE: não usar .single() (quebra quando não existe profile)
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.log('ROLE ERROR:', error)
    roleCache = { value: null, userId, at: Date.now() }
    return null
  }

  const role = (data?.role as Role) ?? null

  roleCache = { value: role, userId, at: Date.now() }
  return role
}

// opcional: se quiser limpar cache ao sair
export function clearRoleCache() {
  roleCache = { value: null, userId: null, at: 0 }
}
