import { inputDateToIso, oggiInputDate } from 'preventivoai-shared'
import { spostaAbbonamentiInCestino } from '../cestino'
import { supabase } from '../supabase'
import { trackEvento } from './track'
import { RataAbbonamento } from '../types'

export async function aggiornaAbbonamento(
  abbonamentoId: string,
  importo: number,
  giornoScadenza: number,
) {
  return supabase
    .from('abbonamenti')
    .update({ importo_default: importo, giorno_scadenza: giornoScadenza })
    .eq('id', abbonamentoId)
}

export async function rinominaAbbonamento(abbonamentoId: string, nuovoNome: string) {
  return supabase
    .from('abbonamenti')
    .update({ nome: nuovoNome })
    .eq('id', abbonamentoId)
}

export async function eliminaAbbonamentiInCestino(abbonamentoIds: string[]) {
  if (abbonamentoIds.length === 0) return { error: null as null | { message: string } }
  return spostaAbbonamentiInCestino(abbonamentoIds)
}

export type AggiornamentoRataPagamento = Partial<RataAbbonamento> & { data_incasso?: string | null }

export async function registraPagamentoRata(
  rataId: string,
  rata: RataAbbonamento,
  importoPagato: number,
  nota?: string,
  dataIncasso?: string,
) {
  const nuovoAcconto = Math.min(rata.acconto + importoPagato, rata.importo)
  const nuovoSaldo = rata.importo - nuovoAcconto
  const nuovoStato = nuovoSaldo <= 0 ? 'incassato' : 'parziale'

  const aggiornamento: AggiornamentoRataPagamento = {
    acconto: nuovoAcconto,
    stato: nuovoStato,
    note: nota || rata.note || null,
  }
  if (nuovoStato === 'incassato') {
    aggiornamento.data_incasso = dataIncasso ?? inputDateToIso(oggiInputDate())
  }

  const { error } = await supabase
    .from('rate_abbonamento')
    .update(aggiornamento)
    .eq('id', rataId)

  if (!error) void trackEvento('pagamento_registrato', 'cliente_dettaglio')
  return { error, aggiornamento, nuovoSaldo }
}

export async function azzeraPagamentoRata(rataId: string) {
  const aggiornamento: AggiornamentoRataPagamento & { data_incasso: null } = {
    acconto: 0,
    stato: 'da_incassare',
    data_incasso: null,
    note: null,
  }
  const { error } = await supabase
    .from('rate_abbonamento')
    .update(aggiornamento)
    .eq('id', rataId)
  return { error, aggiornamento }
}

export async function trovaRataMeseEsistente(abbonamentoId: string, mese: number, anno: number) {
  return supabase
    .from('rate_abbonamento')
    .select('id')
    .eq('abbonamento_id', abbonamentoId)
    .eq('mese', mese)
    .eq('anno', anno)
    .single()
}

export async function inserisciRataMese(
  abbonamentoId: string,
  mese: number,
  anno: number,
  importo: number,
) {
  return supabase
    .from('rate_abbonamento')
    .insert({
      abbonamento_id: abbonamentoId,
      mese,
      anno,
      importo,
      acconto: 0,
      stato: 'da_incassare',
    })
    .select()
    .single()
}

export async function eliminaRate(rataIds: string[]) {
  if (!rataIds.length) return { error: null as null | { message: string } }
  return supabase
    .from('rate_abbonamento')
    .delete()
    .in('id', rataIds)
}
