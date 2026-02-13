import { supabase } from './supabase'

export type Role = 'OPERADOR' | 'CONFERENTE' | 'ADMIN'

export async function getMyRole(): Promise<Role | null> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user?.id

  if (!userId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error) {
    console.log('ROLE ERROR:', error)
    return null
  }

  return (data?.role as Role) ?? null
}
