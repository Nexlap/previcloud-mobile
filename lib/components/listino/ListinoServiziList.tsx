import { Text, TouchableOpacity, View } from 'react-native'
import { LongPressAwareTouchableOpacity } from '../LongPressAwarePressable'
import { useScreenTheme } from '../../hooks/useScreenTheme'
import { ServizioForm } from '../../types'
import { formatImportoEuroVisuale } from '../../utils/importo'
import { AppIcon } from '../icons/AppIcon'
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
  const { colors, isDark, s } = useScreenTheme()

  return (
    <>
      {servizi.map(srv => {
        const selezionato = serviziSelezionati.includes(srv.id)
        return (
          <LongPressAwareTouchableOpacity
            key={srv.id}
            style={[
              styles.servizioCard,
              s.card,
              selezionato && {
                borderColor: '#0E9F8E',
                backgroundColor: isDark ? 'rgba(14,159,142,0.12)' : '#F0FDF4',
              },
            ]}
            activeOpacity={0.8}
            onLongPress={() => onLongPress(srv.id)}
            onPress={() => onPress(srv)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.servizioNome, { color: colors.text }]}>{srv.nome}</Text>
              {srv.descrizione ? <Text style={[styles.servizioDesc, { color: colors.textMuted }]}>{srv.descrizione}</Text> : null}
              {srv.costo ? <Text style={styles.servizioCosto}>{`\u20AC${formatImportoEuroVisuale(parseFloat(srv.costo) || 0)} / ${srv.unita}`}</Text> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => selezioneAttiva ? onToggleSelezione(srv.id) : onEdit(srv)} style={styles.actionBtn}>
                <AppIcon name="edit-2" size={18} color={colors.icon} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => selezioneAttiva ? onToggleSelezione(srv.id) : onDelete(srv.id)} style={styles.actionBtn}>
                <AppIcon name="trash-2" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </LongPressAwareTouchableOpacity>
        )
      })}
    </>
  )
}
