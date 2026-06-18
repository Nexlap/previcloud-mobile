import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Alert } from 'react-native'
import { caricaIncassiPerCliente } from '../api/incassi'
import { eliminaClienti } from '../api/clienti'
import { supabase } from '../supabase'
import { Cliente } from '../types'

// ── Hook riutilizzabile per la gestione clienti ───────────────────
export function useClienti() {
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Ricarica automaticamente ogni volta che la schermata torna in focus
  useFocusEffect(useCallback(() => { carica() }, []))

  async function carica() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('clienti')
      .select('*')
      .eq('user_id', user.id)
      .order('nome', { ascending: true })

    if (!data) { setLoading(false); return }

    const incassiPerCliente = await caricaIncassiPerCliente(user.id)

    const clientiConStats = await Promise.all(data.map(async (c) => {
      const { count } = await supabase
        .from('preventivi')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', c.id)
        .eq('is_ultimo', true)

      return {
        ...c,
        totale_preventivi: incassiPerCliente[c.id] || 0,
        num_preventivi: count || 0,
      }
    }))

    setClienti(clientiConStats)
    setLoading(false)
  }

  async function onRefresh() {
    setRefreshing(true)
    await carica()
    setRefreshing(false)
  }

  async function aggiungiCliente(dati: { nome: string; telefono: string; email: string; note: string }) {
    if (!dati.nome.trim()) {
      Alert.alert('Errore', 'Inserisci almeno il nome del cliente')
      return false
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('clienti')
      .insert({ ...dati, user_id: user.id })
      .select()
      .single()

    if (error) { Alert.alert('Errore', error.message); return false }

    setClienti(c => [...c, { ...data, totale_preventivi: 0, num_preventivi: 0 }])
    return true
  }

  async function eliminaCliente(id: string) {
    const { error } = await eliminaClienti([id])
    if (error) { Alert.alert('Errore', error.message); return false }
    setClienti(c => c.filter(x => x.id !== id))
    return true
  }

  async function aggiornaCliente(id: string, dati: Partial<Cliente>) {
    const { error } = await supabase.from('clienti').update(dati).eq('id', id)
    if (error) { Alert.alert('Errore', error.message); return false }
    setClienti(c => c.map(x => x.id === id ? { ...x, ...dati } : x))
    return true
  }

  return { clienti, loading, refreshing, onRefresh, carica, aggiungiCliente, eliminaCliente, aggiornaCliente }
}
