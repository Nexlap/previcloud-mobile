import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { supabase } from '../supabase'

export type Notifica = {
  id: string
  tipo: 'firma_ricevuta' | 'reminder_firma'
  preventivo_id: string | null
  invio_id: string | null
  titolo: string
  messaggio: string
  payload: Record<string, unknown>
  letta: boolean
  snooze_until: string | null
  created_at: string
}

const ORE_RIMANDA_DEFAULT = 24

export function notificaInRimando(n: Notifica, now = Date.now()) {
  if (!n.snooze_until) return false
  return new Date(n.snooze_until).getTime() > now
}

export function notificaContaBadge(n: Notifica, now = Date.now()) {
  return !n.letta && !notificaInRimando(n, now)
}

export async function caricaNotificheCampanella() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return [] as Notifica[]
  const { data, error } = await supabase
    .from('notifiche')
    .select('*')
    .eq('user_id', user.id)
    .eq('letta', false)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) {
    console.error('caricaNotificheCampanella', error.message)
    return []
  }
  return (data || []) as Notifica[]
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

export function useNotifiche() {
  const [notifiche, setNotifiche] = useState<Notifica[]>([])
  const [count, setCount] = useState(0)

  const ricarica = useCallback(async () => {
    const list = await caricaNotificheCampanella()
    setNotifiche(list)
    setCount(list.filter(notificaContaBadge).length)
  }, [])

  const ricaricaRef = useRef(ricarica)
  ricaricaRef.current = ricarica

  useEffect(() => {
    void ricaricaRef.current()

    const channelName = `notifiche-mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifiche' }, () => {
        void ricaricaRef.current()
      })
      .subscribe()

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void ricaricaRef.current()
    })

    return () => {
      appStateSub.remove()
      void supabase.removeChannel(channel)
    }
  }, [])

  const segnaLetta = useCallback(async (id: string) => {
    await segnaNotificaLetta(id)
    await ricarica()
  }, [ricarica])

  const rimanda = useCallback(async (id: string, ore = ORE_RIMANDA_DEFAULT) => {
    await rimandaNotifica(id, ore)
    await ricarica()
  }, [ricarica])

  const archivia = useCallback(async (id: string) => {
    await segnaNotificaLetta(id)
    await ricarica()
  }, [ricarica])

  return { notifiche, count, ricarica, segnaLetta, rimanda, archivia }
}
