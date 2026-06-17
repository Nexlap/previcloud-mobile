import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { CATEGORIE } from '../../features/onboarding/constants'
import { OnboardingStepper } from './OnboardingStepper'
import { onboardingStyles as styles } from './onboardingStyles'

type Props = {
  stepMassimoRaggiunto: number
  nomeAzienda: string
  citta: string
  categoria: string
  firmaNome: string
  onNomeAziendaChange: (v: string) => void
  onCittaChange: (v: string) => void
  onCategoriaChange: (v: string) => void
  onFirmaNomeChange: (v: string) => void
  onNavigate: (s: number) => void
  canNavigate: (s: number) => boolean
  onNext: () => void
}

export function OnboardingAziendaStep({
  stepMassimoRaggiunto,
  nomeAzienda,
  citta,
  categoria,
  firmaNome,
  onNomeAziendaChange,
  onCittaChange,
  onCategoriaChange,
  onFirmaNomeChange,
  onNavigate,
  canNavigate,
  onNext,
}: Props) {
  const canProceed = Boolean(nomeAzienda.trim() && categoria)

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.stepHeader}>
        <OnboardingStepper stepAttuale={2} stepMassimoRaggiunto={stepMassimoRaggiunto} onNavigate={onNavigate} canNavigate={canNavigate} />
      </View>
      <ScrollView contentContainerStyle={styles.stepContent}>
        <Text style={styles.stepTitle}>Chi sei?</Text>
        <Text style={styles.stepSub}>Questi dati appariranno nei tuoi preventivi PDF</Text>

        <Text style={styles.fieldLabel}>NOME O RAGIONE SOCIALE *</Text>
        <TextInput
          style={styles.fieldInput}
          value={nomeAzienda}
          onChangeText={onNomeAziendaChange}
          placeholder="es. Mario Rossi, Studio Rossi"
          placeholderTextColor="#9CA3AF"
          autoFocus
        />

        <Text style={styles.fieldLabel}>CITTÀ</Text>
        <TextInput
          style={styles.fieldInput}
          value={citta}
          onChangeText={onCittaChange}
          placeholder="es. Roma"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.fieldLabel}>CHE LAVORO FAI?</Text>
        <View style={styles.categorie}>
          {CATEGORIE.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.categoriaChip, categoria === c && styles.categoriaChipActive]}
              onPress={() => onCategoriaChange(c)}
            >
              <Text style={[styles.categoriaText, categoria === c && styles.categoriaTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>FIRMA (opzionale)</Text>
        <Text style={[styles.stepSub, { marginTop: -4, marginBottom: 8 }]}>Apparirà in corsivo in fondo ai tuoi preventivi PDF</Text>
        <TextInput
          style={styles.fieldInput}
          value={firmaNome}
          onChangeText={onFirmaNomeChange}
          placeholder="es. Mario Rossi"
          placeholderTextColor="#9CA3AF"
        />
        {firmaNome ? (
          <Text style={{ fontSize: 20, color: '#374151', fontStyle: 'italic', textAlign: 'center', paddingVertical: 8, fontFamily: 'Dancing Script' }}>
            {firmaNome}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
          onPress={onNext}
          disabled={!canProceed}
        >
          <Text style={styles.nextBtnText}>Avanti →</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
