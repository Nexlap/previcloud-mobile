import { supabase } from '../supabase'

export async function eliminaClienti(ids: string[]) {
  return supabase.from('clienti').delete().in('id', ids)
}
