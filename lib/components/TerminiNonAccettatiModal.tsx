import { useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../supabase'
import { currentUserId } from '../api/auth'

type ContentProps = {
  onAccettati: () => void
}

/** UI blocco termini riusabile come schermata standalone o dentro Modal. */
export function TerminiNonAccettatiContent({ onAccettati }: ContentProps) {
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState('')

  async function handleAccetta() {
    setErrore('')
    setSalvando(true)
    try {
      const userId = await currentUserId()
      if (!userId) {
        setErrore('Sessione non valida. Riprova.')
        return
      }
      const { error } = await supabase
        .from('profiles')
        .update({
          termini_accettati: true,
          termini_accettati_at: new Date().toISOString(),
        })
        .eq('id', userId)
      if (error) {
        setErrore('Impossibile salvare l\'accettazione. Riprova.')
        return
      }
      onAccettati()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titolo}>Termini di Servizio</Text>
      <Text style={styles.testo}>
        Prima di continuare, leggi e accetta i Termini di Servizio di PreviCloud.
      </Text>
      <Text
        style={styles.link}
        onPress={() => Linking.openURL('https://previcloud.it/termini')}
      >
        Apri i Termini di Servizio
      </Text>
      {errore ? <Text style={styles.errore}>{errore}</Text> : null}
      <TouchableOpacity
        style={[styles.btn, salvando && styles.btnDisabled]}
        onPress={() => void handleAccetta()}
        disabled={salvando}
        activeOpacity={0.85}
      >
        {salvando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Ho letto e accetto i Termini di Servizio</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

type Props = {
  visibile: boolean
  onAccettati: () => void
}

export function TerminiNonAccettatiModal({ visibile, onAccettati }: Props) {
  return (
    <Modal
      visible={visibile}
      transparent={false}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <TerminiNonAccettatiContent onAccettati={onAccettati} />
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  titolo: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  testo: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 24,
  },
  link: {
    color: '#0E9F8E',
    textDecorationLine: 'underline',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 15,
  },
  errore: {
    marginTop: 16,
    color: '#F87171',
    textAlign: 'center',
    fontSize: 14,
  },
  btn: {
    marginTop: 28,
    backgroundColor: '#0E9F8E',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
})
