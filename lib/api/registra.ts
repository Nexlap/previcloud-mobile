import * as FileSystem from 'expo-file-system/legacy'
import { supabase } from '../supabase'

export async function sessionTokenRegistra() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || ''
}

export async function trascriviRegistrazione({
  backendUrl,
  token,
  uri,
}: {
  backendUrl: string
  token: string
  uri: string
}) {
  const audioBase64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as FileSystem.EncodingType })
  const res = await fetch(`${backendUrl}/api/trascrivi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ audio: audioBase64, durata: 0 })
  })

  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.trascrizione ? String(data.trascrizione).trim() : ''
}
