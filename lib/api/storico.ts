import type { PostgrestError } from '@supabase/supabase-js'
import { spostaPreventiviInCestino } from '../cestino'
import { queryConFiltroCestino } from 'previcloud-shared'
import { Cliente } from '../types'
import { supabase } from '../supabase'
import { caricaCronologiaPreventivo } from './preventivoCronologia'

export { caricaCronologiaPreventivo }

export async function eliminaPreventivi(ids: string[]) {
  return spostaPreventiviInCestino(ids)
}

export async function cambiaStatoPreventivi(ids: string[], stato: string) {
  return supabase.from('preventivi').update({ stato }).in('id', ids)
}

export async function caricaClientiPerSposta(): Promise<{ data: Cliente[] | null, error: PostgrestError | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: null }

  const { data, error } = await supabase
    .from('clienti')
    .select('id, nome, telefono, email, indirizzo')
    .eq('user_id', user.id)
    .order('nome')

  return { data: (data || []) as Cliente[], error }
}

export async function spostaPreventivi(ids: string[], cliente: Cliente) {
  return supabase
    .from('preventivi')
    .update({ cliente_id: cliente.id, nome_cliente: cliente.nome })
    .in('id', ids)
}

export async function ripristinaVersionePreventivo(preventivoCorrenteId: string, versioneId: string) {
  await supabase.from('preventivi').update({ is_ultimo: false }).eq('id', preventivoCorrenteId)
  return supabase.from('preventivi').update({ is_ultimo: true }).eq('id', versioneId)
}

export async function caricaCollegamentiPianoPreventivi(): Promise<Record<string, 'canone' | 'rate'>> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}

  const build = (conFiltro: boolean) => {
    let q = supabase
      .from('abbonamenti')
      .select('preventivo_id, tipo, created_at')
      .eq('user_id', user.id)
      .eq('attivo', true)
      .not('preventivo_id', 'is', null)
      .order('created_at', { ascending: false })
    if (conFiltro) q = q.is('deleted_at', null)
    return q
  }

  const { data } = await queryConFiltroCestino(() => build(true), () => build(false))

  const map: Record<string, 'canone' | 'rate'> = {}
  for (const row of data || []) {
    if (row.preventivo_id && !map[row.preventivo_id]) {
      map[row.preventivo_id] = row.tipo as 'canone' | 'rate'
    }
  }
  return map
}

