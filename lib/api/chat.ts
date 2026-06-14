import { BACKEND_URL } from '../constants'
import { Messaggio } from '../types'

// ── API calls per la chat AI ───────────────────────────────────────

export async function inviaMessaggio(
  messages: Messaggio[],
  token: string,
  clienteId?: string
): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ messages, cliente_id: clienteId || '' })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.reply
}

export async function cercaCliente(nome: string, token: string) {
  const res = await fetch(`${BACKEND_URL}/api/cerca-cliente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ nome })
  })
  const data = await res.json()
  return data.risultati || []
}

export async function creaClienteDaChat(
  dati: { nome: string; telefono?: string; email?: string; indirizzo?: string },
  token: string
) {
  const res = await fetch(`${BACKEND_URL}/api/crea-cliente-da-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dati)
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.cliente
}

export async function elaboraServizi(testo: string, token: string) {
  const res = await fetch(`${BACKEND_URL}/api/elabora-servizi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ testo })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.servizi
}
