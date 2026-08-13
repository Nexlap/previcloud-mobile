import { Platform } from 'react-native'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { BACKEND_URL } from '../constants'
import { mergeMessaggiCliente, type MessaggiClienteTemplates } from 'previcloud-shared'
import { invalidaCacheMessaggiCliente } from '../messaggiCliente'

// Codice Postgrest per "nessuna riga trovata" (.single() su 0 risultati) — è l'unico
// errore che rappresenta legittimamente un profilo non ancora creato, non un fetch fallito.
const NESSUNA_RIGA_TROVATA = 'PGRST116'

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
  messaggi_cliente?: Partial<MessaggiClienteTemplates> | null
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
  messaggi: MessaggiClienteTemplates
}

type SegnalazioneSettings = {
  tipo: string
  titolo: string
  descrizione: string
  schermata: string
  screenshotUri?: string
}

async function caricaScreenshot(userId: string, uri: string): Promise<string | null> {
  try {
    const ext = uri.split('.').pop() ?? 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`
    const response = await fetch(uri)
    const blob = await response.blob()
    const arrayBuffer = await new Response(blob).arrayBuffer()
    const { error } = await supabase.storage
      .from('segnalazioni')
      .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: false })
    if (error) return null
    return path
  } catch {
    return null
  }
}

export async function inviaSegnalazioneSettings(segnalazione: SegnalazioneSettings) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: null, user: null }

  let screenshot_url: string | null = null
  if (segnalazione.screenshotUri) {
    screenshot_url = await caricaScreenshot(user.id, segnalazione.screenshotUri)
  }

  const { error } = await supabase.from('segnalazioni').insert({
    user_id: user.id,
    tipo: segnalazione.tipo,
    titolo: segnalazione.titolo.trim(),
    descrizione: segnalazione.descrizione.trim(),
    schermata: segnalazione.schermata.trim() || null,
    piattaforma: Platform.OS,
    screenshot_url: screenshot_url ?? null,
  })

  if (!error) {
    fetch(`${BACKEND_URL}/api/segnalazione-notifica`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        titolo: segnalazione.titolo.trim(),
        descrizione: segnalazione.descrizione.trim(),
        tipo: segnalazione.tipo,
        schermata: segnalazione.schermata.trim() || null,
        piattaforma: Platform.OS,
      }),
    }).catch((e) => console.error('Notifica email segnalazione fallita:', e))
  }

  return { error, user }
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
    messaggi: mergeMessaggiCliente(data.messaggi_cliente),
  }
}

export async function caricaSettingsData() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Un profilo mancante (PGRST116) è legittimo per un utente nuovo; qualsiasi altro
  // errore (rete, RLS, timeout) va segnalato invece di restituire form:null in silenzio,
  // altrimenti i chiamanti rischiano di trattare i default come dati reali e salvarli.
  const fetchError = error && error.code !== NESSUNA_RIGA_TROVATA ? error : null

  return {
    user,
    profile: profile ?? null,
    form: profile ? normalizzaFormProfilo(profile) : null,
    logoUrl: profile?.logo_url || '',
    error: fetchError,
  }
}

export async function salvaProfiloSettings(form: SettingsForm) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: null, user: null }

  const { messaggi, ...profileFields } = form
  const { error } = await supabase.from('profiles').update({
    ...profileFields,
    messaggi_cliente: messaggi,
  }).eq('id', user.id)
  if (!error) invalidaCacheMessaggiCliente()
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
