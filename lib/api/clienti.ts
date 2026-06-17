import { supabase } from '../supabase'

async function eliminaDatiCollegatiClienti(clienteIds: string[]) {
  if (clienteIds.length === 0) return null

  const { data: abbonamenti, error: abSelErr } = await supabase
    .from('abbonamenti')
    .select('id')
    .in('cliente_id', clienteIds)

  if (abSelErr) return abSelErr

  const abbonamentoIds = (abbonamenti || []).map(a => a.id)
  if (abbonamentoIds.length > 0) {
    const { error: rateErr } = await supabase
      .from('rate_abbonamento')
      .delete()
      .in('abbonamento_id', abbonamentoIds)
    if (rateErr) return rateErr

    const { error: abErr } = await supabase
      .from('abbonamenti')
      .delete()
      .in('id', abbonamentoIds)
    if (abErr) return abErr
  }

  const { error: trErr } = await supabase
    .from('trascrizioni')
    .delete()
    .in('cliente_id', clienteIds)
  if (trErr) return trErr

  const { error: prevErr } = await supabase
    .from('preventivi')
    .delete()
    .in('cliente_id', clienteIds)
  if (prevErr) return prevErr

  return null
}

export async function eliminaClienti(ids: string[]) {
  const cleanupError = await eliminaDatiCollegatiClienti(ids)
  if (cleanupError) return { data: null, error: cleanupError }

  return supabase.from('clienti').delete().in('id', ids)
}
