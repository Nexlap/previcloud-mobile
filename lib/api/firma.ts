import { Linking, Share } from 'react-native'
import { BACKEND_URL } from '../constants'
import { supabase } from '../supabase'
import { sessionToken } from './settings'

export type CanaleFirma = 'whatsapp' | 'email' | 'link'

export type PreventivoInvio = {
  id: string
  preventivo_id: string
  link_token?: string | null
  inviato_at: string
  scade_at: string
  firmato_at: string | null
  revocato_at: string | null
  firma_immagine_url: string | null
  pdf_firmato_url: string | null
  reminder_disabilitato: boolean
  canale: CanaleFirma | null
}

const FIRMA_WEB_BASE_URL = 'https://preventivoai-web.vercel.app'

export async function inviaPreventivoPerFirma(preventivoId: string, canale: CanaleFirma, token?: string) {
  const auth = token || (await sessionToken())
  const res = await fetch(`${BACKEND_URL}/api/preventivi/${preventivoId}/invia-firma`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` },
    body: JSON.stringify({ canale }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Errore server (${res.status})`)
  if (data.error) throw new Error(data.error)
  return data as {
    invio_id: string
    url: string | null
    riuso: boolean
    scade_at: string
  }
}

export async function caricaInviiFirma(preventivoIds: string[]) {
  if (preventivoIds.length === 0) return {} as Record<string, PreventivoInvio>
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}
  const { data } = await supabase
    .from('preventivo_invii')
    .select('*')
    .eq('user_id', user.id)
    .in('preventivo_id', preventivoIds)
    .order('inviato_at', { ascending: false })
  const map: Record<string, PreventivoInvio> = {}
  for (const row of data || []) {
    if (!map[row.preventivo_id]) map[row.preventivo_id] = row as PreventivoInvio
  }
  return map
}

export async function caricaContattiCliente(clienteId: string) {
  const { data } = await supabase.from('clienti').select('nome, email, telefono').eq('id', clienteId).single()
  return data
}

export function urlFirmaDaInvio(invio?: PreventivoInvio) {
  if (!invio?.link_token) return null
  return `${FIRMA_WEB_BASE_URL}/p/${invio.link_token}`
}

export async function ottieniUrlFirma(preventivoId: string, invio?: PreventivoInvio) {
  const daInvio = urlFirmaDaInvio(invio)
  if (daInvio) return daInvio
  const res = await inviaPreventivoPerFirma(preventivoId, 'link')
  if (!res.url) throw new Error('Link firma non disponibile')
  return res.url
}

export function testoInvioFirma(nomeCliente: string, url: string, nomeAzienda?: string) {
  const chi = nomeAzienda || 'Il tuo artigiano'
  return `${chi} ti ha inviato un preventivo da firmare.\n\nCliente: ${nomeCliente}\n\nApri il link, leggi il preventivo e firma online:\n${url}\n\nIl link è valido 30 giorni.`
}

export async function apriWhatsAppFirma(telefono: string | null | undefined, testo: string) {
  const phone = telefono?.replace(/\s/g, '').replace(/^\+/, '') || ''
  const url = phone ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(testo)}` : `whatsapp://send?text=${encodeURIComponent(testo)}`
  const can = await Linking.canOpenURL(url)
  if (!can) throw new Error('WhatsApp non disponibile')
  await Linking.openURL(url)
}

export async function apriEmailFirma(email: string | null | undefined, testo: string, oggetto: string) {
  const params = `subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(testo)}`
  const href = email ? `mailto:${encodeURIComponent(email)}?${params}` : `mailto:?${params}`
  const can = await Linking.canOpenURL(href)
  if (!can) throw new Error('App email non disponibile')
  await Linking.openURL(href)
}

export async function copiaLinkFirma(url: string) {
  await Share.share({ message: url })
}

export function statoFirmaInvio(invio?: PreventivoInvio) {
  if (!invio) return 'nessuno' as const
  if (invio.firmato_at) return 'firmato' as const
  if (invio.revocato_at) return 'revocato' as const
  if (new Date(invio.scade_at) < new Date()) return 'scaduto' as const
  return 'attesa' as const
}

export async function disabilitaReminderInvio(invioId: string) {
  const { error } = await supabase.from('preventivo_invii').update({ reminder_disabilitato: true }).eq('id', invioId)
  if (error) throw new Error(error.message)
}

export async function registraReminderWhatsapp(invioId: string) {
  const { error } = await supabase.from('preventivo_invii_eventi').insert({ invio_id: invioId, tipo: 'reminder_whatsapp' })
  if (error) throw new Error(error.message)
}
