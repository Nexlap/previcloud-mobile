import { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { MESI_BREVI } from '../constants'
import { supabase } from '../supabase'
import { Abbonamento, PreventivoMadre, RataAbbonamento } from '../types'
import { calcolaImportiRate, calcolaScadenzeRate } from '../utils/importo'
import { nomePianoDaPreventivo } from '../utils/preventivoMadre'

type UseAbbonamentoOpts = {
  soloTipo?: 'canone' | 'rate'
}

const PREVENTIVO_MADRE_SELECT = 'id, titolo, created_at, versione, importo_totale, stato'

async function caricaPreventivoMadre(preventivoId: string | null) {
  if (!preventivoId) return null
  const { data } = await supabase
    .from('preventivi')
    .select(PREVENTIVO_MADRE_SELECT)
    .eq('id', preventivoId)
    .single()
  return (data as PreventivoMadre | null) || null
}

async function nomeDaPreventivoId(preventivoId: string, tipo: 'canone' | 'rate') {
  const { data } = await supabase
    .from('preventivi')
    .select('titolo, created_at, versione')
    .eq('id', preventivoId)
    .single()
  return data ? nomePianoDaPreventivo(data, tipo) : null
}

export function useAbbonamento(clienteId: string, opts?: UseAbbonamentoOpts) {
  const [abbonamento, setAbbonamento] = useState<Abbonamento | null>(null)
  const [abbonamentiStorico, setAbbonamentiStorico] = useState<Abbonamento[]>([])
  const [preventivoMadre, setPreventivoMadre] = useState<PreventivoMadre | null>(null)
  const [preventiviMadreStorico, setPreventiviMadreStorico] = useState<Record<string, PreventivoMadre>>({})
  const [rate, setRate] = useState<RataAbbonamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carica() }, [clienteId, opts?.soloTipo])

  async function caricaPreventiviMadreMap(abbonamenti: Abbonamento[]) {
    const ids = [...new Set(abbonamenti.map(a => a.preventivo_id).filter(Boolean))] as string[]
    if (ids.length === 0) return {}
    const { data } = await supabase
      .from('preventivi')
      .select(PREVENTIVO_MADRE_SELECT)
      .in('id', ids)
    const map: Record<string, PreventivoMadre> = {}
    for (const p of (data || []) as PreventivoMadre[]) map[p.id] = p
    return map
  }

  async function carica() {
    setLoading(true)
    let query = supabase
      .from('abbonamenti')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
    if (opts?.soloTipo) query = query.eq('tipo', opts.soloTipo)
    const { data: tutti } = await query

    const lista = tutti || []
    const attivo = lista.find(a => a.attivo) || null
    const storico = lista.filter(a => !a.attivo)
    const preventiviMap = await caricaPreventiviMadreMap(lista)

    setAbbonamento(attivo)
    setAbbonamentiStorico(storico)
    setPreventivoMadre(attivo?.preventivo_id ? preventiviMap[attivo.preventivo_id] || null : null)
    setPreventiviMadreStorico(preventiviMap)

    if (attivo) {
      await caricaRate(attivo.id)
    } else {
      setRate([])
    }
    setLoading(false)
  }

  async function caricaRate(abbonamentoId: string) {
    const { data } = await supabase
      .from('rate_abbonamento')
      .select('*')
      .eq('abbonamento_id', abbonamentoId)
      .order('anno', { ascending: true })
      .order('mese', { ascending: true })
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

    const tipoFinale = opzioni?.tipo || 'canone'
    const nome = opzioni?.preventivoId
      ? await nomeDaPreventivoId(opzioni.preventivoId, tipoFinale)
      : null

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
        tipo: tipoFinale,
        nome,
      })
      
      .select()
      .single()

    if (error) { Alert.alert('Errore', error.message); return }
    setAbbonamento(data)
    if (opzioni?.preventivoId) {
      setPreventivoMadre(await caricaPreventivoMadre(opzioni.preventivoId))
    } else {
      setPreventivoMadre(null)
    }

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

  async function generaRateConImporti(
    abbonamentoId: string,
    voci: { importo: number; mese: number; anno: number }[],
  ) {
    if (voci.length === 0) return
    await supabase.from('rate_abbonamento').insert(
      voci.map(v => ({
        abbonamento_id: abbonamentoId,
        mese: v.mese,
        anno: v.anno,
        importo: v.importo,
        acconto: 0,
        stato: 'da_incassare' as const,
      })),
    )
  }

  async function creaPianoRate(preventivoId: string, importoTotale: number, numeroRate: number) {
    const importi = calcolaImportiRate(importoTotale, numeroRate)
    if (importi.length === 0) {
      Alert.alert('Errore', 'Inserisci un numero di rate valido (minimo 2).')
      return false
    }
    const giornoScadenza = new Date().getDate()
    const scadenze = calcolaScadenzeRate(numeroRate, giornoScadenza)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const nome = await nomeDaPreventivoId(preventivoId, 'rate')
    const { data, error } = await supabase
      .from('abbonamenti')
      .insert({
        user_id: user.id,
        cliente_id: clienteId,
        importo_default: importoTotale,
        giorno_scadenza: giornoScadenza,
        attivo: true,
        preventivo_id: preventivoId,
        numero_mensilita: numeroRate,
        note: null,
        tipo: 'rate',
        nome,
      })
      .select()
      .single()

    if (error) { Alert.alert('Errore', error.message); return false }
    setAbbonamento(data)
    setPreventivoMadre(await caricaPreventivoMadre(preventivoId))

    await generaRateConImporti(
      data.id,
      importi.map((importo, i) => ({ importo, ...scadenze[i] })),
    )
    await caricaRate(data.id)
    return true
  }

  async function segnaRataPagata(rataId: string, pagata: boolean) {
    const rata = rate.find(r => r.id === rataId)
    if (!rata) return
    if (pagata) {
      await registraPagamento(rataId, rata.importo - (rata.acconto || 0))
    } else {
      await azzeraPagamento(rataId)
    }
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

  async function modificaImportoPianoRate(nuovoImportoTotale: number) {
    if (!abbonamento) return false
    if (!(nuovoImportoTotale > 0)) {
      Alert.alert('Importo non valido', 'Inserisci un importo maggiore di zero.')
      return false
    }

    const raccolto = rate.reduce(
      (a, r) => a + (r.stato === 'incassato' ? r.importo : (r.acconto || 0)),
      0,
    )
    if (nuovoImportoTotale < raccolto) {
      Alert.alert(
        'Importo troppo basso',
        `Hai già incassato \u20AC${raccolto.toFixed(2).replace('.', ',')}. L'importo totale non può essere inferiore.`,
      )
      return false
    }

    const rateAperte = [...rate]
      .filter(r => r.stato !== 'incassato')
      .sort((a, b) => a.anno - b.anno || a.mese - b.mese)
    if (rateAperte.length === 0) {
      Alert.alert('Nessuna rata da aggiornare', 'Tutte le rate sono già pagate.')
      return false
    }

    const residuo = Math.round((nuovoImportoTotale - raccolto) * 100) / 100
    const nuoviImporti = calcolaImportiRate(residuo, rateAperte.length)
    if (nuoviImporti.length === 0) return false

    const { error: errAb } = await supabase
      .from('abbonamenti')
      .update({ importo_default: nuovoImportoTotale })
      .eq('id', abbonamento.id)
    if (errAb) { Alert.alert('Errore', errAb.message); return false }

    for (let i = 0; i < rateAperte.length; i++) {
      const rata = rateAperte[i]
      const nuovoImporto = nuoviImporti[i]
      const acconto = rata.acconto || 0
      let nuovoStato: RataAbbonamento['stato'] = rata.stato
      if (acconto >= nuovoImporto) nuovoStato = 'incassato'
      else if (acconto > 0) nuovoStato = 'parziale'

      const { error } = await supabase
        .from('rate_abbonamento')
        .update({ importo: nuovoImporto, stato: nuovoStato })
        .eq('id', rata.id)
      if (error) { Alert.alert('Errore', error.message); return false }
    }

    setAbbonamento(a => a ? { ...a, importo_default: nuovoImportoTotale } : a)
    await caricaRate(abbonamento.id)
    return true
  }

  async function eliminaAbbonamento() {
    if (!abbonamento) return
    const { error } = await supabase
      .from('abbonamenti')
      .update({ attivo: false })
      .eq('id', abbonamento.id)
    if (error) { Alert.alert('Errore', error.message); return }
    await carica()
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
    if (!abbonamento) return false
    const { data: esistente } = await supabase
      .from('rate_abbonamento')
      .select('id')
      .eq('abbonamento_id', abbonamento.id)
      .eq('mese', mese)
      .eq('anno', anno)
      .single()
    if (esistente) {
      Alert.alert('Rata già presente', `Esiste già una rata per ${MESI_BREVI[mese - 1]} ${anno}`)
      return false
    }

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
    if (error) { Alert.alert('Errore', error.message); return false }
    setRate(r => [...r, data].sort((a, b) => a.anno - b.anno || a.mese - b.mese))
    return true
  }

  async function eliminaRate(rataIds: string[]) {
    if (!rataIds.length) return false
    const { error } = await supabase
      .from('rate_abbonamento')
      .delete()
      .in('id', rataIds)
    if (error) { Alert.alert('Errore', error.message); return false }
    setRate(r => r.filter(x => !rataIds.includes(x.id)))
    return true
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

  async function rinominaAbbonamento(nuovoNome: string) {
    if (!abbonamento) return
    const { error } = await supabase
      .from('abbonamenti')
      .update({ nome: nuovoNome })
      .eq('id', abbonamento.id)
    if (error) { Alert.alert('Errore', error.message); return }
    setAbbonamento(a => a ? { ...a, nome: nuovoNome } : a)
  }
async function modificaImportoRata(rataId: string, nuovoImporto: number) {
  const { error } = await supabase
    .from('rate_abbonamento')
    .update({ importo: nuovoImporto })
    .eq('id', rataId)
  if (error) { Alert.alert('Errore', error.message); return }
  setRate(r => r.map(x => x.id === rataId ? { ...x, importo: nuovoImporto } : x))
}

  const totaleIncassato = rate
    .filter(r => r.stato === 'incassato')
    .reduce((a, r) => a + r.importo, 0)

  const totaleParziale = rate
    .filter(r => r.stato === 'parziale')
    .reduce((a, r) => a + r.acconto, 0)

  const rataDaIncassare = rate.find(r => r.stato !== 'incassato')

 return {
    abbonamento, abbonamentiStorico, preventivoMadre, preventiviMadreStorico, rate, loading,
    creaAbbonamento, creaPianoRate, aggiornaAbbonamento, eliminaAbbonamento,
    modificaImportoPianoRate,
    registraPagamento, azzeraPagamento, segnaRataPagata,
    aggiungiRataMese, eliminaRate, rinominaAbbonamento, modificaImportoRata,
    totaleIncassato, totaleParziale, rataDaIncassare,
    carica
  }
}
