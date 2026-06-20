import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Alert } from 'react-native'
import {
  aggiornaCliente as aggiornaClienteApi,
  caricaClientiConStats,
  creaCliente,
  eliminaClienti,
} from '../api/clienti'
import { Cliente } from '../types'

// ── Hook riutilizzabile per la gestione clienti ───────────────────
export function useClienti() {
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Ricarica automaticamente ogni volta che la schermata torna in focus
  useFocusEffect(useCallback(() => { carica() }, []))

  async function carica() {
    const data = await caricaClientiConStats()
    if (data === null) return
    setClienti(data)
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

    const { data, error } = await creaCliente(dati)
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
    const { error } = await aggiornaClienteApi(id, dati)
    if (error) { Alert.alert('Errore', error.message); return false }
    setClienti(c => c.map(x => x.id === id ? { ...x, ...dati } : x))
    return true
  }

  return { clienti, loading, refreshing, onRefresh, carica, aggiungiCliente, eliminaCliente, aggiornaCliente }
}
