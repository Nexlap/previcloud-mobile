import { queryConFiltroCestino } from 'previcloud-shared'
import { supabase } from '../supabase'
import { Cliente } from '../types'
import { trackEvento } from './track'

async function eliminaDatiCollegatiClienti(clienteIds: string[]) {
  if (clienteIds.length === 0) return null

  const { data: abbonamenti, error: abSelErr } = await supabase
    .from('abbonamenti')
    .select('id')
    .in('cliente_id', clienteIds)

  if (abSelErr) return abSelErr

  const abbonamentoIds = (abbonamenti || []).map(a => a.id)
  if (abbonamentoIds.length > 0) {
    const { error: rateErr } = await supabase
      .from('rate_abbonamento')
      .delete()
      .in('abbonamento_id', abbonamentoIds)
    if (rateErr) return rateErr

    const { error: abErr } = await supabase
      .from('abbonamenti')
      .delete()
      .in('id', abbonamentoIds)
    if (abErr) return abErr
  }

  const { error: trErr } = await supabase
    .from('trascrizioni')
    .delete()
    .in('cliente_id', clienteIds)
  if (trErr) return trErr

  const { error: prevErr } = await supabase
    .from('preventivi')
    .delete()
    .in('cliente_id', clienteIds)
  if (prevErr) return prevErr

  return null
}

export async function eliminaClienti(ids: string[]) {
  const cleanupError = await eliminaDatiCollegatiClienti(ids)
  if (cleanupError) return { data: null, error: cleanupError }

  return supabase.from('clienti').delete().in('id', ids)
}

export async function caricaClientiConStats(): Promise<Cliente[] | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('clienti')
    .select('*')
    .eq('user_id', user.id)
    .order('nome', { ascending: true })

  if (!data) return []

  return Promise.all(data.map(async (c) => {
    const base = () =>
      supabase
        .from('preventivi')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', c.id)
        .eq('is_ultimo', true)
    const { count } = await queryConFiltroCestino(
      () => base().is('deleted_at', null),
      () => base(),
    )

    return {
      ...c,
      num_preventivi: count || 0,
    }
  }))
}

export async function creaCliente(dati: {
  nome: string
  telefono: string
  email: string
  note: string
  indirizzo?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Non autenticato') }

  const result = await supabase
    .from('clienti')
    .insert({
      nome: dati.nome,
      telefono: dati.telefono,
      email: dati.email,
      note: dati.note,
      indirizzo: dati.indirizzo || null,
      user_id: user.id,
    })
    .select()
    .single()

  if (result.data && !result.error) {
    void trackEvento('cliente_creato', 'clienti')
  }

  return result
}

export async function aggiornaCliente(
  id: string,
  dati: Partial<Pick<Cliente, 'nome' | 'telefono' | 'email' | 'note' | 'indirizzo'>>,
) {
  const payload = { ...dati }
  if (dati.indirizzo !== undefined) payload.indirizzo = dati.indirizzo || null
  return supabase.from('clienti').update(payload).eq('id', id)
}
