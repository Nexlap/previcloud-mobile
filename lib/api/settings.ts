import { supabase } from '../supabase'
import { ServizioForm } from '../types'

type SettingsProfile = {
  nome_azienda?: string | null
  categoria?: string | null
  citta?: string | null
  piva?: string | null
  telefono?: string | null
  tono?: string | null
  colore_brand?: string | null
  note_pagamento?: string | null
  firma_nome?: string | null
  logo_url?: string | null
}

export type SettingsForm = ReturnType<typeof normalizzaFormProfilo>

type SegnalazioneSettings = {
  tipo: string
  titolo: string
  descrizione: string
  schermata: string
}

type ServizioSettingsRow = {
  id: string
  nome: string
  descrizione: string | null
  costo: number | string | null
  unita: string
}

export function normalizzaFormProfilo(data: SettingsProfile) {
  return {
    nome_azienda: data.nome_azienda || '',
    categoria: data.categoria || 'videomaker',
    citta: data.citta || '',
    piva: data.piva || '',
    telefono: data.telefono || '',
    tono: data.tono || 'professionale e diretto',
    colore_brand: data.colore_brand || '0D1B2A',
    note_pagamento: data.note_pagamento || '',
    firma_nome: data.firma_nome || '',
  }
}

export async function caricaSettingsData() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: serviziData } = await supabase
    .from('servizi')
    .select('*')
    .eq('user_id', user.id)
    .order('ordine', { ascending: true })

  return {
    user,
    profile,
    form: profile ? normalizzaFormProfilo(profile) : null,
    logoUrl: profile?.logo_url || '',
    servizi: serviziData ? (serviziData as ServizioSettingsRow[]).map((servizio) => ({
      ...servizio,
      costo: servizio.costo?.toString() || '',
      descrizione: servizio.descrizione || '',
    })) as ServizioForm[] : null,
  }
}

export async function salvaProfiloSettings(form: SettingsForm) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: null, user: null }

  const { error } = await supabase.from('profiles').update(form).eq('id', user.id)
  return { error, user }
}

export async function inviaSegnalazioneSettings(segnalazione: SegnalazioneSettings) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: null, user: null }

  const { error } = await supabase.from('segnalazioni').insert({
    user_id: user.id,
    tipo: segnalazione.tipo,
    titolo: segnalazione.titolo.trim(),
    descrizione: segnalazione.descrizione.trim(),
    schermata: segnalazione.schermata.trim() || null,
  })

  return { error, user }
}

export async function sessionToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || ''
}

export async function uploadLogoSettings({
  backendUrl,
  token,
  logoBase64,
  mimeType,
}: {
  backendUrl: string
  token: string
  logoBase64: string
  mimeType: string
}) {
  const res = await fetch(`${backendUrl}/api/upload-logo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ logo_base64: logoBase64, mime_type: mimeType })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.logo_url as string
}
