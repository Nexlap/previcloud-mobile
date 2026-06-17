import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { MetodoPagamento } from '../../api/preventivoPdf'
import { NuovoPagamentoCard } from './NuovoPagamentoCard'
import { nuovoStyles as styles } from './nuovoStyles'

type Props = {
  preventivo: string
  salvato: boolean
  metodoPagamento: MetodoPagamento | null
  onSalva: () => void
  onApriPagamento: () => void
  onGeneraPdf: () => void
}

export function NuovoPreventivoView({
  preventivo,
  salvato,
  metodoPagamento,
  onSalva,
  onApriPagamento,
  onGeneraPdf,
}: Props) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.prevCard}>
        <View style={styles.prevHeader}>
          <Text style={styles.prevHeaderTitle}>Preventivo generato ✓</Text>
          <Text style={styles.prevHeaderSub}>Pronto da inviare al cliente</Text>
        </View>
        <View style={styles.prevBody}>
          <Text style={styles.prevText}>{preventivo}</Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.saveBtn, salvato && styles.saveBtnDone]} onPress={onSalva} disabled={salvato}>
        <Text style={styles.saveBtnText}>{salvato ? '✓ Salvato nello storico' : 'Salva nello storico'}</Text>
      </TouchableOpacity>
      <NuovoPagamentoCard metodoPagamento={metodoPagamento} onPress={onApriPagamento} />
      <TouchableOpacity style={styles.pdfBtn} onPress={onGeneraPdf}>
        <Text style={styles.pdfBtnText}>📄 Genera PDF professionale</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}
