import AsyncStorage from '@react-native-async-storage/async-storage'
import * as StoreReview from 'expo-store-review'

const PDF_GENERATI_COUNT_KEY = 'pdf_generati_count'
const STORE_REVIEW_SHOWN_KEY = 'store_review_shown'
const SOGLIA_RECENSIONE = 3

/**
 * Incrementa il contatore locale di PDF salvati con successo e, esattamente
 * al 3° successo (una sola volta), chiede la recensione nativa dello store.
 * Non deve mai interferire con il flusso PDF: errori = skip silenzioso.
 */
export async function richiestaRecensioneSeOpportuno(): Promise<void> {
  try {
    const rawCount = await AsyncStorage.getItem(PDF_GENERATI_COUNT_KEY)
    const count = (Number.parseInt(rawCount || '0', 10) || 0) + 1
    await AsyncStorage.setItem(PDF_GENERATI_COUNT_KEY, String(count))

    if (count !== SOGLIA_RECENSIONE) return

    const alreadyShown = await AsyncStorage.getItem(STORE_REVIEW_SHOWN_KEY)
    if (alreadyShown === 'true') return

    try {
      const available = await StoreReview.isAvailableAsync()
      if (available) {
        await StoreReview.requestReview()
      }
    } finally {
      await AsyncStorage.setItem(STORE_REVIEW_SHOWN_KEY, 'true')
    }
  } catch (err) {
    console.warn('storeReview: richiestaRecensioneSeOpportuno fallita', err)
  }
}
