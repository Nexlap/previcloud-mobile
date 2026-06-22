import { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { MESI_BREVI } from '../constants'
import { caricaPianiCliente, caricaRatePerPiani as caricaRatePerPianiData } from '../api/abbonamentoCarica'
import {
  creaAbbonamento as creaAbbonamentoApi,
  creaPianoRate as creaPianoRateApi,
} from '../api/abbonamentoCreazione'
import {
  aggiornaAbbonamento as aggiornaAbbonamentoApi,
  azzeraPagamentoRata,
  eliminaAbbonamentiInCestino,
  eliminaRate as eliminaRateApi,
  inserisciRataMese,
  registraPagamentoRata,
  rinominaAbbonamento as rinominaAbbonamentoApi,
  trovaRataMeseEsistente,
} from '../api/abbonamentoCrud'
import {
  modificaImportoPianoRate as modificaImportoPianoRateApi,
  modificaImportoRata as modificaImportoRataApi,
  rateScaduteDaSegnalare,
  salvaImportiRatePersonalizzati as salvaImportiRatePersonalizzatiApi,
  segnaRataInRitardo,
} from '../api/abbonamentoImporti'
import { Abbonamento, PreventivoMadre, RataAbbonamento } from '../types'

type UseAbbonamentoOpts = {
  soloTipo?: 'canone' | 'rate'
}

export function useAbbonamento(clienteId: string, opts?: UseAbbonamentoOpts) {
  const [abbonamentiAttivi, setAbbonamentiAttivi] = useState<Abbonamento[]>([])
  const [abbonamentiStorico, setAbbonamentiStorico] = useState<Abbonamento[]>([])
  const [preventiviMadreStorico, setPreventiviMadreStorico] = useState<Record<string, PreventivoMadre>>({})
  const [ratePerPiano, setRatePerPiano] = useState<Record<string, RataAbbonamento[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { carica() }, [clienteId, opts?.soloTipo])

  function tutteLeRate() {
    return Object.values(ratePerPiano).flat()
  }

  function trovaRata(rataId: string) {
    for (const [abbonamentoId, rate] of Object.entries(ratePerPiano)) {
      const rata = rate.find(r => r.id === rataId)
      if (rata) return { rata, abbonamentoId }
    }
    return null
  }

  function pianoById(abbonamentoId: string) {
    return abbonamentiAttivi.find(a => a.id === abbonamentoId)
  }

  function aggiornaRatePiano(
    abbonamentoId: string,
    updater: (rate: RataAbbonamento[]) => RataAbbonamento[],
  ) {
    setRatePerPiano(prev => ({
      ...prev,
      [abbonamentoId]: updater(prev[abbonamentoId] || []),
    }))
  }

  async function caricaRatePerPiani(abbonamentoIds: string[]) {
    if (abbonamentoIds.length === 0) {
      setRatePerPiano({})
      return
    }
    setRatePerPiano(await caricaRatePerPianiData(abbonamentoIds))
  }

  async function carica() {
    setLoading(true)
    const { attivi, storico, preventiviMadreStorico, ratePerPiano } = await caricaPianiCliente(clienteId, opts)
    setAbbonamentiAttivi(attivi)
    setAbbonamentiStorico(storico)
    setPreventiviMadreStorico(preventiviMadreStorico)
    setRatePerPiano(ratePerPiano)
    setLoading(false)
  }

  async function creaAbbonamento(
    importo: number,
    giornoScadenza: number,
    opzioni?: {
      preventivoId?: string
      numeroMensilita?: number
      note?: string
      tipo?: 'canone' | 'rate'
    },
  ) {
    const result = await creaAbbonamentoApi(clienteId, importo, giornoScadenza, opzioni)
    if (!result.ok) {
      if (result.reason === 'already_linked') {
        Alert.alert(
          'Preventivo già collegato',
          result.tipo === 'rate'
            ? 'Questo preventivo ha già un piano a rate collegato.'
            : 'Questo preventivo ha già un abbonamento collegato.',
        )
      } else if (result.reason === 'db_error') {
        Alert.alert('Errore', result.message)
      }
      return
    }
    await carica()
  }

  async function creaPianoRate(
    importoTotale: number,
    numeroRate: number,
    opzioni?: { preventivoId?: string; giornoScadenza?: number; meseInizio?: number },
  ) {
    const result = await creaPianoRateApi(clienteId, importoTotale, numeroRate, opzioni)
    if (!result.ok) {
      if (result.reason === 'invalid_rate_count') {
        Alert.alert('Errore', 'Inserisci un numero di rate valido (minimo 2).')
      } else if (result.reason === 'already_linked') {
        Alert.alert(
          'Preventivo già collegato',
          result.tipo === 'canone'
            ? 'Questo preventivo ha già un abbonamento collegato.'
            : 'Questo preventivo ha già un piano a rate collegato.',
        )
      } else if (result.reason === 'db_error') {
        Alert.alert('Errore', result.message)
      }
      return false
    }
    await carica()
    return true
  }

  async function segnaRataPagata(rataId: string, pagata: boolean, dataIncasso?: string) {
    const found = trovaRata(rataId)
    if (!found) return
    if (pagata) {
      await registraPagamento(
        rataId,
        found.rata.importo - (found.rata.acconto || 0),
        undefined,
        dataIncasso,
      )
    } else {
      await azzeraPagamento(rataId)
    }
  }

  async function aggiornaAbbonamento(abbonamentoId: string, importo: number, giornoScadenza: number) {
    const { error } = await aggiornaAbbonamentoApi(abbonamentoId, importo, giornoScadenza)
    if (error) { Alert.alert('Errore', error.message); return }
    setAbbonamentiAttivi(lista =>
      lista.map(a => a.id === abbonamentoId
        ? { ...a, importo_default: importo, giorno_scadenza: giornoScadenza }
        : a),
    )
  }

  async function modificaImportoPianoRate(abbonamentoId: string, nuovoImportoTotale: number) {
    const abbonamento = pianoById(abbonamentoId)
    const rate = ratePerPiano[abbonamentoId] || []
    if (!abbonamento) return false

    const result = await modificaImportoPianoRateApi(abbonamento, rate, nuovoImportoTotale)
    if (!result.ok) {
      if (result.alert) Alert.alert(result.alert.title, result.alert.message)
      return false
    }

    setAbbonamentiAttivi(lista =>
      lista.map(a => a.id === abbonamentoId ? { ...a, importo_default: result.nuovoImportoTotale } : a),
    )
    await caricaRatePerPiani([abbonamentoId])
    return true
  }

  function rimuoviAbbonamentoLocale(abbonamentoId: string) {
    setAbbonamentiAttivi(lista => lista.filter(a => a.id !== abbonamentoId))
    setAbbonamentiStorico(lista => lista.filter(a => a.id !== abbonamentoId))
    setRatePerPiano(prev => {
      const next = { ...prev }
      delete next[abbonamentoId]
      return next
    })
  }

  async function eliminaAbbonamenti(abbonamentoIds: string[]) {
    if (abbonamentoIds.length === 0) return true
    const { error } = await eliminaAbbonamentiInCestino(abbonamentoIds)
    if (error) {
      Alert.alert('Errore', error.message)
      await carica()
      return false
    }
    for (const id of abbonamentoIds) rimuoviAbbonamentoLocale(id)
    return true
  }

  async function eliminaAbbonamento(abbonamentoId: string) {
    return eliminaAbbonamenti([abbonamentoId])
  }

  async function registraPagamento(
    rataId: string,
    importoPagato: number,
    nota?: string,
    dataIncasso?: string,
  ) {
    const found = trovaRata(rataId)
    if (!found) return
    const { rata, abbonamentoId } = found

    const { error, aggiornamento, nuovoSaldo } = await registraPagamentoRata(
      rataId,
      rata,
      importoPagato,
      nota,
      dataIncasso,
    )
    if (error) { Alert.alert('Errore', error.message); return }
    aggiornaRatePiano(abbonamentoId, rs =>
      rs.map(x => x.id === rataId ? { ...x, ...aggiornamento, saldo_residuo: nuovoSaldo } : x),
    )
  }

  async function azzeraPagamento(rataId: string) {
    const found = trovaRata(rataId)
    if (!found) return
    const { error, aggiornamento } = await azzeraPagamentoRata(rataId)
    if (error) { Alert.alert('Errore', error.message); return }
    aggiornaRatePiano(found.abbonamentoId, rs =>
      rs.map(x => x.id === rataId ? { ...x, ...aggiornamento, saldo_residuo: x.importo } : x),
    )
  }

  async function aggiungiRataMese(abbonamentoId: string, mese: number, anno: number, importo: number) {
    const { data: esistente } = await trovaRataMeseEsistente(abbonamentoId, mese, anno)
    if (esistente) {
      Alert.alert('Rata già presente', `Esiste già una rata per ${MESI_BREVI[mese - 1]} ${anno}`)
      return false
    }

    const { data, error } = await inserisciRataMese(abbonamentoId, mese, anno, importo)
    if (error) { Alert.alert('Errore', error.message); return false }
    aggiornaRatePiano(abbonamentoId, rs =>
      [...rs, data].sort((a, b) => a.anno - b.anno || a.mese - b.mese),
    )
    return true
  }

  async function eliminaRate(rataIds: string[]) {
    if (!rataIds.length) return false
    const { error } = await eliminaRateApi(rataIds)
    if (error) { Alert.alert('Errore', error.message); return false }
    setRatePerPiano(prev => {
      const next = { ...prev }
      for (const abId of Object.keys(next)) {
        next[abId] = next[abId].filter(x => !rataIds.includes(x.id))
      }
      return next
    })
    return true
  }

  async function aggiornaRitardi() {
    const scadute = rateScaduteDaSegnalare(abbonamentiAttivi, ratePerPiano)
    for (const { abbonamentoId, rataId } of scadute) {
      await segnaRataInRitardo(rataId)
      aggiornaRatePiano(abbonamentoId, rs =>
        rs.map(x => x.id === rataId ? { ...x, stato: 'in_ritardo' } : x),
      )
    }
  }

  useEffect(() => {
    if (abbonamentiAttivi.length > 0 && tutteLeRate().length > 0) aggiornaRitardi()
  }, [abbonamentiAttivi.length, Object.values(ratePerPiano).flat().length])

  async function rinominaAbbonamento(abbonamentoId: string, nuovoNome: string) {
    const { error } = await rinominaAbbonamentoApi(abbonamentoId, nuovoNome)
    if (error) { Alert.alert('Errore', error.message); return }
    setAbbonamentiAttivi(lista =>
      lista.map(a => a.id === abbonamentoId ? { ...a, nome: nuovoNome } : a),
    )
  }

  async function modificaImportoRata(rataId: string, nuovoImporto: number) {
    const found = trovaRata(rataId)
    if (!found) return false
    const { rata, abbonamentoId } = found
    const abbonamento = pianoById(abbonamentoId)
    const rate = ratePerPiano[abbonamentoId] || []
    if (!abbonamento) return false

    const result = await modificaImportoRataApi(abbonamento, rate, rata, nuovoImporto)
    if (!result.ok) {
      Alert.alert(result.alert.title, result.alert.message)
      return false
    }

    aggiornaRatePiano(abbonamentoId, rs =>
      rs.map(x => x.id === rataId ? { ...x, importo: result.nuovoImporto, stato: result.nuovoStato } : x),
    )
    return true
  }

  async function salvaImportiRatePersonalizzati(abbonamentoId: string, importiPerRata: Record<string, number>) {
    const abbonamento = pianoById(abbonamentoId)
    const rate = ratePerPiano[abbonamentoId] || []
    if (!abbonamento) return false

    const result = await salvaImportiRatePersonalizzatiApi(abbonamento, rate, importiPerRata)
    if (!result.ok) {
      if (result.alert) Alert.alert(result.alert.title, result.alert.message)
      return false
    }

    await caricaRatePerPiani([abbonamentoId])
    return true
  }

  const tutteRate = tutteLeRate()
  const totaleIncassato = tutteRate
    .filter(r => r.stato === 'incassato')
    .reduce((a, r) => a + r.importo, 0)

  const totaleParziale = tutteRate
    .filter(r => r.stato === 'parziale')
    .reduce((a, r) => a + r.acconto, 0)

  const rataDaIncassare = tutteRate.find(r => r.stato !== 'incassato')

  return {
    abbonamentiAttivi,
    abbonamentiStorico,
    preventiviMadreStorico,
    ratePerPiano,
    loading,
    creaAbbonamento,
    creaPianoRate,
    aggiornaAbbonamento,
    eliminaAbbonamento,
    eliminaAbbonamenti,
    modificaImportoPianoRate,
    registraPagamento,
    azzeraPagamento,
    segnaRataPagata,
    aggiungiRataMese,
    eliminaRate,
    rinominaAbbonamento,
    modificaImportoRata,
    salvaImportiRatePersonalizzati,
    totaleIncassato,
    totaleParziale,
    rataDaIncassare,
    carica,
  }
}
