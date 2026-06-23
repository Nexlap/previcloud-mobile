import { supabase } from '../supabase'

export type NotificaPayloadRata = {
  rata_id?: string
  abbonamento_id?: string
  cliente_id?: string
  cliente_nome?: string
  importo_residuo?: number
  scadenza?: string
  mese?: number
  anno?: number
  tipo_piano?: string
}

export type NotificaPayloadFirma = {
  nomeCliente?: string
  urlFirma?: string
  emailCliente?: string
  telefonoCliente?: string
  chiediPagato?: boolean
  pdfFirmatoUrl?: string
}

export type Notifica = {
  id: string
  tipo: 'firma_ricevuta' | 'reminder_firma' | 'rata_in_scadenza' | 'pagamento_ricevuto' | string
  preventivo_id: string | null
  invio_id: string | null
  titolo: string
  messaggio: string
  payload: NotificaPayloadRata & NotificaPayloadFirma & Record<string, unknown>
  letta: boolean
  snooze_until: string | null
  created_at: string
}

export type NotificaToast = {
  id: string
  titolo: string
  messaggio: string
  tipo: Notifica['tipo']
  preventivo_id: string | null
  cliente_id: string | null
  payload: Notifica['payload']
  leaving: boolean
}

const ORE_RIMANDA_DEFAULT = 24

export function notificaInRimando(n: Notifica, now = Date.now()) {
  if (!n.snooze_until) return false
  return new Date(n.snooze_until).getTime() > now
}

export function notificaContaBadge(n: Notifica, now = Date.now()) {
  return !n.letta && !notificaInRimando(n, now)
}

export function buildToast(raw: Partial<Notifica>): NotificaToast | null {
  if (!raw.id) return null
  const tipo = typeof raw.tipo === 'string' ? raw.tipo : 'firma_ricevuta'
  const payload = (raw.payload || {}) as Notifica['payload']
  return {
    id: raw.id,
    titolo: typeof raw.titolo === 'string' && raw.titolo.trim() ? raw.titolo.trim() : 'Notifica',
    messaggio: typeof raw.messaggio === 'string' ? raw.messaggio : '',
    tipo,
    preventivo_id: raw.preventivo_id ?? null,
    cliente_id: typeof payload.cliente_id === 'string' ? payload.cliente_id : null,
    payload,
    leaving: false,
  }
}

export function contaBadgeCampanella(notifiche: Notifica[], visteLocalmente: Set<string>) {
  return notifiche.filter((n) => notificaContaBadge(n) && !visteLocalmente.has(n.id)).length
}

export async function caricaNotificheCampanella(): Promise<
  { ok: true; notifiche: Notifica[] } | { ok: false; error: string }
> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: true, notifiche: [] }
  const { data, error } = await supabase
    .from('notifiche')
    .select('*')
    .eq('user_id', user.id)
    .eq('letta', false)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) {
    console.error('caricaNotificheCampanella', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true, notifiche: (data || []) as Notifica[] }
}

export async function caricaNotificaById(id: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null as Notifica | null
  const { data, error } = await supabase
    .from('notifiche')
    .select('*')
    .eq('user_id', user.id)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.error('caricaNotificaById', error.message)
    return null
  }
  return (data as Notifica) || null
}

export async function segnaNotificaLetta(id: string) {
  const { error } = await supabase.from('notifiche').update({ letta: true }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function segnaTutteLette() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from('notifiche')
    .update({ letta: true })
    .eq('user_id', user.id)
    .eq('letta', false)
  if (error) throw new Error(error.message)
}

export async function rimandaNotifica(id: string, ore = ORE_RIMANDA_DEFAULT) {
  const snoozeUntil = new Date(Date.now() + ore * 60 * 60 * 1000).toISOString()
  const { error } = await supabase
    .from('notifiche')
    .update({ snooze_until: snoozeUntil })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export function formatTempoNotifica(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Adesso'
  if (min < 60) return `${min} min fa`
  const ore = Math.floor(min / 60)
  if (ore < 24) return `${ore} h fa`
  const giorni = Math.floor(ore / 24)
  if (giorni < 7) return `${giorni} g fa`
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}
