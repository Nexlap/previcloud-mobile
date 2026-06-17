import { Audio } from 'expo-av'
import * as ImagePicker from 'expo-image-picker'
import { elaboraServiziDaImmagine, elaboraServiziDaTesto, trascriviAudio } from '../../api/listinoSmart'
import { inserisciServiziListino, preparaServiziDaAI, ServizioAI } from '../../api/listino'
import { ServizioForm } from '../../types'

type ListinoSmartConfig = {
  backendUrl: string
  token: string
  ordineBase: number
}

type EstraiServiziConfig = Omit<ListinoSmartConfig, 'ordineBase'>
type ServizioEstratto = Omit<ServizioForm, 'id'>

async function inserisciServiziElaborati(serviziAI: ServizioAI[], ordineBase: number) {
  const nuovi = await preparaServiziDaAI(serviziAI, ordineBase)
  if (!nuovi) return []
  const { data: inseriti, error } = await inserisciServiziListino(nuovi)
  if (error) throw new Error(error.message)
  return inseriti || []
}

export async function elaboraListinoDaTestoSmart(config: ListinoSmartConfig & { testo: string }) {
  const data = await elaboraServiziDaTesto({
    backendUrl: config.backendUrl,
    token: config.token,
    testo: config.testo,
  })
  if (!data.servizi?.length) return []
  return inserisciServiziElaborati(data.servizi, config.ordineBase)
}

export async function scegliFotoListinoSmart(config: ListinoSmartConfig) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') return { permissionDenied: 'gallery' as const, inseriti: [] }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    base64: true,
  })
  const asset = !result.canceled ? result.assets[0] : null
  if (!asset?.base64) return { canceled: true as const, inseriti: [] }

  const data = await elaboraServiziDaImmagine({
    backendUrl: config.backendUrl,
    token: config.token,
    immagineBase64: asset.base64,
    mimeType: asset.mimeType || 'image/jpeg',
  })
  if (!data.servizi?.length) return { empty: true as const, inseriti: [] }

  return { inseriti: await inserisciServiziElaborati(data.servizi, config.ordineBase) }
}

export async function scattaFotoListinoSmart(config: ListinoSmartConfig) {
  const { status } = await ImagePicker.requestCameraPermissionsAsync()
  if (status !== 'granted') return { permissionDenied: 'camera' as const, inseriti: [] }

  const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true })
  const asset = !result.canceled ? result.assets[0] : null
  if (!asset?.base64) return { canceled: true as const, inseriti: [] }

  const data = await elaboraServiziDaImmagine({
    backendUrl: config.backendUrl,
    token: config.token,
    immagineBase64: asset.base64,
    mimeType: 'image/jpeg',
  })
  if (!data.servizi?.length) return { empty: true as const, inseriti: [] }

  return { inseriti: await inserisciServiziElaborati(data.servizi, config.ordineBase) }
}

export async function scegliFotoServiziSmart(config: EstraiServiziConfig) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') return { permissionDenied: 'gallery' as const, servizi: [] as ServizioEstratto[] }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    base64: true,
  })
  const asset = !result.canceled ? result.assets[0] : null
  if (!asset?.base64) return { canceled: true as const, servizi: [] as ServizioEstratto[] }

  const data = await elaboraServiziDaImmagine({
    backendUrl: config.backendUrl,
    token: config.token,
    immagineBase64: asset.base64,
    mimeType: asset.mimeType || 'image/jpeg',
  })

  return { servizi: (data.servizi || []) as ServizioEstratto[] }
}

export async function scattaFotoServiziSmart(config: EstraiServiziConfig) {
  const { status } = await ImagePicker.requestCameraPermissionsAsync()
  if (status !== 'granted') return { permissionDenied: 'camera' as const, servizi: [] as ServizioEstratto[] }

  const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true })
  const asset = !result.canceled ? result.assets[0] : null
  if (!asset?.base64) return { canceled: true as const, servizi: [] as ServizioEstratto[] }

  const data = await elaboraServiziDaImmagine({
    backendUrl: config.backendUrl,
    token: config.token,
    immagineBase64: asset.base64,
    mimeType: 'image/jpeg',
  })

  return { servizi: (data.servizi || []) as ServizioEstratto[] }
}

export async function avviaRegistrazioneListinoSmart() {
  const { status } = await Audio.requestPermissionsAsync()
  if (status !== 'granted') return null
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
  const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
  return recording
}

export async function fermaRegistrazioneListinoSmart(
  recording: Audio.Recording,
  config: ListinoSmartConfig
) {
  await recording.stopAndUnloadAsync()
  const uri = recording.getURI()
  if (!uri) return []

  const audioData = await fetch(uri)
  const blob = await audioData.blob()
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Impossibile leggere il vocale'))
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '')
    reader.readAsDataURL(blob)
  })

  const trData = await trascriviAudio({ backendUrl: config.backendUrl, token: config.token, audio: base64 })
  if (!trData.trascrizione) return []
  return elaboraListinoDaTestoSmart({ ...config, testo: trData.trascrizione })
}

export async function fermaRegistrazioneServiziSmart(
  recording: Audio.Recording,
  config: EstraiServiziConfig
) {
  await recording.stopAndUnloadAsync()
  const uri = recording.getURI()
  if (!uri) return []

  const audioData = await fetch(uri)
  const blob = await audioData.blob()
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Impossibile leggere il vocale'))
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '')
    reader.readAsDataURL(blob)
  })

  const trData = await trascriviAudio({ backendUrl: config.backendUrl, token: config.token, audio: base64 })
  if (!trData.trascrizione) return []
  const elData = await elaboraServiziDaTesto({ backendUrl: config.backendUrl, token: config.token, testo: trData.trascrizione })
  return (elData.servizi || []) as ServizioEstratto[]
}
