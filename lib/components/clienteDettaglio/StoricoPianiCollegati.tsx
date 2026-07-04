import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Abbonamento, PreventivoMadre } from '../../types'
import { dataPreventivoMadre, rimuoviDataDaNomePiano, titoloPreventivoMadre } from 'previcloud-shared'
import { TitoloConData } from './TitoloConData'

type Props = {
  piani: Abbonamento[]
  preventivi: Record<string, PreventivoMadre>
  onApriPreventivo?: (preventivoId: string) => void
}

// unused
export function StoricoPianiCollegati({ piani, preventivi, onApriPreventivo }: Props) {
  if (piani.length === 0) return null

  return (
    <View style={styles.section}>
      <Text style={styles.titolo}>{`Piani precedenti (${piani.length})`}</Text>
      {piani.map(piano => {
        const preventivo = piano.preventivo_id ? preventivi[piano.preventivo_id] : null
        return (
          <TouchableOpacity
            key={piano.id}
            style={styles.riga}
            disabled={!preventivo || !onApriPreventivo}
            onPress={() => preventivo && onApriPreventivo?.(preventivo.id)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.nome} numberOfLines={1} ellipsizeMode="tail">
                {piano.nome ? rimuoviDataDaNomePiano(piano.nome) : (piano.tipo === 'rate' ? 'Piano a rate' : 'Abbonamento')}
              </Text>
              {preventivo ? (
                <TitoloConData
                  titolo={titoloPreventivoMadre(preventivo)}
                  data={dataPreventivoMadre(preventivo)}
                  titoloStyle={styles.subTitolo}
                  dataStyle={styles.subData}
                />
              ) : (
                <Text style={styles.sub}>Preventivo non collegato</Text>
              )}
            </View>
            {preventivo && onApriPreventivo ? (
              <Text style={styles.freccia}>{'\u2192'}</Text>
            ) : null}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  titolo: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F7F8FA',
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  nome: { fontSize: 13, fontWeight: '600', color: '#374151' },
  sub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  subTitolo: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },
  subData: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  freccia: { fontSize: 14, color: '#0B7A6D', fontWeight: '600', flexShrink: 0 },
})
