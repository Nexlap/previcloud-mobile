import { Linking, Modal, StyleSheet, Text, View } from 'react-native'

type Props = { visibile: boolean }

export function TrialScadutoModal({ visibile }: Props) {
  return (
    <Modal visible={visibile} transparent={false} animationType="fade" onRequestClose={() => {}}>
      <View style={styles.container}>
        <Text style={styles.titolo}>Periodo di prova terminato</Text>
        <Text style={styles.testo}>
          Il tuo periodo di prova BETA è terminato.{'\n\n'}
          Contattaci per continuare a usare PreviCloud.
        </Text>
        <Text
          style={styles.link}
          onPress={() => Linking.openURL('mailto:previ_cloud@proton.me')}
        >
          Contatta il supporto
        </Text>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', alignItems: 'center', justifyContent: 'center', padding: 32 },
  titolo: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 16, textAlign: 'center' },
  testo: { fontSize: 15, color: '#B0B8C4', textAlign: 'center', lineHeight: 22 },
  link: { marginTop: 24, color: '#0E9F8E', textDecorationLine: 'underline', fontSize: 15 },
})
