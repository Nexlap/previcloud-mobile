import { useEffect } from 'react'
import { BackHandler } from 'react-native'

/** Su Android, il tasto indietro esce dalla selezione multipla invece di lasciare la schermata. */
export function useAnnullaSelezioneOnAndroidBack(
  selezioneAttiva: boolean,
  onAnnulla: () => void,
) {
  useEffect(() => {
    if (!selezioneAttiva) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onAnnulla()
      return true
    })
    return () => sub.remove()
  }, [selezioneAttiva, onAnnulla])
}
