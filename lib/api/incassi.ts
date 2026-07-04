import { queryConFiltroCestino, incassoSingoliPreventivi, sommaImportoRate } from 'previcloud-shared'
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

export { sommaImportoRate }

function clienteIdDaRata(r: RataIncassoRow) {
  const ab = r.abbonamenti
  if (Array.isArray(ab)) return ab[0]?.cliente_id
  return ab?.cliente_id
}

async function caricaAbbonamentiConPreventivo(userId: string, clienteId?: string) {
  const build = (conFiltro: boolean) => {
    let q = supabase
      .from('abbonamenti')
      .select('preventivo_id')
      .eq('user_id', userId)
      .eq('attivo', true)
      .not('preventivo_id', 'is', null)
    if (conFiltro) q = q.is('deleted_at', null)
    if (clienteId) q = q.eq('cliente_id', clienteId)
    return q
  }
  const { data } = await queryConFiltroCestino(() => build(true), () => build(false))
  return data || []
}

async function caricaPreventiviPagati(userId: string, clienteId?: string) {
  const build = (conFiltro: boolean) => {
    let q = supabase
      .from('preventivi')
      .select('id, importo_totale, cliente_id')
      .eq('user_id', userId)
      .eq('is_ultimo', true)
      .eq('stato', 'accettato')
      .eq('pagato', true)
    if (conFiltro) q = q.is('deleted_at', null)
    if (clienteId) q = q.eq('cliente_id', clienteId)
    return q
  }
  const { data } = await queryConFiltroCestino(() => build(true), () => build(false))
  return (data || []) as PreventivoIncassoRow[]
}

async function caricaRateIncasso(userId: string, clienteId?: string) {
  const build = (conFiltro: boolean) => {
    let q = supabase
      .from('rate_abbonamento')
      .select(
        conFiltro
          ? 'importo, acconto, stato, abbonamenti!inner(user_id, cliente_id, attivo, deleted_at)'
          : 'importo, acconto, stato, abbonamenti!inner(user_id, cliente_id, attivo)',
      )
      .eq('abbonamenti.user_id', userId)
      .eq('abbonamenti.attivo', true)
    if (conFiltro) q = q.is('abbonamenti.deleted_at', null)
    if (clienteId) q = q.eq('abbonamenti.cliente_id', clienteId)
    return q
  }
  const { data } = await queryConFiltroCestino(() => build(true), () => build(false))
  return (data || []) as RataIncassoRow[]
}

async function caricaDatiIncassiUser(userId: string) {
  const [abbonamenti, pagati, rate] = await Promise.all([
    caricaAbbonamentiConPreventivo(userId),
    caricaPreventiviPagati(userId),
    caricaRateIncasso(userId),
  ])

  const preventiviConAbbonamento = new Set(
    abbonamenti.map(a => a.preventivo_id).filter(Boolean) as string[],
  )

  return {
    preventiviPagati: pagati,
    preventiviConAbbonamento,
    rate,
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
  const [abbonamenti, pagati, rate] = await Promise.all([
    caricaAbbonamentiConPreventivo(userId, clienteId),
    caricaPreventiviPagati(userId, clienteId),
    caricaRateIncasso(userId, clienteId),
  ])

  const preventiviConAbbonamento = new Set(
    abbonamenti.map(a => a.preventivo_id).filter(Boolean) as string[],
  )

  const parteA = incassoSingoliPreventivi(pagati, preventiviConAbbonamento)
  const parteB = sommaImportoRate(rate)

  return parteA + parteB
}

export async function calcolaPagamentiIncassati(userId: string) {
  const map = await caricaIncassiPerCliente(userId)
  return Object.values(map).reduce((totale, valore) => totale + valore, 0)
}
