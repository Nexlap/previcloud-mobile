import { calcolaImportiRate, calcolaScadenzeRate } from 'previcloud-shared'
import { nomeDaPreventivoId, pianoAttivoSuPreventivo } from './abbonamentoHelpers'
import { supabase } from '../supabase'
import { trackEvento } from './track'

export async function generaRataMeseCorrente(abbonamentoId: string, importo: number) {
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
    stato: 'da_incassare',
  })
}

export async function generaRateMultiple(abbonamentoId: string, importo: number, numeroMesi: number) {
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
      stato: 'da_incassare',
    })
  }
  await supabase.from('rate_abbonamento').insert(inserimenti)
}

export async function generaRateConImporti(
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

type CreaAbbonamentoOpzioni = {
  preventivoId?: string
  numeroMensilita?: number
  note?: string
  tipo?: 'canone' | 'rate'
}

export type CreaAbbonamentoResult =
  | { ok: true }
  | { ok: false; reason: 'no_user' }
  | { ok: false; reason: 'already_linked'; tipo: 'canone' | 'rate' }
  | { ok: false; reason: 'db_error'; message: string }

export async function creaAbbonamento(
  clienteId: string,
  importo: number,
  giornoScadenza: number,
  opzioni?: CreaAbbonamentoOpzioni,
): Promise<CreaAbbonamentoResult> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'no_user' }

  const tipoFinale = opzioni?.tipo || 'canone'
  if (opzioni?.preventivoId) {
    const tipoEsistente = await pianoAttivoSuPreventivo(opzioni.preventivoId)
    if (tipoEsistente) {
      return { ok: false, reason: 'already_linked', tipo: tipoEsistente }
    }
  }

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

  if (error) return { ok: false, reason: 'db_error', message: error.message }

  if (opzioni?.numeroMensilita && opzioni.numeroMensilita > 0) {
    await generaRateMultiple(data.id, importo, opzioni.numeroMensilita)
  } else {
    await generaRataMeseCorrente(data.id, importo)
  }

  void trackEvento('abbonamento_creato', 'cliente_dettaglio', { tipo: 'canone' })
  return { ok: true }
}

type CreaPianoRateOpzioni = {
  preventivoId?: string
  giornoScadenza?: number
  meseInizio?: number
}

export type CreaPianoRateResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_rate_count' }
  | { ok: false; reason: 'already_linked'; tipo: 'canone' | 'rate' }
  | { ok: false; reason: 'no_user' }
  | { ok: false; reason: 'db_error'; message: string }

export async function creaPianoRate(
  clienteId: string,
  importoTotale: number,
  numeroRate: number,
  opzioni?: CreaPianoRateOpzioni,
): Promise<CreaPianoRateResult> {
  const importi = calcolaImportiRate(importoTotale, numeroRate)
  if (importi.length === 0) {
    return { ok: false, reason: 'invalid_rate_count' }
  }

  const preventivoId = opzioni?.preventivoId
  if (preventivoId) {
    const tipoEsistente = await pianoAttivoSuPreventivo(preventivoId)
    if (tipoEsistente) {
      return { ok: false, reason: 'already_linked', tipo: tipoEsistente }
    }
  }

  const giornoScadenza = opzioni?.giornoScadenza ?? new Date().getDate()
  const scadenze = calcolaScadenzeRate(numeroRate, giornoScadenza, opzioni?.meseInizio)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'no_user' }

  const nome = preventivoId ? await nomeDaPreventivoId(preventivoId, 'rate') : null
  const { data, error } = await supabase
    .from('abbonamenti')
    .insert({
      user_id: user.id,
      cliente_id: clienteId,
      importo_default: importoTotale,
      giorno_scadenza: giornoScadenza,
      attivo: true,
      preventivo_id: preventivoId || null,
      numero_mensilita: numeroRate,
      note: null,
      tipo: 'rate',
      nome,
    })
    .select()
    .single()

  if (error) return { ok: false, reason: 'db_error', message: error.message }

  await generaRateConImporti(
    data.id,
    importi.map((importo, i) => ({ importo, ...scadenze[i] })),
  )
  void trackEvento('abbonamento_creato', 'cliente_dettaglio', { tipo: 'rate' })
  return { ok: true }
}
