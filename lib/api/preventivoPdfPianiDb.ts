import { supabase } from '../supabase'
import { erroreColonnaDeletedAt } from 'preventivoai-shared'
import type { PreventivoPianiDb } from 'preventivoai-shared'

async function esistePianoAttivo(preventivoId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('abbonamenti')
    .select('id')
    .eq('preventivo_id', preventivoId)
    .eq('attivo', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (error && erroreColonnaDeletedAt(error)) {
    const { data: fallback } = await supabase
      .from('abbonamenti')
      .select('id')
      .eq('preventivo_id', preventivoId)
      .eq('attivo', true)
      .maybeSingle()
    return !!fallback
  }

  return !!data
}

export const preventivoPianiDb: PreventivoPianiDb = {
  async getUserId() {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  },
  esistePianoAttivo,
  async fetchPreventivo(preventivoId) {
    const { data } = await supabase
      .from('preventivi')
      .select('titolo, created_at, versione')
      .eq('id', preventivoId)
      .single()
    return data ?? null
  },
  async insertAbbonamento(row) {
    const { data } = await supabase.from('abbonamenti').insert(row).select().single()
    return data ? { id: data.id as string } : null
  },
  async insertRate(rows) {
    await supabase.from('rate_abbonamento').insert(rows)
  },
  async agganciaPianoAPreventivo(abbonamentoId, preventivoId) {
    const { error } = await supabase
      .from('abbonamenti')
      .update({ preventivo_id: preventivoId })
      .eq('id', abbonamentoId)
    return !error
  },
}
