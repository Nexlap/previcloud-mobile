import { supabase } from '../supabase'

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
  reminder_firma_giorni?: number | null
  reminder_firma_globale_disabilitato?: boolean | null
}

export type SettingsForm = {
  nome_azienda: string
  categoria: string
  citta: string
  piva: string
  telefono: string
  tono: string
  colore_brand: string
  note_pagamento: string
  firma_nome: string
  reminder_firma_giorni: number
  reminder_firma_globale_disabilitato: boolean
}

type SegnalazioneSettings = {
  tipo: string
  titolo: string
  descrizione: string
  schermata: string
}

export function normalizzaFormProfilo(data: SettingsProfile): SettingsForm {
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
    reminder_firma_giorni: typeof data.reminder_firma_giorni === 'number' ? data.reminder_firma_giorni : 3,
    reminder_firma_globale_disabilitato: Boolean(data.reminder_firma_globale_disabilitato),
  }
}

export async function caricaSettingsData() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return {
    user,
    profile,
    form: profile ? normalizzaFormProfilo(profile) : null,
    logoUrl: profile?.logo_url || '',
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
