import { useEffect, useRef, useState } from 'react'
import { Alert, Modal, Pressable, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import * as Sharing from 'expo-sharing'
import { caricaContattiCliente } from '../../api/firma'
import { caricaSettingsData } from '../../api/settings'
import { trackEvento } from '../../utils/analytics'
import { buildMessaggioCondividiPdf } from 'preventivoai-shared'
import { caricaMessaggiCliente } from '../../messaggiCliente'
import { InviaFirmaModal } from '../firma/InviaFirmaModal'
import { CanaleCondivisioneButton } from '../firma/CanaleCondivisioneButton'

export type PdfSuccessInvio = {
  preventivoId?: string | null
  clienteId?: string
  nomeCliente?: string
  haStripe?: boolean
  uploadOnlineOk: boolean
}

type Props = {
  visible: boolean
  dettaglio?: string
  pdfUri?: string
  invio?: PdfSuccessInvio
  onClose: () => void
}

export function PreventivoPdfSuccessModal({ visible, dettaglio, pdfUri, invio, onClose }: Props) {
  const [mostraFirmaModal, setMostraFirmaModal] = useState(false)
  const [nomeAzienda, setNomeAzienda] = useState('')
  const [emailCliente, setEmailCliente] = useState<string | null | undefined>()
  const [telefonoCliente, setTelefonoCliente] = useState<string | null | undefined>()
  const [condivisionePdf, setCondivisionePdf] = useState(false)
  const condivisionePdfRef = useRef(false)

  useEffect(() => {
    if (!visible) {
      setMostraFirmaModal(false)
      return
    }
    void caricaSettingsData().then(d => {
      const nome = d?.form?.nome_azienda || ''
      setNomeAzienda(nome.split(' ')[0] || nome)
    })
  }, [visible])

  const haStripe = Boolean(invio?.haStripe)
  const uploadOk = Boolean(invio?.uploadOnlineOk)
  const haCliente = Boolean(invio?.clienteId && invio?.nomeCliente?.trim())
  const haPreventivo = Boolean(invio?.preventivoId)
  const puoInviareFirma = uploadOk && haCliente && haPreventivo

  let motivoBloccoFirma = ''
  if (!uploadOk) {
    motivoBloccoFirma =
      "L'upload del PDF online non è riuscito. Il link firma richiede il documento online: chiudi, poi clicca di nuovo «Genera PDF» per riprovare."
  } else if (!haCliente) {
    motivoBloccoFirma = 'Seleziona un cliente nel preventivo per inviare il link firma.'
  } else if (!haPreventivo) {
    motivoBloccoFirma = 'Preventivo non salvato correttamente. Rigenera il PDF e riprova.'
  }

  function handlePressFirma() {
    if (!puoInviareFirma) {
      Alert.alert('Link firma non disponibile', motivoBloccoFirma)
      return
    }
    void apriInvioFirma()
  }

  async function apriInvioFirma() {
    if (!invio?.clienteId || !invio.preventivoId || !invio.nomeCliente) return
    const contatti = await caricaContattiCliente(invio.clienteId)
    setEmailCliente(contatti?.email)
    setTelefonoCliente(contatti?.telefono)
    setMostraFirmaModal(true)
  }

  async function condividiPdf() {
    if (!pdfUri || condivisionePdfRef.current) return
    condivisionePdfRef.current = true
    setCondivisionePdf(true)
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Condivisione non disponibile', 'Non è possibile condividere il PDF da questo dispositivo.')
        return
      }
      const templates = await caricaMessaggiCliente()
      const nomeAziendaSettings = (await caricaSettingsData())?.form?.nome_azienda?.split(' ')[0]
        || nomeAzienda
        || 'Il tuo artigiano'
      const messaggio = buildMessaggioCondividiPdf(
        invio?.nomeCliente || 'Cliente',
        nomeAziendaSettings,
        templates,
      )
      try {
        await Share.share({ message: messaggio })
      } catch {
        // l'utente può annullare il foglio testo
      }
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Invia preventivo',
        UTI: 'com.adobe.pdf',
      })
      trackEvento('pdf_condiviso', 'preventivo-pdf')
    } finally {
      condivisionePdfRef.current = false
      setCondivisionePdf(false)
    }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Chiudi" />
          <View style={styles.box}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconCheck}>{'\u2713'}</Text>
            </View>

            <Text style={styles.title}>Preventivo generato!</Text>
            {dettaglio ? <Text style={styles.dettaglio}>{dettaglio}</Text> : null}

            {!uploadOk ? (
              <View style={styles.alertBox}>
                <Text style={styles.alertTitle}>Upload online non riuscito</Text>
                <Text style={styles.alertText}>
                  Il PDF è sul dispositivo, ma il link firma digitale non è disponibile finché il documento non
                  viene caricato online. Chiudi e clicca di nuovo «Genera PDF» per riprovare.
                </Text>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Come lo invii al cliente?</Text>

            <TouchableOpacity
              style={[styles.btnFirma, !puoInviareFirma && styles.btnDisabled]}
              activeOpacity={0.85}
              onPress={handlePressFirma}
            >
              <Text style={styles.btnFirmaTitle}>Invia link firma</Text>
              <Text style={styles.btnFirmaSub}>
                {`Un solo link: legge il preventivo e firma online${haStripe ? ' — pagamento Stripe incluso nella pagina' : ''}`}
              </Text>
            </TouchableOpacity>

            {!puoInviareFirma && motivoBloccoFirma ? (
              <Text style={styles.hintMuted}>{motivoBloccoFirma}</Text>
            ) : (
              <Text style={styles.hintFaint}>
                {`Non allegare il PDF nello stesso messaggio: il cliente lo vede dal link.${haStripe ? ' Il reminder firma reinvia lo stesso link — non serve un link Stripe separato.' : ''}`}
              </Text>
            )}

            {pdfUri ? (
              <>
                <CanaleCondivisioneButton
                  label="Condividi solo PDF"
                  loading={condivisionePdf}
                  disabled={condivisionePdf}
                  onPress={() => void condividiPdf()}
                  style={styles.btnPdf}
                />
                <Text style={styles.btnPdfSub}>
                  {`Allegato PDF classico.${haStripe ? ' Il link Stripe è già in fondo al documento.' : ''}`}
                </Text>
              </>
            ) : null}

            <TouchableOpacity style={styles.btnChiudi} activeOpacity={0.85} onPress={onClose}>
              <Text style={styles.btnChiudiText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {mostraFirmaModal && invio?.preventivoId && invio.nomeCliente ? (
        <InviaFirmaModal
          visible
          preventivoId={invio.preventivoId}
          nomeCliente={invio.nomeCliente}
          emailCliente={emailCliente}
          telefonoCliente={telefonoCliente}
          nomeAzienda={nomeAzienda}
          haStripe={haStripe}
          onClose={() => setMostraFirmaModal(false)}
          onInviato={onClose}
        />
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,27,42,0.5)',
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
  },
  iconCircle: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(14,159,142,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCheck: { fontSize: 28, color: '#0E9F8E', fontWeight: '700' },
  title: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: '#0D1B2A',
    textAlign: 'center',
  },
  dettaglio: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  alertBox: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    padding: 12,
  },
  alertTitle: { fontSize: 13, fontWeight: '600', color: '#991B1B' },
  alertText: { marginTop: 4, fontSize: 12, color: '#991B1B', lineHeight: 17 },
  sectionTitle: { marginTop: 18, fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  btnFirma: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#0E9F8E',
    padding: 14,
  },
  btnDisabled: { opacity: 0.55 },
  btnFirmaTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  btnFirmaSub: { marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 16 },
  hintMuted: { marginTop: 6, paddingHorizontal: 2, fontSize: 11, color: '#6B7280', lineHeight: 15 },
  hintFaint: { marginTop: 6, paddingHorizontal: 2, fontSize: 11, color: '#9CA3AF', lineHeight: 15 },
  btnPdf: {
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
  },
  btnPdfSub: { marginTop: 4, paddingHorizontal: 2, fontSize: 12, color: '#6B7280', lineHeight: 16 },
  btnChiudi: { marginTop: 16, paddingVertical: 10, alignItems: 'center' },
  btnChiudiText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
})
