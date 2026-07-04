import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Text, TouchableOpacity, View } from 'react-native'
import { onboardingStyles as styles } from './onboardingStyles'

type Props = {
  onStart: () => void
}

const FEATURES: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }[] = [
  { icon: 'microphone', text: 'Racconta il lavoro a voce' },
  { icon: 'robot', text: 'Claude genera il preventivo' },
  { icon: 'file-document-outline', text: 'PDF professionale in 30 sec' },
]

export function OnboardingWelcomeStep({ onStart }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeEmoji}>🎉</Text>
        <Text style={styles.welcomeTitle}>Benvenuto in{'\n'}PreviCloud</Text>
        <Text style={styles.welcomeSub}>
          In 2 minuti configuro il tuo profilo.{'\n'}
          Poi generi preventivi professionali{'\n'}
          in 30 secondi.
        </Text>
        <View style={styles.welcomeFeatures}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.welcomeFeature}>
              <MaterialCommunityIcons name={f.icon} size={20} color="#0B7A6D" />
              <Text style={styles.welcomeFeatureText}>{f.text}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.nextBtn} onPress={onStart}>
          <Text style={styles.nextBtnText}>Inizia la configurazione →</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
