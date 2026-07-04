import { queryConFiltroCestino } from 'previcloud-shared'
import { calcolaIncassoCliente } from './incassi'
import { supabase } from '../supabase'
import { Preventivo } from '../types'

export type CaricaPreventiviOpts = {
  clienteId?: string
  limit?: number
}

export type CaricaPreventiviResult = {
  preventivi: Preventivo[]
  totaleIncasso: number
}

export async function caricaPreventivi(
  opts?: CaricaPreventiviOpts,
): Promise<CaricaPreventiviResult | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const build = (conFiltro: boolean) => {
    let query = supabase
      .from('preventivi')
      .select('*, clienti(nome)')
      .eq('user_id', user.id)
      .eq('is_ultimo', true)
      .order('created_at', { ascending: false })
    if (conFiltro) query = query.is('deleted_at', null)
    if (opts?.clienteId) query = query.eq('cliente_id', opts.clienteId)
    if (opts?.limit) query = query.limit(opts.limit)
    return query
  }

  const incassoPromise = opts?.clienteId
    ? calcolaIncassoCliente(user.id, opts.clienteId)
    : Promise.resolve(0)

  const [{ data }, incasso] = await Promise.all([
    queryConFiltroCestino(() => build(true), () => build(false)),
    incassoPromise,
  ])

  const preventivi = (data || []).map((p: Preventivo & { clienti?: { nome?: string } | null }) => ({
    ...p,
    nome_cliente: p.clienti?.nome || p.nome_cliente || 'Senza cliente',
  }))

  return { preventivi, totaleIncasso: incasso }
}

export async function ricaricaIncassoCliente(clienteId: string): Promise<number | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return calcolaIncassoCliente(user.id, clienteId)
}

export async function cambiaStatoPreventivo(
  id: string,
  aggiornamento: { stato: string; pagato?: boolean; data_pagamento?: string | null },
) {
  return supabase.from('preventivi').update(aggiornamento).eq('id', id)
}

export async function rinominaPreventivo(id: string, titolo: string) {
  return supabase.from('preventivi').update({ titolo }).eq('id', id)
}

export async function spostaPreventivo(
  id: string,
  nuovoClienteId: string,
  nuovoClienteNome: string,
) {
  return supabase
    .from('preventivi')
    .update({ cliente_id: nuovoClienteId, nome_cliente: nuovoClienteNome })
    .eq('id', id)
}
