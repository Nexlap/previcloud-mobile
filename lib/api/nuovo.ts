import { router } from 'expo-router'
import { Messaggio } from '../types'
import { supabase } from '../supabase'

export async function tokenNuovo() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    router.replace('/(auth)/login')
    return ''
  }
  return session.access_token
}

export async function caricaMetodiPagamentoNuovo() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('metodi_pagamento').select('*').eq('user_id', user.id).order('predefinito', { ascending: false })
  return data || []
}

export async function caricaBozzaChat(preventivoId: string) {
  const { data } = await supabase.from('preventivi')
    .select('testo_preventivo, messaggi_chat')
    .eq('id', preventivoId)
    .single()
  return data as { testo_preventivo?: string, messaggi_chat?: Messaggio[] } | null
}

export async function salvaBozzaChat({
  testo,
  messaggi,
  titolo,
}: {
  testo: string
  messaggi: Messaggio[]
  titolo: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('preventivi').insert({
    user_id: user.id,
    testo_preventivo: testo,
    messaggi_chat: messaggi,
    stato: 'bozza',
    is_ultimo: true,
    versione: 1,
    titolo,
  })
}

export async function salvaPreventivoNuovo({
  testo,
  importoTotale,
}: {
  testo: string
  importoTotale: number | null
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('preventivi').insert({
    user_id: user.id,
    testo_preventivo: testo,
    importo_totale: importoTotale,
    stato: 'bozza',
    is_ultimo: true,
    versione: 1,
  })
}
