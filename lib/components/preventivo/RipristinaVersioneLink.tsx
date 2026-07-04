import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { Preventivo } from '../../types'

type Props = {
  versione: Preventivo
  onRipristina: () => void
}

export function RipristinaVersioneLink({ versione, onRipristina }: Props) {
  return (
    <TouchableOpacity
      style={styles.link}
      activeOpacity={0.6}
      onPress={() => Alert.alert('Ripristina versione', `Vuoi ripristinare la v${versione.versione || 1}?`, [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Ripristina', onPress: onRipristina },
      ])}
    >
      <Text style={styles.linkText}>{'\u21A9'} Ripristina questa versione</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start', paddingVertical: 4 },
  linkText: { fontSize: 13, color: '#0B7A6D', fontWeight: '500', textDecorationLine: 'underline' },
})
