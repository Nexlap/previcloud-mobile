import { trackEvento } from './track'

type AuthRequest = {
  backendUrl: string
  token: string
}

export async function elaboraServiziDaTesto({ backendUrl, token, testo }: AuthRequest & { testo: string }) {
  const res = await fetch(`${backendUrl}/api/elabora-servizi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ testo })
  })
  if (res.ok) void trackEvento('listino_testo_ai', 'listino')
  return res.json()
}

export async function elaboraServiziDaImmagine({
  backendUrl,
  token,
  immagineBase64,
  mimeType,
}: AuthRequest & { immagineBase64: string, mimeType: string }) {
  const res = await fetch(`${backendUrl}/api/elabora-servizi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ immagine_base64: immagineBase64, mime_type: mimeType })
  })
  if (res.ok) void trackEvento('listino_foto', 'listino')
  return res.json()
}

export async function trascriviAudio({ backendUrl, token, audio }: AuthRequest & { audio: string }) {
  const res = await fetch(`${backendUrl}/api/trascrivi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ audio })
  })
  if (res.ok) void trackEvento('listino_vocale', 'listino')
  return res.json()
}
