import { erroreColonnaDeletedAt, nomePianoDaPreventivo } from 'previcloud-shared'
import { supabase } from '../supabase'

export async function nomeDaPreventivoId(preventivoId: string, tipo: 'canone' | 'rate') {
  const { data } = await supabase
    .from('preventivi')
    .select('titolo, created_at, versione')
    .eq('id', preventivoId)
    .single()
  return data ? nomePianoDaPreventivo(data, tipo) : null
}

export async function pianoAttivoSuPreventivo(preventivoId: string) {
  const { data, error } = await supabase
    .from('abbonamenti')
    .select('id, tipo')
    .eq('preventivo_id', preventivoId)
    .eq('attivo', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (error && erroreColonnaDeletedAt(error)) {
    const { data: fallback } = await supabase
      .from('abbonamenti')
      .select('id, tipo')
      .eq('preventivo_id', preventivoId)
      .eq('attivo', true)
      .maybeSingle()
    return fallback?.tipo as 'canone' | 'rate' | undefined
  }

  return data?.tipo as 'canone' | 'rate' | undefined
}
