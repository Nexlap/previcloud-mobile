import { router } from 'expo-router'
import { Text, TouchableOpacity, View } from 'react-native'
import { useScreenTheme } from '../../hooks/useScreenTheme'
import { trackEvento } from '../../utils/analytics'
import { AppIcon, type AppIconName } from '../icons/AppIcon'
import { nuovoStyles as styles } from './nuovoStyles'

type Props = {
  clienteNome: string
  clienteId: string
  onScriviTu: () => void
}

type Opzione = {
  icon: AppIconName
  title: string
  sub: string
  onPress: () => void
  trackVocale?: boolean
}

export function NuovoSceltaModalita({ clienteNome, clienteId, onScriviTu }: Props) {
  const { colors, s } = useScreenTheme()

  const opzioni: Opzione[] = [
    {
      icon: 'mic',
      title: 'Registra voce',
      sub: 'Parla del lavoro, trascrivo e genero automaticamente',
      trackVocale: true,
      onPress: () => router.push('/screens/registra'),
    },
    {
      icon: 'edit-3',
      title: 'Scrivi tu',
      sub: "Descrivi il lavoro a testo, l'AI fa le domande giuste",
      onPress: onScriviTu,
    },
    {
      icon: 'list',
      title: 'Builder manuale',
      sub: 'Seleziona i servizi dal listino e assembla',
      onPress: () => router.push({ pathname: '/screens/builder', params: { cliente_id: clienteId, cliente_nome: clienteNome } }),
    },
  ]

  return (
    <View style={styles.sceltaContainer}>
      <Text style={[styles.sceltaTitolo, { color: colors.text }]}>Come vuoi iniziare?</Text>
      <Text style={[styles.sceltaSub, { color: colors.textMuted }]}>Scegli il metodo più comodo per te</Text>

      {clienteNome ? (
        <View style={styles.clienteBadge}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            <AppIcon name="user" size={14} color="#0E9F8E" />
            <Text style={styles.clienteBadgeText}>
              Preventivo per: <Text style={{ fontWeight: '700' }}>{clienteNome}</Text>
            </Text>
          </View>
        </View>
      ) : null}

      {opzioni.map(item => (
        <TouchableOpacity
          key={item.title}
          style={[styles.sceltaCard, s.card]}
          onPress={() => {
            if (item.trackVocale) trackEvento('chat_vocale_avviata', 'chat')
            item.onPress()
          }}
        >
          <View style={styles.sceltaCardIconWrap}>
            <AppIcon name={item.icon} size={24} color="#0E9F8E" />
          </View>
          <View style={styles.sceltaCardBody}>
            <Text style={[styles.sceltaCardTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.sceltaCardSub, { color: colors.textMuted }]}>{item.sub}</Text>
          </View>
          <AppIcon name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  )
}
