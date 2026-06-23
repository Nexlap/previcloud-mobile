import type { Preventivo } from '../types'
import { supabase } from '../supabase'

export async function caricaCronologiaPreventivo(padreId: string | null): Promise<Preventivo[]> {
  if (!padreId) return []

  const versioni: Preventivo[] = []
  let currentId: string | null = padreId
  while (currentId) {
    const result = await supabase.from('preventivi').select('*').eq('id', currentId).single()
    const data = result.data as Preventivo | null
    if (!data) break
    versioni.unshift(data)
    currentId = data.preventivo_padre_id
  }

  return versioni
}
