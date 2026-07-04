import { spostaPreventiviInCestino } from '../cestino'
import { queryConFiltroCestino } from 'previcloud-shared'
import { Cliente, Trascrizione } from '../types'
import { supabase } from '../supabase'

export async function caricaClienteDettaglio(clienteId: string) {
  const [{ data: cliente }, { data: trascrizioni }] = await Promise.all([
    supabase.from('clienti').select('*').eq('id', clienteId).single(),
    supabase.from('trascrizioni').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }),
  ])

  return {
    cliente: cliente as Cliente | null,
    trascrizioni: (trascrizioni || []) as Trascrizione[],
  }
}

type ClienteAggiornamento = Partial<Pick<Cliente, 'nome' | 'telefono' | 'email' | 'indirizzo' | 'note'>>

export async function aggiornaClienteDettaglio(clienteId: string, aggiornamento: ClienteAggiornamento) {
  return supabase.from('clienti').update(aggiornamento).eq('id', clienteId)
}

export async function caricaClientiDisponibili(clienteId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('clienti')
    .select('id, nome')
    .eq('user_id', user.id)
    .neq('id', clienteId)
    .order('nome')

  return data || []
}

export async function eliminaPreventiviCliente(ids: string[]) {
  return spostaPreventiviInCestino(ids)
}

export async function spostaPreventiviCliente(ids: string[], nuovoClienteId: string, nuovoClienteNome: string) {
  await Promise.all(ids.map(id =>
    supabase.from('preventivi').update({ cliente_id: nuovoClienteId, nome_cliente: nuovoClienteNome }).eq('id', id)
  ))
}

export async function caricaCollegamentiPianoPreventivo(clienteId: string) {
  const build = (conFiltro: boolean) => {
    let q = supabase
      .from('abbonamenti')
      .select('preventivo_id, tipo, attivo, created_at')
      .eq('cliente_id', clienteId)
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

export async function sessioneClienteDettaglio() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
