import { router } from 'expo-router'
import { supabase } from '../supabase'

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

export async function caricaClientiPreventivo() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('clienti').select('id, nome').eq('user_id', user.id).order('nome')
  return (data || []) as ClientePreventivo[]
}

export async function caricaMetodiPagamentoPreventivo() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('metodi_pagamento').select('*').eq('user_id', user.id).order('predefinito', { ascending: false })
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
  if (!user) return null
  const { data } = await supabase.from('preventivi').insert({
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
  return data?.id || null
}

export async function aggiornaTitoloPreventivo(preventivoId: string, titolo: string) {
  await supabase.from('preventivi').update({ titolo }).eq('id', preventivoId)
}

export async function segnaPreventivoInviato(preventivoId: string) {
  await supabase.from('preventivi').update({ stato: 'inviato' }).eq('id', preventivoId)
}

export async function salvaTemplatePreferito(template: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('profiles').update({ template_preferito: template }).eq('id', user.id)
}

export async function creaAbbonamentoDaPreventivo({
  cliente,
  preventivoId,
  importoRaw,
  giornoRaw,
  mensilitaRaw,
}: {
  cliente: ClientePreventivo
  preventivoId: string
  importoRaw: string
  giornoRaw: string
  mensilitaRaw: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { esistente: false }

  const importo = parseFloat(importoRaw.replace(',', '.'))
  const giorno = parseInt(giornoRaw)
  const mensilita = mensilitaRaw ? parseInt(mensilitaRaw) : null
  if (!(importo > 0 && giorno >= 1 && giorno <= 31)) return { esistente: false }

  const { data: abEsistente } = await supabase
    .from('abbonamenti')
    .select('id')
    .eq('cliente_id', cliente.id)
    .eq('attivo', true)
    .single()

  if (abEsistente) return { esistente: true }

  const { data: ab } = await supabase.from('abbonamenti').insert({
    user_id: user.id,
    cliente_id: cliente.id,
    importo_default: importo,
    giorno_scadenza: giorno,
    attivo: true,
    preventivo_id: preventivoId,
    numero_mensilita: mensilita,
    tipo: mensilita ? 'rate' : 'canone',
  }).select().single()

  if (!ab) return { esistente: false }

  const ora = new Date()
  const inserimenti = mensilita
    ? Array.from({ length: mensilita }, (_, i) => {
        const d = new Date(ora.getFullYear(), ora.getMonth() + i, 1)
        return { abbonamento_id: ab.id, mese: d.getMonth() + 1, anno: d.getFullYear(), importo, acconto: 0, stato: 'da_incassare' }
      })
    : [{ abbonamento_id: ab.id, mese: ora.getMonth() + 1, anno: ora.getFullYear(), importo, acconto: 0, stato: 'da_incassare' }]
  const { error } = await supabase.from('rate_abbonamento').insert(inserimenti)
  return { esistente: false }
}
