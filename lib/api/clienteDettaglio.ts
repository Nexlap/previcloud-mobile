import { Cliente, Preventivo, Trascrizione } from '../types'
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

export async function eliminaClienteDettaglio(clienteId: string) {
  return supabase.from('clienti').delete().eq('id', clienteId)
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

export async function caricaCronologiaCliente(padreId: string | null): Promise<Preventivo[]> {
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

export async function eliminaPreventiviCliente(ids: string[]) {
  await Promise.all(ids.map(id => supabase.from('preventivi').delete().eq('id', id)))
}

export async function spostaPreventiviCliente(ids: string[], nuovoClienteId: string, nuovoClienteNome: string) {
  await Promise.all(ids.map(id =>
    supabase.from('preventivi').update({ cliente_id: nuovoClienteId, nome_cliente: nuovoClienteNome }).eq('id', id)
  ))
}

export async function sessioneClienteDettaglio() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
