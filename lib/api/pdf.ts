import { BACKEND_URL } from '../constants'

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

export async function salvaPDF(pdfBase64: string, token: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/salva-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ pdf_base64: pdfBase64 })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.pdf_url
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
