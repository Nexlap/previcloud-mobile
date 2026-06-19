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
  created_at: string
}

export async function caricaNotificheNonLette() {
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
    console.error('caricaNotificheNonLette', error.message)
    return []
  }
  return (data || []) as Notifica[]
}

export async function segnaNotificaLetta(id: string) {
  const { error } = await supabase.from('notifiche').update({ letta: true }).eq('id', id)
  if (error) throw new Error(error.message)
}

export function useNotifiche() {
  const [notifiche, setNotifiche] = useState<Notifica[]>([])
  const [count, setCount] = useState(0)

  const ricarica = useCallback(async () => {
    const list = await caricaNotificheNonLette()
    setNotifiche(list)
    setCount(list.length)
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

  return { notifiche, count, ricarica, segnaLetta }
}
