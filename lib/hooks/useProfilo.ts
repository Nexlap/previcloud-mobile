import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Alert } from 'react-native'
import { supabase } from '../supabase'
import { Profile, Servizio } from '../types'

// ── Hook riutilizzabile per il profilo utente ─────────────────────
export function useProfilo() {
  const [profilo, setProfilo] = useState<Profile | null>(null)
  const [servizi, setServizi] = useState<Servizio[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => { carica() }, []))

  async function carica() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (prof) setProfilo(prof)

    const { data: srv } = await supabase
      .from('servizi')
      .select('*')
      .eq('user_id', user.id)
      .order('ordine', { ascending: true })

    if (srv) setServizi(srv)
    setLoading(false)
  }

  async function aggiornaProfilo(dati: Partial<Profile>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase.from('profiles').update(dati).eq('id', user.id)
    if (error) { Alert.alert('Errore', error.message); return false }
    setProfilo(p => p ? { ...p, ...dati } : p)
    return true
  }

  async function aggiungiServizio(dati: Omit<Servizio, 'id'>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('servizi')
      .insert({ ...dati, user_id: user.id, ordine: servizi.length })
      .select()
      .single()

    if (error) { Alert.alert('Errore', error.message); return false }
    setServizi(s => [...s, data])
    return true
  }

  async function aggiornaServizio(id: string, dati: Partial<Servizio>) {
    const { error } = await supabase.from('servizi').update(dati).eq('id', id)
    if (error) { Alert.alert('Errore', error.message); return false }
    setServizi(s => s.map(x => x.id === id ? { ...x, ...dati } : x))
    return true
  }

  async function eliminaServizio(id: string) {
    const { error } = await supabase.from('servizi').delete().eq('id', id)
    if (error) { Alert.alert('Errore', error.message); return false }
    setServizi(s => s.filter(x => x.id !== id))
    return true
  }

  return {
    profilo, servizi, loading, carica,
    aggiornaProfilo, aggiungiServizio, aggiornaServizio, eliminaServizio
  }
}
