import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Alert } from 'react-native'
import {
  cambiaStatoPreventivo,
  caricaPreventivi,
  ricaricaIncassoCliente,
  rinominaPreventivo as rinominaPreventivoApi,
  spostaPreventivo as spostaPreventivoApi,
} from '../api/preventivi'
import { eliminaPreventivi } from '../api/storico'
import { segnaPreventivoPagato } from '../api/preventivoPdf'
import { Preventivo } from '../types'

// ── Hook riutilizzabile per la gestione preventivi ────────────────
export function usePreventivi(opts?: { clienteId?: string; limit?: number }) {
  const [preventivi, setPreventivi] = useState<Preventivo[]>([])
  const [totaleIncasso, setTotaleIncasso] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Ricarica automaticamente ogni volta che la schermata torna in focus
  useFocusEffect(useCallback(() => { carica() }, [opts?.clienteId]))

  async function carica() {
    const result = await caricaPreventivi(opts)
    if (!result) return
    setPreventivi(result.preventivi)
    setTotaleIncasso(result.totaleIncasso)
    setLoading(false)
  }

  async function onRefresh() {
    setRefreshing(true)
    await carica()
    setRefreshing(false)
  }

  async function eliminaPreventiviIds(ids: string[]) {
    if (ids.length === 0) return true
    const rimossi = new Set(ids)
    const { error } = await eliminaPreventivi(ids)
    if (error) {
      Alert.alert('Errore', error.message)
      await carica()
      return false
    }
    setPreventivi(p => p.filter(x => !rimossi.has(x.id)))
    if (opts?.clienteId) {
      const incasso = await ricaricaIncassoCliente(opts.clienteId)
      if (incasso !== null) setTotaleIncasso(incasso)
    }
    return true
  }

  async function eliminaPreventivo(id: string) {
    return eliminaPreventiviIds([id])
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

    const { error } = await cambiaStatoPreventivo(id, aggiornamento)
    if (error) {
      Alert.alert('Errore', error.message)
      setPreventivi(p => p.map(x => x.id === id ? prev : x))
      return false
    }

    if (opts?.clienteId && resetPagato) {
      const incasso = await ricaricaIncassoCliente(opts.clienteId)
      if (incasso !== null) setTotaleIncasso(incasso)
    }
    return true
  }

  async function segnaPagato(id: string, pagato: boolean, dataPagamento?: string) {
    await segnaPreventivoPagato(id, pagato, dataPagamento)
    setPreventivi(p => p.map(x => x.id === id ? {
      ...x,
      pagato,
      data_pagamento: pagato ? (dataPagamento ?? new Date().toISOString()) : null,
    } : x))
    if (opts?.clienteId) {
      const incasso = await ricaricaIncassoCliente(opts.clienteId)
      if (incasso !== null) setTotaleIncasso(incasso)
    }
    return true
  }

  async function rinominaPreventivo(id: string, titolo: string) {
    const { error } = await rinominaPreventivoApi(id, titolo)
    if (error) { Alert.alert('Errore', error.message); return false }
    setPreventivi(p => p.map(x => x.id === id ? { ...x, titolo } : x))
    return true
  }

  function patchPreventivoLocal(id: string, patch: Partial<Preventivo>) {
    setPreventivi(p => p.map(x => x.id === id ? { ...x, ...patch } : x))
  }

  async function spostaPreventivo(id: string, nuovoClienteId: string, nuovoClienteNome: string) {
    const { error } = await spostaPreventivoApi(id, nuovoClienteId, nuovoClienteNome)
    if (error) { Alert.alert('Errore', error.message); return false }
    setPreventivi(p => p.filter(x => x.id !== id))
    if (opts?.clienteId) {
      const incasso = await ricaricaIncassoCliente(opts.clienteId)
      if (incasso !== null) setTotaleIncasso(incasso)
    }
    return true
  }

  const totaleValore = opts?.clienteId ? totaleIncasso : 0

  return {
    preventivi, loading, refreshing, totaleValore,
    onRefresh, carica,
    eliminaPreventivo, eliminaPreventiviIds, cambiaStato, segnaPagato, rinominaPreventivo, spostaPreventivo, patchPreventivoLocal
  }
}
