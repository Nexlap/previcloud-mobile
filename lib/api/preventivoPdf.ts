import { router } from 'expo-router'
import { supabase } from '../supabase'
import {
  creaAbbonamentoDaPreventivo as creaAbbonamentoCore,
  creaPianoRateDaPreventivo as creaPianoRateCore,
} from 'previcloud-shared'
import { preventivoPianiDb } from './preventivoPdfPianiDb'

export type ClientePreventivo = { id: string, nome: string }
export type MetodoPagamento = {
  id: string
  tipo: 'bonifico' | 'paypal' | 'contanti' | 'carta' | 'stripe'
  nome: string
  dati?: Record<string, string> | null
  predefinito?: boolean | null
}

export async function tokenPreventivoPdf() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    router.replace('/(auth)/login')
    return ''
  }
  return session.access_token
}

export async function caricaClientePreventivo(clienteId: string) {
  const { data } = await supabase.from('clienti').select('id, nome').eq('id', clienteId).single()
  return data as ClientePreventivo | null
}

export async function caricaTemplatePreferito() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ''
  const { data } = await supabase.from('profiles').select('template_preferito').eq('id', user.id).single()
  return data?.template_preferito || ''
}

export async function caricaClientiPreventivo(): Promise<ClientePreventivo[] | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase.from('clienti').select('id, nome').eq('user_id', user.id).order('nome')
  if (error) return null
  return (data || []) as ClientePreventivo[]
}

export async function caricaMetodiPagamentoPreventivo(): Promise<MetodoPagamento[] | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase.from('metodi_pagamento').select('*').eq('user_id', user.id).order('predefinito', { ascending: false })
  if (error) return null
  return (data || []) as MetodoPagamento[]
}

export async function creaClientePreventivo(nome: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('clienti')
    .insert({ nome: nome.trim(), user_id: user.id })
    .select().single()
  return data as ClientePreventivo | null
}

export async function salvaPreventivoPdf({
  testo,
  template,
  versione,
  versionePadreId,
  cliente,
  titolo,
  pdfUrl,
  importoTotale,
}: {
  testo: string
  template: string
  versione: number
  versionePadreId?: string | null
  cliente: ClientePreventivo | null
  titolo: string
  pdfUrl?: string
  importoTotale: number | null
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Utente non autenticato')
  const { data, error } = await supabase.from('preventivi').insert({
    user_id: user.id,
    testo_preventivo: testo,
    template,
    versione,
    preventivo_padre_id: versionePadreId || null,
    is_ultimo: true,
    stato: 'bozza',
    cliente_id: cliente?.id || null,
    nome_cliente: cliente?.nome || null,
    titolo,
    pdf_url: pdfUrl || null,
    importo_totale: importoTotale,
  }).select('id').single()
  if (error || !data?.id) {
    throw new Error(error?.message || 'Salvataggio del preventivo non riuscito')
  }
  return data.id
}

export async function aggiornaTitoloPreventivo(preventivoId: string, titolo: string) {
  const { error } = await supabase.from('preventivi').update({ titolo }).eq('id', preventivoId)
  if (error) throw new Error(error.message)
}

export async function segnaPreventivoInviato(preventivoId: string) {
  return supabase.from('preventivi').update({ stato: 'inviato' }).eq('id', preventivoId)
}

export async function caricaInfoPagamentoPreventivo(preventivoId: string) {
  const [{ data: prev }, { data: ab }] = await Promise.all([
    supabase.from('preventivi').select('stato, pagato, data_pagamento').eq('id', preventivoId).single(),
    supabase.from('abbonamenti').select('id').eq('preventivo_id', preventivoId).maybeSingle(),
  ])
  if (!prev) return null
  return {
    stato: prev.stato as string,
    pagato: prev.pagato ?? false,
    data_pagamento: (prev.data_pagamento as string | null) ?? null,
    haAbbonamento: !!ab,
  }
}

export async function segnaPreventivoPagato(preventivoId: string, pagato: boolean, dataPagamento?: string) {
  const update = pagato
    ? { pagato: true, data_pagamento: dataPagamento || new Date().toISOString() }
    : { pagato: false, data_pagamento: null }
  return supabase.from('preventivi').update(update).eq('id', preventivoId)
}

export async function salvaTemplatePreferito(template: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('profiles').update({ template_preferito: template }).eq('id', user.id)
}

export async function creaAbbonamentoDaPreventivo(params: {
  cliente: ClientePreventivo
  preventivoId: string
  importoRaw: string
  giornoRaw: string
  meseInizioRaw: string
  mensilitaRaw: string
}) {
  return creaAbbonamentoCore(preventivoPianiDb, params)
}

export async function creaPianoRateDaPreventivo(params: {
  cliente: ClientePreventivo
  preventivoId: string
  importoTotale: number
  numeroRateRaw: string
  giornoScadenzaRaw: string
  meseInizioRaw: string
}) {
  return creaPianoRateCore(preventivoPianiDb, params)
}
