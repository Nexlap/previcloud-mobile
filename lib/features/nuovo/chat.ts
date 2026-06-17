import { Messaggio } from '../../types'

export function estraiNomeCliente(reply: string) {
  if (!reply.includes('CLIENTE:')) return { reply, nomeCliente: null as string | null }
  const match = reply.match(/CLIENTE:([^\n]+)/)
  if (!match) return { reply, nomeCliente: null as string | null }
  return {
    reply: reply.replace(/CLIENTE:[^\n]+\n?/, '').trim(),
    nomeCliente: match[1].trim(),
  }
}

export function applicaRispostaChat(reply: string, nuovi: Messaggio[]) {
  if (reply.includes('PREVENTIVO_PRONTO')) {
    const [pre, post] = reply.split('PREVENTIVO_PRONTO')
    return {
      messaggi: pre.trim() ? [...nuovi, { role: 'assistant' as const, content: pre.trim() }] : nuovi,
      preventivo: post.trim(),
      recap: '',
    }
  }
  if (reply.includes('RECAP_PRONTO')) {
    const [pre, post] = reply.split('RECAP_PRONTO')
    return {
      messaggi: pre.trim() ? [...nuovi, { role: 'assistant' as const, content: pre.trim() }] : nuovi,
      preventivo: '',
      recap: post.trim(),
    }
  }
  return {
    messaggi: [...nuovi, { role: 'assistant' as const, content: reply }],
    preventivo: '',
    recap: '',
  }
}

export function importoDaPreventivo(testo: string) {
  const match = testo.match(/TOTALE[:\s]*€?\s*([\d.,]+)/i)
  return match ? parseFloat(match[1].replace(',', '.')) : null
}

export function iconaMetodoPagamento(tipo?: string) {
  if (tipo === 'bonifico') return '🏦'
  if (tipo === 'paypal') return '💙'
  if (tipo === 'contanti') return '💵'
  return '💳'
}
