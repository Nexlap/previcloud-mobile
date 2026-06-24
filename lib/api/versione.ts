import Constants from 'expo-constants'
import { BACKEND_URL } from '../constants'

export type VersioneMinima = {
  android: string
  desktop: string
  ios: string
}

function confrontaVersioni(installata: string, minima: string): boolean {
  // Ritorna true se installata >= minima
  const toNumeri = (v: string) => v.split('.').map(Number)
  const [iA, iB, iC] = toNumeri(installata)
  const [mA, mB, mC] = toNumeri(minima)
  if (iA !== mA) return iA > mA
  if (iB !== mB) return iB > mB
  return iC >= mC
}

export async function controllaVersioneMinima(): Promise<boolean> {
  try {
    const risposta = await fetch(`${BACKEND_URL}/api/versione-minima`)
    const dati: VersioneMinima = await risposta.json()
    const versioneInstallata = Constants.expoConfig?.version ?? '1.0.0'
    const versioneMinima = dati.android
    return confrontaVersioni(versioneInstallata, versioneMinima)
  } catch {
    // Se il backend non risponde, non bloccare l'app
    return true
  }
}
