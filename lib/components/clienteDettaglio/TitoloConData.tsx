import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native'

type Props = {
  titolo: string
  data?: string | null
  titoloStyle?: StyleProp<TextStyle>
  dataStyle?: StyleProp<TextStyle>
  linkable?: boolean
}

/** Titolo troncabile + data sempre visibile a destra, stessa riga. */
export function TitoloConData({ titolo, data, titoloStyle, dataStyle, linkable }: Props) {
  return (
    <View style={styles.row}>
      <Text
        style={[styles.titolo, linkable && styles.titoloLink, titoloStyle]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {titolo}
      </Text>
      {data ? <Text style={[styles.data, dataStyle]}>{data}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  titolo: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  titoloLink: { color: '#0E9F8E' },
  data: { flexShrink: 0, fontSize: 12, fontWeight: '600', color: '#6B7280' },
})
