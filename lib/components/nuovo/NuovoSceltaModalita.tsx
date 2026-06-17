import { router } from 'expo-router'
import { Text, TouchableOpacity, View } from 'react-native'
import { trackEvento } from '../../utils/analytics'
import { nuovoStyles as styles } from './nuovoStyles'

type Props = {
  clienteNome: string
  clienteId: string
  onScriviTu: () => void
}

export function NuovoSceltaModalita({ clienteNome, clienteId, onScriviTu }: Props) {
  return (
    <View style={styles.sceltaContainer}>
      <Text style={styles.sceltaTitolo}>Come vuoi iniziare?</Text>
      <Text style={styles.sceltaSub}>Scegli il metodo più comodo per te</Text>

      {clienteNome ? (
        <View style={styles.clienteBadge}>
          <Text style={styles.clienteBadgeText}>
            👤 Preventivo per: <Text style={{ fontWeight: '700' }}>{clienteNome}</Text>
          </Text>
        </View>
      ) : null}

      {[
        { icon: '🎙', title: 'Registra voce', sub: 'Parla del lavoro, trascrivo e genero automaticamente', onPress: () => router.push('/screens/registra') },
        { icon: '✍️', title: 'Scrivi tu', sub: "Descrivi il lavoro a testo, l'AI fa le domande giuste", onPress: onScriviTu },
        { icon: '📋', title: 'Builder manuale', sub: 'Seleziona i servizi dal listino e assembla', onPress: () => router.push({ pathname: '/screens/builder', params: { cliente_id: clienteId, cliente_nome: clienteNome } }) },
      ].map(item => (
        <TouchableOpacity
          key={item.title}
          style={styles.sceltaCard}
          onPress={() => {
            if (item.title === 'Registra voce') trackEvento('chat_vocale_avviata', 'chat')
            item.onPress()
          }}
        >
          <Text style={styles.sceltaCardIcon}>{item.icon}</Text>
          <View style={styles.sceltaCardBody}>
            <Text style={styles.sceltaCardTitle}>{item.title}</Text>
            <Text style={styles.sceltaCardSub}>{item.sub}</Text>
          </View>
          <Text style={styles.sceltaCardArrow}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}
