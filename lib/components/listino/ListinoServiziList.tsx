import { Text, TouchableOpacity, View } from 'react-native'
import { LongPressAwareTouchableOpacity } from '../LongPressAwarePressable'
import { ServizioForm } from '../../types'
import { formatImportoEuroVisuale } from '../../utils/importo'
import { listinoStyles as styles } from './listinoStyles'

type Props = {
  servizi: ServizioForm[]
  selezioneAttiva: boolean
  serviziSelezionati: string[]
  onPress: (servizio: ServizioForm) => void
  onLongPress: (servizioId: string) => void
  onToggleSelezione: (servizioId: string) => void
  onEdit: (servizio: ServizioForm) => void
  onDelete: (servizioId: string) => void
}

export function ListinoServiziList({
  servizi,
  selezioneAttiva,
  serviziSelezionati,
  onPress,
  onLongPress,
  onToggleSelezione,
  onEdit,
  onDelete,
}: Props) {
  return (
    <>
      {servizi.map(s => {
        const selezionato = serviziSelezionati.includes(s.id)
        return (
          <LongPressAwareTouchableOpacity
            key={s.id}
            style={[styles.servizioCard, selezionato && styles.servizioCardSelected]}
            activeOpacity={0.8}
            onLongPress={() => onLongPress(s.id)}
            onPress={() => onPress(s)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.servizioNome}>{s.nome}</Text>
              {s.descrizione ? <Text style={styles.servizioDesc}>{s.descrizione}</Text> : null}
              {s.costo ? <Text style={styles.servizioCosto}>{`\u20AC${formatImportoEuroVisuale(parseFloat(s.costo) || 0)} / ${s.unita}`}</Text> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => selezioneAttiva ? onToggleSelezione(s.id) : onEdit(s)} style={styles.actionBtn}>
                <Text style={{ fontSize: 16 }}>{'\u270F\uFE0F'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => selezioneAttiva ? onToggleSelezione(s.id) : onDelete(s.id)} style={styles.actionBtn}>
                <Text style={{ fontSize: 16 }}>{'\uD83D\uDDD1'}</Text>
              </TouchableOpacity>
            </View>
          </LongPressAwareTouchableOpacity>
        )
      })}
    </>
  )
}
