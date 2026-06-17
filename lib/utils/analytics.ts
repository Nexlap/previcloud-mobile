import { supabase } from '../supabase'

export async function trackEvento(evento: string, schermata?: string, dati?: Record<string, unknown>) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('eventi').insert({
      user_id: user.id,
      evento,
      schermata,
      dati
    })
  } catch (e) {
    // Silenzioso — non bloccare l'app per analytics
  }
}

export async function trackSessione() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('sessioni').select('id, numero_sessioni').eq('user_id', user.id).single()
    if (data) {
      await supabase.from('sessioni').update({ ultimo_accesso: new Date().toISOString(), numero_sessioni: data.numero_sessioni + 1 }).eq('user_id', user.id)
    } else {
      await supabase.from('sessioni').insert({ user_id: user.id })
    }
  } catch (e) {
    // Silenzioso
  }
}
