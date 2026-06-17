import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import PreviewPaginata from '../PreviewPaginata'
import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from './onboardingStyles'
import { OnboardingStepper } from './OnboardingStepper'
import { onboardingStyles as styles } from './onboardingStyles'

type Props = {
  stepMassimoRaggiunto: number
  templateScelto: string
  htmlPreview: string
  caricandoPreview: boolean
  saving: boolean
  onTemplateChange: (id: string) => void
  onNavigate: (s: number) => void
  canNavigate: (s: number) => boolean
  onComplete: () => void
}

const TEMPLATES = [
  { id: 'pulito', nome: 'Pulito', emoji: '⬜' },
  { id: 'classico', nome: 'Classico', emoji: '📋' },
  { id: 'bold', nome: 'Bold', emoji: '🎨' },
  { id: 'minimal_dark', nome: 'Dark', emoji: '🌙' },
  { id: 'artigiano', nome: 'Artigiano', emoji: '🪵' },
]

export function OnboardingTemplateStep({
  stepMassimoRaggiunto,
  templateScelto,
  htmlPreview,
  caricandoPreview,
  saving,
  onTemplateChange,
  onNavigate,
  canNavigate,
  onComplete,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.stepHeader}>
        <OnboardingStepper stepAttuale={4} stepMassimoRaggiunto={stepMassimoRaggiunto} onNavigate={onNavigate} canNavigate={canNavigate} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16, backgroundColor: '#F7F8FA', flexGrow: 1 }}>
        <Text style={styles.stepTitle}>Scegli il tuo stile</Text>
        <Text style={styles.stepSub}>Il template che preferisci per i tuoi preventivi PDF</Text>
        <Text style={[styles.stepSub, { marginTop: -8 }]}>Questa è un'anteprima dimostrativa — potrai personalizzare servizi, prezzi, logo e note in qualsiasi momento dalle Impostazioni</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TEMPLATES.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.templateChip, templateScelto === t.id && styles.templateChipActive]}
              onPress={() => onTemplateChange(t.id)}
            >
              <Text style={styles.templateChipEmoji}>{t.emoji}</Text>
              <Text style={[styles.templateChipText, templateScelto === t.id && styles.templateChipTextActive]}>{t.nome}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.previewCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.stepSub}>Anteprima</Text>
            {caricandoPreview && <ActivityIndicator size="small" color="#0E9F8E" />}
          </View>
          <View style={styles.previewContainer}>
            {htmlPreview ? (
              <PreviewPaginata htmlContent={htmlPreview} width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} />
            ) : (
              <View style={{ height: PREVIEW_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0E9F8E" />
                <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 12 }}>Caricamento anteprima...</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, saving && styles.nextBtnDisabled]}
          onPress={onComplete}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.nextBtnText}>✓ Inizia a usare PreventivoAI</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}
