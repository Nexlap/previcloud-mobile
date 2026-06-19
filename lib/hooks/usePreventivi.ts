import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Alert } from 'react-native'
import { calcolaIncassoCliente } from '../api/incassi'
import { segnaPreventivoPagato } from '../api/preventivoPdf'
import { supabase } from '../supabase'
import { Preventivo } from '../types'

// ── Hook riutilizzabile per la gestione preventivi ────────────────
export function usePreventivi(opts?: { clienteId?: string; limit?: number }) {
  const [preventivi, setPreventivi] = useState<Preventivo[]>([])
  const [totaleIncasso, setTotaleIncasso] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Ricarica automaticamente ogni volta che la schermata torna in focus
  useFocusEffect(useCallback(() => { carica() }, [opts?.clienteId]))

  async function caricaIncasso(userId: string, clienteId: string) {
    const incasso = await calcolaIncassoCliente(userId, clienteId)
    setTotaleIncasso(incasso)
  }

  async function carica() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('preventivi')
      .select('*, clienti(nome)')
      .eq('user_id', user.id)
      .eq('is_ultimo', true)
      .order('created_at', { ascending: false })

    if (opts?.clienteId) query = query.eq('cliente_id', opts.clienteId)
    if (opts?.limit) query = query.limit(opts.limit)

    const incassoPromise = opts?.clienteId
      ? calcolaIncassoCliente(user.id, opts.clienteId)
      : Promise.resolve(0)

    const [{ data }, incasso] = await Promise.all([query, incassoPromise])

    if (data) {
      setPreventivi(data.map((p: Preventivo & { clienti?: { nome?: string } | null }) => ({
        ...p,
        nome_cliente: p.clienti?.nome || p.nome_cliente || 'Senza cliente'
      })))
    }
    setTotaleIncasso(incasso)
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
    if (opts?.clienteId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await caricaIncasso(user.id, opts.clienteId)
    }
    return true
  }

  async function cambiaStato(id: string, stato: string) {
    const prev = preventivi.find(x => x.id === id)
    if (!prev) return false

    const resetPagato = prev.stato === 'accettato' && stato !== 'accettato'
    const aggiornamento: { stato: string; pagato?: boolean; data_pagamento?: string | null } = { stato }
    if (resetPagato) {
      aggiornamento.pagato = false
      aggiornamento.data_pagamento = null
    }

    setPreventivi(p => p.map(x => x.id === id ? {
      ...x,
      stato,
      ...(resetPagato ? { pagato: false, data_pagamento: null } : {}),
    } : x))

    const { error } = await supabase.from('preventivi').update(aggiornamento).eq('id', id)
    if (error) {
      Alert.alert('Errore', error.message)
      setPreventivi(p => p.map(x => x.id === id ? prev : x))
      return false
    }

    if (opts?.clienteId && resetPagato) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await caricaIncasso(user.id, opts.clienteId)
    }
    return true
  }

  async function segnaPagato(id: string, pagato: boolean) {
    await segnaPreventivoPagato(id, pagato)
    setPreventivi(p => p.map(x => x.id === id ? {
      ...x,
      pagato,
      data_pagamento: pagato ? new Date().toISOString() : null,
    } : x))
    if (opts?.clienteId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await caricaIncasso(user.id, opts.clienteId)
    }
    return true
  }

  async function rinominaPreventivo(id: string, titolo: string) {
    const { error } = await supabase.from('preventivi').update({ titolo }).eq('id', id)
    if (error) { Alert.alert('Errore', error.message); return false }
    setPreventivi(p => p.map(x => x.id === id ? { ...x, titolo } : x))
    return true
  }

  function patchPreventivoLocal(id: string, patch: Partial<Preventivo>) {
    setPreventivi(p => p.map(x => x.id === id ? { ...x, ...patch } : x))
  }

  async function spostaPreventivo(id: string, nuovoClienteId: string, nuovoClienteNome: string) {
    const { error } = await supabase.from('preventivi')
      .update({ cliente_id: nuovoClienteId, nome_cliente: nuovoClienteNome })
      .eq('id', id)
    if (error) { Alert.alert('Errore', error.message); return false }
    setPreventivi(p => p.filter(x => x.id !== id))
    if (opts?.clienteId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await caricaIncasso(user.id, opts.clienteId)
    }
    return true
  }

  const totaleValore = opts?.clienteId ? totaleIncasso : 0

  return {
    preventivi, loading, refreshing, totaleValore,
    onRefresh, carica,
    eliminaPreventivo, cambiaStato, segnaPagato, rinominaPreventivo, spostaPreventivo, patchPreventivoLocal
  }
}
