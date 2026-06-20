import { Abbonamento, PreventivoMadre, RataAbbonamento } from '../types'
import { supabase } from '../supabase'

const PREVENTIVO_MADRE_SELECT = 'id, titolo, created_at, versione, importo_totale, stato'

export type CaricaPianiClienteOpts = {
  soloTipo?: 'canone' | 'rate'
}

export async function caricaPreventiviMadreMap(abbonamenti: Abbonamento[]) {
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

export async function caricaRatePerPiani(abbonamentoIds: string[]) {
  if (abbonamentoIds.length === 0) return {}
  const { data } = await supabase
    .from('rate_abbonamento')
    .select('*')
    .in('abbonamento_id', abbonamentoIds)
    .order('anno', { ascending: true })
    .order('mese', { ascending: true })
  const map: Record<string, RataAbbonamento[]> = {}
  for (const id of abbonamentoIds) map[id] = []
  for (const rata of data || []) {
    if (!map[rata.abbonamento_id]) map[rata.abbonamento_id] = []
    map[rata.abbonamento_id].push(rata)
  }
  return map
}

export async function caricaPianiCliente(clienteId: string, opts?: CaricaPianiClienteOpts) {
  let query = supabase
    .from('abbonamenti')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
  if (opts?.soloTipo) query = query.eq('tipo', opts.soloTipo)
  const { data: tutti } = await query

  const lista = (tutti || []).filter(a => !(a as { deleted_at?: string | null }).deleted_at)
  const attivi = lista.filter(a => a.attivo)
  const storico = lista.filter(a => !a.attivo)
  const preventiviMadreStorico = await caricaPreventiviMadreMap(lista)
  const ratePerPiano = await caricaRatePerPiani(attivi.map(a => a.id))

  return {
    attivi,
    storico,
    preventiviMadreStorico,
    ratePerPiano,
  }
}
