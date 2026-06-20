import { queryConFiltroCestino } from 'preventivoai-shared'
import { supabase } from '../supabase'
import { calcolaPagamentiIncassati } from './incassi'
import { caricaCollegamentiPianoPreventivi } from './storico'
import { Preventivo, Profile } from '../types'

type PreventivoHomeRow = Preventivo & {
  clienti?: { nome?: string } | { nome?: string }[] | null
}

async function contaPreventiviTotali(userId: string): Promise<number> {
  const base = () =>
    supabase
      .from('preventivi')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_ultimo', true)

  const { count } = await queryConFiltroCestino(
    () => base().is('deleted_at', null),
    () => base(),
  )

  return count || 0
}

async function caricaUltimiPreventivi(userId: string): Promise<Preventivo[]> {
  const build = (conFiltro: boolean) => {
    let q = supabase.from('preventivi')
      .select('id, nome_cliente, importo_totale, stato, pagato, created_at, is_ultimo, cliente_id, clienti(nome)')
      .eq('user_id', userId).eq('is_ultimo', true)
      .order('created_at', { ascending: false }).limit(5)
    if (conFiltro) q = q.is('deleted_at', null)
    return q
  }

  const { data } = await queryConFiltroCestino(() => build(true), () => build(false))

  return ((data || []) as unknown as PreventivoHomeRow[]).map(p => {
    const cliente = Array.isArray(p.clienti) ? p.clienti[0] : p.clienti
    return {
      ...p,
      nome_cliente: cliente?.nome || p.nome_cliente || 'Senza cliente',
    }
  })
}

export async function caricaHomeData() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: prof }, preventivi, preventiviTotali, pagamentiIncassati, collegamentiPiano] = await Promise.all([
    supabase.from('profiles').select('nome_azienda, plan').eq('id', user.id).single(),
    caricaUltimiPreventivi(user.id),
    contaPreventiviTotali(user.id),
    calcolaPagamentiIncassati(user.id),
    caricaCollegamentiPianoPreventivi(),
  ])

  return {
    profile: prof as Profile | null,
    preventivi,
    preventiviTotali,
    minutiRisparmiati: preventiviTotali * 23,
    pagamentiIncassati,
    collegamentiPiano,
  }
}
