import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { LISTINO_TABS } from '../../features/listino/constants'
import { AppIcon } from '../icons/AppIcon'
import { listinoStyles as styles } from './listinoStyles'

type ListinoTab = 'testo' | 'foto' | 'vocale'

type Props = {
  visible: boolean
  listinoTab: ListinoTab
  testoListino: string
  elaborandoListino: boolean
  registrando: boolean
  onClose: () => void
  onChangeTab: (tab: ListinoTab) => void
  onChangeTesto: (testo: string) => void
  onElaboraTesto: () => void
  onFotoGalleria: () => void
  onFotoCamera: () => void
  onToggleRegistrazione: () => void
  testoPlaceholder?: string
  fotoHint?: string | null
  vocaleHint?: string
  vocaleStatusElaborando?: string
  vocaleStatusRegistrando?: string
  vocaleStatusIdle?: string
}

export function ListinoSmartModal({
  visible,
  listinoTab,
  testoListino,
  elaborandoListino,
  registrando,
  onClose,
  onChangeTab,
  onChangeTesto,
  onElaboraTesto,
  onFotoGalleria,
  onFotoCamera,
  onToggleRegistrazione,
  testoPlaceholder = 'es. Editing video: 300, Riprese mezza giornata: 400',
  fotoHint = null,
  vocaleHint = 'Descrivi i tuoi servizi a voce — Claude trascrive e struttura tutto.',
  vocaleStatusElaborando = 'Elaborazione...',
  vocaleStatusRegistrando = 'Tocca per fermare',
  vocaleStatusIdle = 'Tocca per registrare',
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>{'\u2715'}</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Listino smart</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>
              Testo, foto o vocale — Claude struttura tutto e aggiunge i servizi al tuo listino.
            </Text>
          </View>

          <View style={styles.listinoTabRow}>
            {LISTINO_TABS.map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.listinoTabBtn, listinoTab === key && styles.listinoTabBtnActive]}
                onPress={() => onChangeTab(key)}
              >
                <Text style={[styles.listinoTabText, listinoTab === key && styles.listinoTabTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {listinoTab === 'testo' && (
            <View style={{ gap: 8 }}>
              <TextInput
                style={[styles.fieldInput, { height: 200, textAlignVertical: 'top' }]}
                value={testoListino}
                onChangeText={onChangeTesto}
                placeholder={testoPlaceholder}
                placeholderTextColor="#9CA3AF"
                multiline
                autoFocus
              />
              <TouchableOpacity
                style={[styles.saveBtn, (!testoListino.trim() || elaborandoListino) && styles.saveBtnDisabled]}
                onPress={onElaboraTesto}
                disabled={!testoListino.trim() || elaborandoListino}
              >
                {elaborandoListino
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Struttura con AI e aggiungi</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {listinoTab === 'foto' && (
            <View style={{ gap: 12 }}>
              {fotoHint ? <Text style={styles.fotoHint}>{fotoHint}</Text> : null}
              <TouchableOpacity style={styles.fotoUploadArea} onPress={onFotoGalleria}>
                {elaborandoListino
                  ? <ActivityIndicator color="#0E9F8E" />
                  : <>
                      <AppIcon name="image" size={32} color="#0E9F8E" />
                      <Text style={styles.fotoUploadTitle}>Scegli dalla galleria</Text>
                      {fotoHint ? <Text style={styles.fotoUploadSub}>JPG, PNG — anche scritto a mano</Text> : null}
                    </>
                }
              </TouchableOpacity>
              <TouchableOpacity style={styles.fotoCameraArea} disabled={elaborandoListino} onPress={onFotoCamera}>
                <AppIcon name="camera" size={32} color="#0E9F8E" />
                <Text style={styles.fotoUploadTitle}>Scatta una foto</Text>
              </TouchableOpacity>
            </View>
          )}

          {listinoTab === 'vocale' && (
            <View style={{ gap: 12, alignItems: 'center' }}>
              <Text style={styles.vocaleHint}>{vocaleHint}</Text>
              <TouchableOpacity
                style={[styles.vocaleBtn, { backgroundColor: registrando ? '#EF4444' : '#0D1B2A' }]}
                onPress={onToggleRegistrazione}
              >
                {elaborandoListino
                  ? <ActivityIndicator color="#fff" size="large" />
                  : <AppIcon name={registrando ? 'square' : 'mic'} size={28} color="#fff" />
                }
              </TouchableOpacity>
              <Text style={[styles.vocaleStatus, { color: registrando ? '#EF4444' : '#9CA3AF' }]}>
                {elaborandoListino ? vocaleStatusElaborando : registrando ? vocaleStatusRegistrando : vocaleStatusIdle}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.modalCancelLink} onPress={onClose}>
            <Text style={styles.modalCancelText}>Annulla</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )
}
