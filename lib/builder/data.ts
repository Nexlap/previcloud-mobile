import { supabase } from '../supabase'
import { Cliente, Servizio } from '../types'
import { MetodoPagamento } from '../api/preventivoPdf'

export const metodoContantiDefault = {
  id: 'contanti-default',
  tipo: 'contanti',
  nome: 'Paga in contanti',
  dati: {},
  predefinito: false,
}

export async function caricaMetodiPagamentoBuilder() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { metodiPagamento: null, predefinito: null }

  const { data } = await supabase
    .from('metodi_pagamento')
    .select('*')
    .eq('user_id', user.id)
    .order('predefinito', { ascending: false })

  if (!data) return { metodiPagamento: null, predefinito: null }

  const metodi = data as MetodoPagamento[]
  const haContantiDb = metodi.some((m) => m.tipo === 'contanti')

  return {
    metodiPagamento: haContantiDb ? metodi : [metodoContantiDefault, ...metodi],
    predefinito: metodi.find((metodo) => metodo.predefinito) || null,
  }
}

export async function caricaServiziBuilder(): Promise<Servizio[] | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('servizi')
    .select('*')
    .eq('user_id', user.id)
    .order('ordine', { ascending: true })

  return data
}

export async function caricaClientiBuilder(): Promise<Cliente[] | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('clienti')
    .select('id, nome, telefono, email, indirizzo')
    .eq('user_id', user.id)
    .order('nome')

  return data
}

export async function caricaProfiloFiscaleBuilder() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profili_fiscali')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return data?.attivo ? data : null
}

export async function creaClienteBuilder(nuovoCliente: {
  nome: string
  telefono: string
  email: string
  indirizzo: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('clienti')
    .insert({
      user_id: user.id,
      nome: nuovoCliente.nome.trim(),
      telefono: nuovoCliente.telefono || null,
      email: nuovoCliente.email || null,
      indirizzo: nuovoCliente.indirizzo || null,
    })
    .select()
    .single()

  return data
}
