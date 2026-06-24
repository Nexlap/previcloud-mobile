import React from 'react'
import { Modal, View, Text, StyleSheet, Linking } from 'react-native'

type Props = {
  visibile: boolean
  versioneInstallata?: string
  versioneMinima?: string
}

export function AggiornamentoObbligatorioModal({
  visibile,
  versioneInstallata,
  versioneMinima,
}: Props) {
  return (
    <Modal
      visible={visibile}
      transparent={false}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.container}>
        <Text style={styles.titolo}>Aggiornamento richiesto</Text>
        <Text style={styles.testo}>
          È disponibile un aggiornamento obbligatorio di PreventivoAI.{'\n\n'}
          Versione installata: {versioneInstallata ?? '—'}{'\n'}
          Versione richiesta: {versioneMinima ?? '—'}{'\n\n'}
          Chiudi l'app completamente e riaprila per ricevere l'aggiornamento automatico.
        </Text>
        <Text
          style={{ color: '#0E9F8E', textDecorationLine: 'underline', textAlign: 'center', marginTop: 12, fontSize: 15 }}
          onPress={() => Linking.openURL('https://preventivoai-web.vercel.app/scarica')}
        >
          Scarica l'ultima versione
        </Text>
      </View>
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
})
