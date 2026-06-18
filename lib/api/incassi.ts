import { supabase } from '../supabase'

type RataIncassoRow = {
  importo: number
  acconto: number
  stato: string
  abbonamenti?: { cliente_id?: string } | { cliente_id?: string }[] | null
}

type PreventivoIncassoRow = {
  id: string
  importo_totale: number | null
  cliente_id: string | null
}

export function sommaImportoRate(rate: Pick<RataIncassoRow, 'importo' | 'acconto' | 'stato'>[]) {
  return rate.reduce((totale, r) => {
    if (r.stato === 'incassato') return totale + (r.importo || 0)
    if (r.stato === 'parziale') return totale + (r.acconto || 0)
    return totale
  }, 0)
}

function clienteIdDaRata(r: RataIncassoRow) {
  const ab = r.abbonamenti
  if (Array.isArray(ab)) return ab[0]?.cliente_id
  return ab?.cliente_id
}

function incassoSingoliPreventivi(
  preventivi: PreventivoIncassoRow[],
  preventiviConAbbonamento: Set<string>,
  clienteId?: string,
) {
  return preventivi
    .filter(p => (!clienteId || p.cliente_id === clienteId) && !preventiviConAbbonamento.has(p.id))
    .reduce((totale, p) => totale + (p.importo_totale || 0), 0)
}

async function caricaDatiIncassiUser(userId: string) {
  const [
    { data: abbonamenti },
    { data: pagati },
    { data: rate },
  ] = await Promise.all([
    supabase.from('abbonamenti').select('preventivo_id').eq('user_id', userId).not('preventivo_id', 'is', null),
    supabase.from('preventivi')
      .select('id, importo_totale, cliente_id')
      .eq('user_id', userId)
      .eq('is_ultimo', true)
      .eq('stato', 'accettato')
      .eq('pagato', true),
    supabase.from('rate_abbonamento')
      .select('importo, acconto, stato, abbonamenti!inner(user_id, cliente_id)')
      .eq('abbonamenti.user_id', userId),
  ])

  const preventiviConAbbonamento = new Set(
    (abbonamenti || []).map(a => a.preventivo_id).filter(Boolean) as string[]
  )

  return {
    preventiviPagati: (pagati || []) as PreventivoIncassoRow[],
    preventiviConAbbonamento,
    rate: (rate || []) as RataIncassoRow[],
  }
}

export async function caricaIncassiPerCliente(userId: string): Promise<Record<string, number>> {
  const { preventiviPagati, preventiviConAbbonamento, rate } = await caricaDatiIncassiUser(userId)
  const map: Record<string, number> = {}

  function add(clienteId: string | null | undefined, amount: number) {
    if (!clienteId || amount <= 0) return
    map[clienteId] = (map[clienteId] || 0) + amount
  }

  for (const p of preventiviPagati) {
    if (!preventiviConAbbonamento.has(p.id)) {
      add(p.cliente_id, p.importo_totale || 0)
    }
  }

  for (const r of rate) {
    add(clienteIdDaRata(r), sommaImportoRate([r]))
  }

  return map
}

export async function calcolaIncassoCliente(userId: string, clienteId: string) {
  const [
    { data: abbonamenti },
    { data: pagati },
    { data: rate },
  ] = await Promise.all([
    supabase.from('abbonamenti').select('preventivo_id').eq('user_id', userId).eq('cliente_id', clienteId).not('preventivo_id', 'is', null),
    supabase.from('preventivi')
      .select('id, importo_totale, cliente_id')
      .eq('user_id', userId)
      .eq('cliente_id', clienteId)
      .eq('is_ultimo', true)
      .eq('stato', 'accettato')
      .eq('pagato', true),
    supabase.from('rate_abbonamento')
      .select('importo, acconto, stato, abbonamenti!inner(user_id, cliente_id)')
      .eq('abbonamenti.user_id', userId)
      .eq('abbonamenti.cliente_id', clienteId),
  ])

  const preventiviConAbbonamento = new Set(
    (abbonamenti || []).map(a => a.preventivo_id).filter(Boolean) as string[]
  )

  const parteA = incassoSingoliPreventivi(
    (pagati || []) as PreventivoIncassoRow[],
    preventiviConAbbonamento,
  )
  const parteB = sommaImportoRate((rate || []) as RataIncassoRow[])

  return parteA + parteB
}

export async function calcolaPagamentiIncassati(userId: string) {
  const map = await caricaIncassiPerCliente(userId)
  return Object.values(map).reduce((totale, valore) => totale + valore, 0)
}
