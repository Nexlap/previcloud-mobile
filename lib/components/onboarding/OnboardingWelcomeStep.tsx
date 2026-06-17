import { Text, TouchableOpacity, View } from 'react-native'
import { onboardingStyles as styles } from './onboardingStyles'

type Props = {
  onStart: () => void
}

export function OnboardingWelcomeStep({ onStart }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeEmoji}>🎉</Text>
        <Text style={styles.welcomeTitle}>Benvenuto in{'\n'}PreventivoAI</Text>
        <Text style={styles.welcomeSub}>
          In 2 minuti configuro il tuo profilo.{'\n'}
          Poi generi preventivi professionali{'\n'}
          in 30 secondi.
        </Text>
        <View style={styles.welcomeFeatures}>
          {[
            { icon: '🎙', text: 'Racconta il lavoro a voce' },
            { icon: '🤖', text: 'Claude genera il preventivo' },
            { icon: '📄', text: 'PDF professionale in 30 sec' },
          ].map((f, i) => (
            <View key={i} style={styles.welcomeFeature}>
              <Text style={styles.welcomeFeatureIcon}>{f.icon}</Text>
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
