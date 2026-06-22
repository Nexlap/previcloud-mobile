import { queryConFiltroCestino } from 'preventivoai-shared'
import { supabase } from '../supabase'
import { calcolaPagamentiIncassati } from './incassi'
import { caricaCollegamentiPianoPreventivi } from './storico'
import { Preventivo, Profile } from '../types'

type PreventivoHomeRow = Preventivo & {
  clienti?: { nome?: string } | { nome?: string }[] | null
}

function inizioMese(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset, 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function fineMese(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset + 1, 0)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

async function contaPreventiviMese(userId: string, offsetMese = 0): Promise<number> {
  const inizio = inizioMese(offsetMese)
  const fine = fineMese(offsetMese)

  const base = () =>
    supabase
      .from('preventivi')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_ultimo', true)
      .gte('created_at', inizio)
      .lte('created_at', fine)

  const { count } = await queryConFiltroCestino(
    () => base().is('deleted_at', null),
    () => base(),
  )

  return count || 0
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
  const base = () =>
    supabase
      .from('preventivi')
      .select('id, titolo, nome_cliente, importo_totale, stato, pagato, created_at, is_ultimo, cliente_id, clienti(nome)')
      .eq('user_id', userId)
      .eq('is_ultimo', true)
      .order('created_at', { ascending: false })
      .limit(5)

  const { data } = await queryConFiltroCestino(
    () => base().is('deleted_at', null),
    () => base(),
  )

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

  const [
    { data: prof },
    preventivi,
    preventiviTotali,
    preventiviMese,
    preventiviMeseScorso,
    pagamentiIncassati,
    collegamentiPiano,
  ] = await Promise.all([
    supabase.from('profiles').select('nome_azienda, plan').eq('id', user.id).single(),
    caricaUltimiPreventivi(user.id),
    contaPreventiviTotali(user.id),
    contaPreventiviMese(user.id, 0),
    contaPreventiviMese(user.id, -1),
    calcolaPagamentiIncassati(user.id),
    caricaCollegamentiPianoPreventivi(),
  ])

  return {
    profile: prof as Profile | null,
    preventivi,
    preventiviTotali,
    preventiviMese,
    preventiviMeseScorso,
    minutiRisparmiati: preventiviTotali * 23,
    pagamentiIncassati,
    collegamentiPiano,
  }
}
