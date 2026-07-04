import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { MetodoPagamento } from '../../api/preventivoPdf'
import { AppIcon } from '../icons/AppIcon'
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.prevHeaderTitle}>Preventivo generato</Text>
            <AppIcon name="check-circle" size={15} color="#0B7A6D" />
          </View>
          <Text style={styles.prevHeaderSub}>Pronto da inviare al cliente</Text>
        </View>
        <View style={styles.prevBody}>
          <Text style={styles.prevText}>{preventivo}</Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.saveBtn, salvato && styles.saveBtnDone, { flexDirection: 'row', justifyContent: 'center', gap: 8 }]} onPress={onSalva} disabled={salvato}>
        {salvato && <AppIcon name="check" size={15} color="#fff" />}
        <Text style={styles.saveBtnText}>{salvato ? 'Salvato nello storico' : 'Salva nello storico'}</Text>
      </TouchableOpacity>
      <NuovoPagamentoCard metodoPagamento={metodoPagamento} onPress={onApriPagamento} />
      <TouchableOpacity style={[styles.pdfBtn, { flexDirection: 'row', justifyContent: 'center', gap: 8 }]} onPress={onGeneraPdf}>
        <AppIcon name="file-text" size={15} color="#fff" />
        <Text style={styles.pdfBtnText}>Genera PDF professionale</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}
