import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { AppIcon } from '../icons/AppIcon'
import { nuovoStyles as styles } from './nuovoStyles'

type Props = {
  recap: string
  loading: boolean
  onGeneraPreventivo: () => void
  onModifica: () => void
}

export function NuovoRecapView({
  recap,
  loading,
  onGeneraPreventivo,
  onModifica,
}: Props) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.recapCard}>
        <View style={styles.recapHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={17} color="#0D1B2A" />
            <Text style={styles.recapHeaderTitle}>Riepilogo lavoro</Text>
          </View>
          <Text style={styles.recapHeaderSub}>Conferma o modifica prima di generare</Text>
        </View>
        <Text style={styles.recapText}>{recap}</Text>
        <View style={styles.recapActions}>
          <TouchableOpacity style={[styles.recapConfirmBtn, { flexDirection: 'row', justifyContent: 'center', gap: 8 }]} onPress={onGeneraPreventivo}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <AppIcon name="check" size={15} color="#fff" />
                  <Text style={styles.recapConfirmText}>Genera preventivo</Text>
                </>
            }
          </TouchableOpacity>
          <TouchableOpacity style={[styles.recapEditBtn, { flexDirection: 'row', justifyContent: 'center', gap: 6 }]} onPress={onModifica}>
            <AppIcon name="edit-2" size={13} color="#0D1B2A" />
            <Text style={styles.recapEditText}>Modifica</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}
