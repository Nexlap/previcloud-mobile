import { supabase } from '../supabase'

export type TipoPagamento = 'bonifico' | 'paypal' | 'contanti' | 'carta' | 'stripe'

export type MetodoPagamento = {
  id: string
  user_id: string
  tipo: TipoPagamento
  nome: string
  dati: Record<string, string>
  predefinito: boolean
}

export type MetodoPagamentoForm = {
  tipo: TipoPagamento
  nome: string
  dati: Record<string, string>
  predefinito: boolean
}

export async function caricaMetodiPagamento(): Promise<MetodoPagamento[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('metodi_pagamento')
    .select('*')
    .eq('user_id', user.id)
    .order('predefinito', { ascending: false })

  return (data || []) as MetodoPagamento[]
}

export async function salvaMetodoPagamento(form: MetodoPagamentoForm, editId?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: null, user: null }

  const payload = {
    user_id: user.id,
    tipo: form.tipo,
    nome: form.nome.trim(),
    dati: form.dati,
    predefinito: form.predefinito,
  }

  if (form.predefinito) {
    const { error } = await supabase
      .from('metodi_pagamento')
      .update({ predefinito: false })
      .eq('user_id', user.id)
    if (error) return { error, user }
  }

  const { error } = editId
    ? await supabase.from('metodi_pagamento').update(payload).eq('id', editId)
    : await supabase.from('metodi_pagamento').insert(payload)

  return { error, user }
}

export function eliminaMetodoPagamento(id: string) {
  return supabase.from('metodi_pagamento').delete().eq('id', id)
}
