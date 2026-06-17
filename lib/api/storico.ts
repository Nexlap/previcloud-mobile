import type { PostgrestError } from '@supabase/supabase-js'
import { Cliente, Preventivo } from '../types'
import { supabase } from '../supabase'

export async function eliminaPreventivi(ids: string[]) {
  return supabase.from('preventivi').delete().in('id', ids)
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
