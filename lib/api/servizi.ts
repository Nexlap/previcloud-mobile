import { supabase } from '../supabase'
import { trackEvento } from './track'
import { parseImportoEuro } from 'previcloud-shared'

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
    costo: input.costo ? parseImportoEuro(input.costo) : null,
    unita: input.unita,
    user_id: user.id,
    ordine: input.ordine,
  }

  const result = await supabase.from('servizi').insert(payload).select().single()
  if (!result.error) void trackEvento('servizio_manuale_aggiunto', 'listino')
  return result
}
