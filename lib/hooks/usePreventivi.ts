import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Alert } from 'react-native'
import { supabase } from '../supabase'
import { Preventivo } from '../types'

// ── Hook riutilizzabile per la gestione preventivi ────────────────
export function usePreventivi(opts?: { clienteId?: string; limit?: number }) {
  const [preventivi, setPreventivi] = useState<Preventivo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Ricarica automaticamente ogni volta che la schermata torna in focus
  useFocusEffect(useCallback(() => { carica() }, [opts?.clienteId]))

  async function carica() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('preventivi')
      .select('*, clienti(nome)')
      .eq('user_id', user.id)
      .eq('is_ultimo', true)
      .order('created_at', { ascending: false })

    // Filtra per cliente se specificato
    if (opts?.clienteId) query = query.eq('cliente_id', opts.clienteId)
    if (opts?.limit) query = query.limit(opts.limit)

    const { data } = await query

    if (data) {
      setPreventivi(data.map((p: any) => ({
        ...p,
        nome_cliente: p.clienti?.nome || p.nome_cliente || 'Senza cliente'
      })))
    }
    setLoading(false)
  }

  async function onRefresh() {
    setRefreshing(true)
    await carica()
    setRefreshing(false)
  }

  async function eliminaPreventivo(id: string) {
    const { error } = await supabase.from('preventivi').delete().eq('id', id)
    if (error) { Alert.alert('Errore', error.message); return false }
    setPreventivi(p => p.filter(x => x.id !== id))
    return true
  }

  async function cambiaStato(id: string, stato: string) {
    const { error } = await supabase.from('preventivi').update({ stato }).eq('id', id)
    if (error) { Alert.alert('Errore', error.message); return false }
    setPreventivi(p => p.map(x => x.id === id ? { ...x, stato } : x))
    return true
  }

  async function rinominaPreventivo(id: string, titolo: string) {
    const { error } = await supabase.from('preventivi').update({ titolo }).eq('id', id)
    if (error) { Alert.alert('Errore', error.message); return false }
    setPreventivi(p => p.map(x => x.id === id ? { ...x, titolo } : x))
    return true
  }

  async function spostaPreventivo(id: string, nuovoClienteId: string, nuovoClienteNome: string) {
    const { error } = await supabase.from('preventivi')
      .update({ cliente_id: nuovoClienteId, nome_cliente: nuovoClienteNome })
      .eq('id', id)
    if (error) { Alert.alert('Errore', error.message); return false }
    setPreventivi(p => p.filter(x => x.id !== id))
    return true
  }

  // Valore totale dei preventivi attivi
const totaleValore = preventivi
  .filter(p => p.is_ultimo && p.stato === 'accettato')
  .reduce((a, p) => a + (p.importo_totale || 0), 0)
  
  return {
    preventivi, loading, refreshing, totaleValore,
    onRefresh, carica,
    eliminaPreventivo, cambiaStato, rinominaPreventivo, spostaPreventivo
  }
}
