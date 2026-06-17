import { supabase } from '../supabase'

type NuovoServizioInput = {
  nome: string
  descrizione: string
  costo: string
  unita: string
  ordine: number
}

export async function creaServizioListino(input: NuovoServizioInput) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Utente non autenticato') }

  const payload = {
    nome: input.nome.trim(),
    descrizione: input.descrizione.trim() || null,
    costo: input.costo ? parseFloat(input.costo.replace(',', '.')) : null,
    unita: input.unita,
    user_id: user.id,
    ordine: input.ordine,
  }

  return supabase.from('servizi').insert(payload).select().single()
}
