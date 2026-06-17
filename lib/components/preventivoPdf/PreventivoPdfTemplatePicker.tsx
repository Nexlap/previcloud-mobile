import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { TEMPLATES } from '../../constants'

type Props = {
  template: string
  onSelectTemplate: (templateId: string) => void
}

export function PreventivoPdfTemplatePicker({ template, onSelectTemplate }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Scegli template</Text>
      <Text style={styles.cardSub}>L'anteprima si aggiorna in tempo reale</Text>
      <View style={styles.templateGrid}>
        {TEMPLATES.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.templateCard, template === t.id && styles.templateCardActive]}
            onPress={() => onSelectTemplate(t.id)}
          >
            <Text style={styles.templateEmoji}>{t.emoji}</Text>
            <Text style={[styles.templateNome, template === t.id && styles.templateNomeActive]}>{t.nome}</Text>
            <Text style={styles.templateDesc}>{t.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  templateCard: { width: '30%', backgroundColor: '#F7F8FA', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB' },
  templateCardActive: { backgroundColor: '#E1F5EE', borderColor: '#0E9F8E' },
  templateEmoji: { fontSize: 24, marginBottom: 4 },
  templateNome: { fontSize: 12, fontWeight: '600', color: '#0D1B2A', textAlign: 'center' },
  templateNomeActive: { color: '#0E9F8E' },
  templateDesc: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 2 },
})
