import { supabase } from '../supabase'
import { calcolaPagamentiIncassati } from './incassi'
import { caricaCollegamentiPianoPreventivi } from './storico'
import { Preventivo, Profile } from '../types'

type PreventivoHomeRow = Preventivo & {
  clienti?: { nome?: string } | { nome?: string }[] | null
}

export async function caricaHomeData() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: prof }, { data: prevs }, pagamentiIncassati, collegamentiPiano] = await Promise.all([
    supabase.from('profiles').select('nome_azienda, plan').eq('id', user.id).single(),
    supabase.from('preventivi')
      .select('id, nome_cliente, importo_totale, stato, pagato, created_at, is_ultimo, cliente_id, clienti(nome)')
      .eq('user_id', user.id).eq('is_ultimo', true)
      .order('created_at', { ascending: false }).limit(5),
    calcolaPagamentiIncassati(user.id),
    caricaCollegamentiPianoPreventivi(),
  ])

  const preventivi = ((prevs || []) as unknown as PreventivoHomeRow[]).map(p => {
    const cliente = Array.isArray(p.clienti) ? p.clienti[0] : p.clienti
    return {
      ...p,
      nome_cliente: cliente?.nome || p.nome_cliente || 'Senza cliente'
    }
  })

  return {
    profile: prof as Profile | null,
    preventivi,
    pagamentiIncassati,
    collegamentiPiano,
  }
}
