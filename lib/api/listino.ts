import { supabase } from '../supabase'
import { ServizioForm } from '../types'

type ServizioRow = {
  id: string
  nome: string
  descrizione: string | null
  costo: number | string | null
  unita: string
  ordine?: number
}

type ServizioPayload = {
  nome?: string
  descrizione?: string | null
  costo?: number | null
  unita?: string
  ordine?: number
}

export type ServizioAI = {
  nome: string
  descrizione?: string | null
  costo?: string | number | null
  unita?: string | null
}

type ServizioInsert = {
  user_id: string
  nome: string
  descrizione: string | null
  costo: number | null
  unita: string
  ordine: number
}

export function normalizzaServizioListino(servizio: ServizioRow): ServizioForm {
  return {
    ...servizio,
    costo: servizio.costo?.toString() || '',
    descrizione: servizio.descrizione || '',
  }
}

export async function caricaServiziListino(): Promise<ServizioForm[] | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('servizi')
    .select('*')
    .eq('user_id', user.id)
    .order('ordine', { ascending: true })

  return data ? data.map(normalizzaServizioListino) : null
}

export async function aggiornaServizioListino(id: string, payload: ServizioPayload) {
  return supabase.from('servizi').update(payload).eq('id', id)
}

export async function eliminaServizioListino(id: string) {
  return supabase.from('servizi').delete().eq('id', id)
}

export async function eliminaServiziListino(ids: string[]) {
  return supabase.from('servizi').delete().in('id', ids)
}

export async function preparaServiziDaAI(servizi: ServizioAI[], ordineBase: number) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return servizi.map((servizio, index) => ({
    user_id: user.id,
    nome: servizio.nome,
    descrizione: servizio.descrizione || null,
    costo: servizio.costo ? parseFloat(String(servizio.costo)) : null,
    unita: servizio.unita || 'cad',
    ordine: ordineBase + index,
  }))
}

export async function inserisciServiziListino(servizi: ServizioInsert[]) {
  return supabase.from('servizi').insert(servizi).select()
}
