import { Text, TouchableOpacity, View } from 'react-native'
import { onboardingStyles as styles } from './onboardingStyles'

type Props = {
  stepAttuale: number
  stepMassimoRaggiunto: number
  onNavigate: (s: number) => void
  canNavigate: (s: number) => boolean
}

export function OnboardingStepper({
  stepAttuale,
  stepMassimoRaggiunto,
  onNavigate,
  canNavigate,
}: Props) {
  const step_labels = [1, 2, 3, 4]
  return (
    <View style={styles.stepperRow}>
      {step_labels.map((num, i) => {
        const stepIndex = i + 1
        const reactStep = stepIndex - 1
        const attivo = stepIndex === stepAttuale
        const completato = stepIndex < stepAttuale
        const cliccabile = reactStep <= stepMassimoRaggiunto + 1 && canNavigate(reactStep)
        return (
          <View key={num} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              disabled={!cliccabile}
              onPress={() => cliccabile && onNavigate(reactStep)}
              style={[
                styles.stepperCircle,
                attivo && styles.stepperCircleActive,
                completato && styles.stepperCircleDone,
              ]}
            >
              <Text style={[styles.stepperCircleText, (attivo || completato) && styles.stepperCircleTextActive]}>
                {num}
              </Text>
            </TouchableOpacity>
            {i < step_labels.length - 1 && (
              <View style={[styles.stepperLine, stepIndex < stepAttuale && styles.stepperLineDone]} />
            )}
          </View>
        )
      })}
    </View>
  )
}
