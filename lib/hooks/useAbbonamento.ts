import { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { supabase } from '../supabase'

export interface Abbonamento {
  id: string
  cliente_id: string
  importo_default: number
  giorno_scadenza: number
  attivo: boolean
  preventivo_id: string | null
  numero_mensilita: number | null
  note: string | null
  tipo: 'canone' | 'rate'
}

export interface RataAbbonamento {
  id: string
  abbonamento_id: string
  mese: number
  anno: number
  importo: number
  acconto: number
  saldo_residuo: number
  stato: 'da_incassare' | 'parziale' | 'incassato' | 'in_ritardo'
  data_incasso: string | null
  note: string | null
}

export function useAbbonamento(clienteId: string) {
  const [abbonamento, setAbbonamento] = useState<Abbonamento | null>(null)
  const [rate, setRate] = useState<RataAbbonamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carica() }, [clienteId])

  async function carica() {
    setLoading(true)
    const { data: ab } = await supabase
      .from('abbonamenti')
      .select('*')
      .eq('cliente_id', clienteId)
      .eq('attivo', true)
      .single()

    if (ab) {
      setAbbonamento(ab)
      await caricaRate(ab.id)
    } else {
      setAbbonamento(null)
      setRate([])
    }
    setLoading(false)
  }

  async function caricaRate(abbonamentoId: string) {
    const { data } = await supabase
      .from('rate_abbonamento')
      .select('*')
      .eq('abbonamento_id', abbonamentoId)
      .order('anno', { ascending: false })
      .order('mese', { ascending: false })
    if (data) setRate(data)
  }

  // Crea abbonamento manuale
  async function creaAbbonamento(
    importo: number,
    giornoScadenza: number,
    opzioni?: {
      preventivoId?: string
      numeroMensilita?: number
      note?: string
      tipo?: 'canone' | 'rate'
    }
  ) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('abbonamenti')
      .insert({
        user_id: user.id,
        cliente_id: clienteId,
        importo_default: importo,
        giorno_scadenza: giornoScadenza,
        attivo: true,
        preventivo_id: opzioni?.preventivoId || null,
        numero_mensilita: opzioni?.numeroMensilita || null,
        note: opzioni?.note || null,
        tipo: opzioni?.tipo || 'canone',
      })
      
      .select()
      .single()

    if (error) { Alert.alert('Errore', error.message); return }
    setAbbonamento(data)

    // Genera rate: se ha numero_mensilita le genera tutte, altrimenti solo mese corrente
    if (opzioni?.numeroMensilita && opzioni.numeroMensilita > 0) {
      await generaRateMultiple(data.id, importo, opzioni.numeroMensilita)
    } else {
      await generaRataMeseCorrente(data.id, importo)
    }

    await caricaRate(data.id)
  }

  async function generaRataMeseCorrente(abbonamentoId: string, importo: number) {
    const ora = new Date()
    const mese = ora.getMonth() + 1
    const anno = ora.getFullYear()
    const { data: esistente } = await supabase
      .from('rate_abbonamento')
      .select('id')
      .eq('abbonamento_id', abbonamentoId)
      .eq('mese', mese)
      .eq('anno', anno)
      .single()
    if (esistente) return
    await supabase.from('rate_abbonamento').insert({
      abbonamento_id: abbonamentoId,
      mese,
      anno,
      importo,
      acconto: 0,
      stato: 'da_incassare'
    })
  }

  async function generaRateMultiple(abbonamentoId: string, importo: number, numeroMesi: number) {
    const ora = new Date()
    const inserimenti = []
    for (let i = 0; i < numeroMesi; i++) {
      const data = new Date(ora.getFullYear(), ora.getMonth() + i, 1)
      inserimenti.push({
        abbonamento_id: abbonamentoId,
        mese: data.getMonth() + 1,
        anno: data.getFullYear(),
        importo,
        acconto: 0,
        stato: 'da_incassare'
      })
    }
    await supabase.from('rate_abbonamento').insert(inserimenti)
  }

  async function aggiornaAbbonamento(importo: number, giornoScadenza: number) {
    if (!abbonamento) return
    const { error } = await supabase
      .from('abbonamenti')
      .update({ importo_default: importo, giorno_scadenza: giornoScadenza })
      .eq('id', abbonamento.id)
    if (error) { Alert.alert('Errore', error.message); return }
    setAbbonamento(a => a ? { ...a, importo_default: importo, giorno_scadenza: giornoScadenza } : a)
  }

  async function eliminaAbbonamento() {
    if (!abbonamento) return
    const { error } = await supabase
      .from('abbonamenti')
      .update({ attivo: false })
      .eq('id', abbonamento.id)
    if (error) { Alert.alert('Errore', error.message); return }
    setAbbonamento(null)
    setRate([])
  }

  // Registra un pagamento (acconto o saldo completo)
  async function registraPagamento(rataId: string, importoPagato: number, nota?: string) {
    const rata = rate.find(r => r.id === rataId)
    if (!rata) return

    const nuovoAcconto = Math.min(rata.acconto + importoPagato, rata.importo)
    const nuovoSaldo = rata.importo - nuovoAcconto
    const nuovoStato = nuovoSaldo <= 0 ? 'incassato' : 'parziale'

    const aggiornamento: any = {
      acconto: nuovoAcconto,
      stato: nuovoStato,
      note: nota || rata.note || null,
    }
    if (nuovoStato === 'incassato') {
      aggiornamento.data_incasso = new Date().toISOString()
    }

    const { error } = await supabase
      .from('rate_abbonamento')
      .update(aggiornamento)
      .eq('id', rataId)

    if (error) { Alert.alert('Errore', error.message); return }
    setRate(r => r.map(x => x.id === rataId ? { ...x, ...aggiornamento, saldo_residuo: nuovoSaldo } : x))
  }

  // Azzera pagamento rata (torna a da_incassare)
  async function azzeraPagamento(rataId: string) {
  const aggiornamento: Partial<RataAbbonamento> & { data_incasso: null } = {
    acconto: 0,
    stato: 'da_incassare' as const,
    data_incasso: null,
    note: null,
  }
  const { error } = await supabase
    .from('rate_abbonamento')
    .update(aggiornamento)
    .eq('id', rataId)
  if (error) { Alert.alert('Errore', error.message); return }
  setRate(r => r.map(x => x.id === rataId ? { ...x, ...aggiornamento, saldo_residuo: x.importo } : x))
}
  async function aggiungiRataMese(mese: number, anno: number, importo: number) {
    if (!abbonamento) return
    const { data: esistente } = await supabase
      .from('rate_abbonamento')
      .select('id')
      .eq('abbonamento_id', abbonamento.id)
      .eq('mese', mese)
      .eq('anno', anno)
      .single()
    if (esistente) { Alert.alert('Rata già presente', `La rata di questo mese esiste già`); return }

    const { data, error } = await supabase
      .from('rate_abbonamento')
      .insert({
        abbonamento_id: abbonamento.id,
        mese,
        anno,
        importo,
        acconto: 0,
        stato: 'da_incassare'
      })
      .select()
      .single()
    if (error) { Alert.alert('Errore', error.message); return }
    setRate(r => [data, ...r])
  }

  // Controlla e aggiorna rate in ritardo
  async function aggiornaRitardi() {
    if (!abbonamento) return
    const ora = new Date()
    const meseOra = ora.getMonth() + 1
    const annoOra = ora.getFullYear()
    const giornoOggi = ora.getDate()

    for (const r of rate) {
      if (r.stato === 'da_incassare' || r.stato === 'parziale') {
        const scaduta =
          r.anno < annoOra ||
          (r.anno === annoOra && r.mese < meseOra) ||
          (r.anno === annoOra && r.mese === meseOra && giornoOggi > abbonamento.giorno_scadenza)
        if (scaduta) {
          await supabase.from('rate_abbonamento').update({ stato: 'in_ritardo' }).eq('id', r.id)
          setRate(rv => rv.map(x => x.id === r.id ? { ...x, stato: 'in_ritardo' } : x))
        }
      }
    }
  }

  useEffect(() => {
    if (abbonamento && rate.length > 0) aggiornaRitardi()
  }, [rate.length])

  const totaleIncassato = rate
    .filter(r => r.stato === 'incassato')
    .reduce((a, r) => a + r.importo, 0)

  const totaleParziale = rate
    .filter(r => r.stato === 'parziale')
    .reduce((a, r) => a + r.acconto, 0)

  const rataDaIncassare = rate.find(r => r.stato !== 'incassato')

  return {
    abbonamento, rate, loading,
    creaAbbonamento, aggiornaAbbonamento, eliminaAbbonamento,
    registraPagamento, azzeraPagamento,
    aggiungiRataMese,
    totaleIncassato, totaleParziale, rataDaIncassare,
    carica
  }
}