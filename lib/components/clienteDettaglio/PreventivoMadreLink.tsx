import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { dataPreventivoMadre, titoloPreventivoMadre } from 'previcloud-shared'
import { TitoloConData } from './TitoloConData'

export type PreventivoMadreInfo = {
  id: string
  titolo: string | null
  created_at: string
  versione?: number | null
}

type Props = {
  preventivo: PreventivoMadreInfo | null
  onPress?: (preventivoId: string) => void
}

function ContenutoPreventivoMadre({
  preventivo,
  linkable,
}: {
  preventivo: PreventivoMadreInfo | null
  linkable: boolean
}) {
  if (!preventivo) {
    return (
      <View style={styles.body}>
        <Text style={styles.label}>Preventivo madre</Text>
        <Text style={styles.missing}>Non collegato</Text>
      </View>
    )
  }

  return (
    <View style={styles.body}>
      <Text style={styles.label}>Preventivo madre</Text>
      <TitoloConData
        titolo={titoloPreventivoMadre(preventivo)}
        data={dataPreventivoMadre(preventivo)}
        linkable={linkable}
      />
    </View>
  )
}

export function PreventivoMadreLink({ preventivo, onPress }: Props) {
  if (onPress && preventivo) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(preventivo.id)}
        activeOpacity={0.7}
      >
        <ContenutoPreventivoMadre preventivo={preventivo} linkable />
        <View style={styles.frecciaBox}>
          <Text style={styles.freccia}>{'\u2192'}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.card}>
      <ContenutoPreventivoMadre preventivo={preventivo} linkable={false} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  body: { flex: 1, gap: 3, minWidth: 0 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  missing: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  frecciaBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  freccia: { fontSize: 14, color: '#0B7A6D', fontWeight: '700' },
})
