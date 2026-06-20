import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { BACKEND_URL } from '../constants'
import { sessionToken } from './settings'

// ── API calls per la generazione PDF ─────────────────────────────

interface GeneraPDFParams {
  testo: string
  template: string
  token: string
  versione_padre_id?: string | null
  cliente_id?: string
  nascondi_prezzi?: boolean
}

interface GeneraPDFResult {
  html: string
  versione: number
  numeroPreventivo: string
}

interface GeneraPDFFileResult extends GeneraPDFResult {
  pdf_base64: string
}

export async function generaPDF(params: GeneraPDFParams): Promise<GeneraPDFResult> {
  const res = await fetch(`${BACKEND_URL}/api/genera-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${params.token}` },
    body: JSON.stringify({
      testo: params.testo,
      template: params.template,
      versione_padre_id: params.versione_padre_id || null,
      cliente_id: params.cliente_id || '',
      nascondi_prezzi: params.nascondi_prezzi || false,
    })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export async function generaPDFFile(params: GeneraPDFParams): Promise<GeneraPDFFileResult> {
  const res = await fetch(`${BACKEND_URL}/api/genera-pdf-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${params.token}` },
    body: JSON.stringify({
      testo: params.testo,
      template: params.template,
      versione_padre_id: params.versione_padre_id || null,
      cliente_id: params.cliente_id || '',
      nascondi_prezzi: params.nascondi_prezzi || false,
    })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export async function salvaPDF(pdfBase64: string, token: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/salva-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ pdf_base64: pdfBase64 })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Errore upload PDF (${res.status})`)
  if (data.error) throw new Error(data.error)
  if (!data.pdf_url) throw new Error('Upload PDF completato senza URL online.')
  return data.pdf_url as string
}

export async function creaLinkPagamento(importo: number, descrizione: string, token: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/crea-link-pagamento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ importo, descrizione })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.payment_url
}

export async function creaLinkPagamentoRata(rataId: string, clienteNome: string, token: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/crea-link-pagamento-rata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ rata_id: rataId, cliente_nome: clienteNome })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.payment_url
}

export async function convertiRecap(recap: string, token: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/converti-recap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ recap })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.preventivo
}

export async function ottieniUrlPdfPreventivo(preventivoId: string, token?: string): Promise<string> {
  const auth = token || (await sessionToken())
  const res = await fetch(`${BACKEND_URL}/api/preventivi/${preventivoId}/pdf-url`, {
    headers: { Authorization: `Bearer ${auth}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Errore server (${res.status})`)
  if (!data.pdf_url) throw new Error('PDF non disponibile')
  return data.pdf_url as string
}

export async function scaricaECondividiPdfPreventivo(preventivoId: string): Promise<void> {
  const url = await ottieniUrlPdfPreventivo(preventivoId)
  const fileName = `${FileSystem.cacheDirectory}preventivo_${preventivoId}.pdf`
  const { uri } = await FileSystem.downloadAsync(url, fileName)
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Apri preventivo',
    UTI: 'com.adobe.pdf',
  })
}