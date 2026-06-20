import { Alert, Image, Linking, Modal, Text, TouchableOpacity, View } from 'react-native'
import { useEffect, useRef, useState } from 'react'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import type { Preventivo } from '../../types'
import type { PreventivoInvio } from '../../api/firma'
import {
  annullaFirmaOnline,
  apriEmailFirma,
  apriWhatsAppFirma,
  caricaContattiCliente,
  caricaMessaggiCliente,
  copiaLinkFirma,
  buildMessaggioFirmaInvio,
  buildOggettoFirmaInvio,
  isFirmaManuale,
  isFirmaOnline,
  ottieniUrlFirma,
  ottieniUrlInvioFirma,
  registraFirmaManuale,
  statoFirmaInvio,
} from '../../api/firma'
import { CanaleCondivisioneButton } from './CanaleCondivisioneButton'

type Props = {
  visible: boolean
  preventivo: Preventivo
  invio?: PreventivoInvio
  nomeAzienda?: string
  onClose: () => void
  onInviaNuovo?: () => void
  onAggiornato?: () => void
  onFirmaAnnullata?: () => void
}

async function uriToBase64(uri: string, mimeType: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as FileSystem.EncodingType })
  return `data:${mimeType};base64,${base64}`
}

export function FirmaDettaglioModal({
  visible,
  preventivo,
  invio,
  nomeAzienda,
  onClose,
  onInviaNuovo,
  onAggiornato,
  onFirmaAnnullata,
}: Props) {
  const sf = statoFirmaInvio(invio)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [telefono, setTelefono] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [urlDocumentiFirma, setUrlDocumentiFirma] = useState<{
    pdf: string | null
    img: string | null
    loading: boolean
  }>({ pdf: null, img: null, loading: false })
  const condivisioneInFlightRef = useRef(false)
  const nomeCliente = preventivo.nome_cliente || 'Cliente'

  useEffect(() => {
    if (!visible) return
    setFeedback('')
    if (!preventivo.cliente_id) return
    void caricaContattiCliente(preventivo.cliente_id).then(c => {
      if (c) {
        setTelefono(c.telefono)
        setEmail(c.email)
      }
    })
  }, [visible, preventivo.cliente_id])

  useEffect(() => {
    if (!visible || sf !== 'firmato' || !invio) {
      setUrlDocumentiFirma({ pdf: null, img: null, loading: false })
      return
    }

    let cancelled = false
    setUrlDocumentiFirma({ pdf: null, img: null, loading: true })

    void ottieniUrlInvioFirma(preventivo.id)
      .then(res => {
        if (cancelled) return
        setUrlDocumentiFirma({
          pdf: res.pdf_firmato_url,
          img: res.firma_immagine_url,
          loading: false,
        })
      })
      .catch(() => {
        if (!cancelled) {
          setUrlDocumentiFirma({ pdf: null, img: null, loading: false })
        }
      })

    return () => { cancelled = true }
  }, [visible, sf, invio?.id, preventivo.id])

  async function condividi(tipo: 'whatsapp' | 'email' | 'link') {
    if (condivisioneInFlightRef.current || loading) return
    condivisioneInFlightRef.current = true
    setFeedback('')
    setLoading(tipo)
    try {
      const url = await ottieniUrlFirma(preventivo.id, invio)
      const templates = await caricaMessaggiCliente()
      const testo = buildMessaggioFirmaInvio(nomeCliente, url, nomeAzienda, { templates })
      if (tipo === 'whatsapp') {
        await apriWhatsAppFirma(telefono, testo)
        setFeedback('WhatsApp aperto.')
      } else if (tipo === 'email') {
        await apriEmailFirma(email, testo, buildOggettoFirmaInvio(nomeCliente, templates))
        setFeedback(email ? 'Email aperta.' : 'Scegli il destinatario nell\'app email.')
      } else {
        await copiaLinkFirma(url)
        setFeedback('Link condiviso.')
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Errore')
    } finally {
      condivisioneInFlightRef.current = false
      setLoading(null)
    }
  }

  async function segnaFirmatoManuale(documento?: { base64: string; mimeType: string }) {
    setFeedback('')
    setLoading(documento ? 'upload' : 'manuale')
    try {
      await registraFirmaManuale(preventivo.id, documento)
      setFeedback(
        documento
          ? 'Documento caricato. Preventivo segnato come firmato.'
          : 'Preventivo segnato come firmato a mano.',
      )
      onAggiornato?.()
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Errore')
    } finally {
      setLoading(null)
    }
  }

  function chiediAnnullaFirma() {
    Alert.alert(
      'Firma non valida',
      'Annullare questa firma? Il cliente dovrà firmare di nuovo.',
      [
        { text: 'Indietro', style: 'cancel' },
        { text: 'Annulla firma', style: 'destructive', onPress: () => void eseguiAnnullaFirma() },
      ],
    )
  }

  async function eseguiAnnullaFirma() {
    setFeedback('')
    setLoading('annulla')
    try {
      const res = await annullaFirmaOnline(preventivo.id)
      setFeedback(
        res.link_attivo
          ? 'Firma annullata. Puoi inviare di nuovo lo stesso link.'
          : 'Firma annullata. Il link è scaduto: inviane uno nuovo.',
      )
      onFirmaAnnullata?.()
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Errore')
    } finally {
      setLoading(null)
    }
  }

  async function caricaDocumentoFirmato() {
    Alert.alert('Carica documento firmato', 'Scegli foto o PDF del preventivo firmato a mano', [
      {
        text: 'Galleria foto',
        onPress: () => {
          void (async () => {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (!perm.granted) {
              setFeedback('Permesso galleria negato.')
              return
            }
            const picked = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.85,
              base64: true,
            })
            if (picked.canceled || !picked.assets[0]) return
            const asset = picked.assets[0]
            const mimeType = asset.mimeType || 'image/jpeg'
            const base64 = asset.base64
              ? `data:${mimeType};base64,${asset.base64}`
              : await uriToBase64(asset.uri, mimeType)
            await segnaFirmatoManuale({ base64, mimeType })
          })()
        },
      },
      {
        text: 'File (PDF o foto)',
        onPress: () => {
          void (async () => {
            const picked = await DocumentPicker.getDocumentAsync({
              type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
              copyToCacheDirectory: true,
            })
            if (picked.canceled || !picked.assets[0]) return
            const asset = picked.assets[0]
            const mimeType = asset.mimeType || 'application/pdf'
            const base64 = await uriToBase64(asset.uri, mimeType)
            await segnaFirmatoManuale({ base64, mimeType })
          })()
        },
      },
      { text: 'Annulla', style: 'cancel' },
    ])
  }

  const titolo =
    sf === 'firmato' ? 'Preventivo firmato'
      : sf === 'attesa' ? 'Condividi link firma'
        : 'Firma digitale'

  const firmatoManuale = sf === 'firmato' && isFirmaManuale(invio)
  const firmatoOnline = sf === 'firmato' && isFirmaOnline(invio)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0D1B2A' }}>{titolo}</Text>
          <Text style={{ marginTop: 6, color: '#6B7280', fontSize: 14 }}>Cliente: {nomeCliente}</Text>

          {sf === 'firmato' && invio ? (
            <View style={{ marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0', backgroundColor: '#ECFDF5', padding: 12 }}>
              <Text style={{ fontWeight: '700', color: '#065F46' }}>
                {firmatoManuale ? 'Firmato a mano' : 'Firmato online'} il {new Date(invio.firmato_at!).toLocaleDateString('it-IT')}
              </Text>
              {urlDocumentiFirma.loading ? (
                <Text style={{ marginTop: 8, fontSize: 13, color: '#047857' }}>Caricamento documenti…</Text>
              ) : null}
              {urlDocumentiFirma.img ? (
                <Image
                  source={{ uri: urlDocumentiFirma.img }}
                  style={{ marginTop: 8, height: 120, width: '100%', borderRadius: 8 }}
                  resizeMode="contain"
                />
              ) : null}
              {urlDocumentiFirma.pdf ? (
                <TouchableOpacity onPress={() => void Linking.openURL(urlDocumentiFirma.pdf!)} style={{ marginTop: 8 }}>
                  <Text style={{ color: '#0E9F8E', fontWeight: '600' }}>Apri PDF firmato</Text>
                </TouchableOpacity>
              ) : null}
              {!urlDocumentiFirma.loading && !urlDocumentiFirma.pdf && !urlDocumentiFirma.img && (invio.pdf_firmato_url || invio.firma_immagine_url) ? (
                <Text style={{ marginTop: 8, fontSize: 13, color: '#047857' }}>Documenti non disponibili al momento.</Text>
              ) : null}
              {firmatoOnline ? (
                <TouchableOpacity
                  disabled={!!loading}
                  onPress={chiediAnnullaFirma}
                  style={{ marginTop: 12, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FFF', borderRadius: 12, padding: 12, alignItems: 'center' }}
                >
                  <Text style={{ fontWeight: '700', color: '#B91C1C' }}>
                    {loading === 'annulla' ? '...' : 'Firma non valida — richiedi nuova firma'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {sf === 'attesa' && invio ? (
            <>
              <Text style={{ marginTop: 12, fontSize: 13, color: '#92400E' }}>
                In attesa firma · valido fino al {new Date(invio.scade_at).toLocaleDateString('it-IT')}
              </Text>
              {(['whatsapp', 'email', 'link'] as const).map(c => (
                <CanaleCondivisioneButton
                  key={c}
                  label={c === 'whatsapp' ? 'WhatsApp' : c === 'email' ? 'Email' : 'Copia link'}
                  loading={loading === c}
                  disabled={loading !== null && loading !== c}
                  onPress={() => void condividi(c)}
                />
              ))}
            </>
          ) : null}

          {(sf === 'scaduto' || sf === 'revocato') && onInviaNuovo ? (
            <TouchableOpacity
              onPress={() => { onClose(); onInviaNuovo() }}
              style={{ marginTop: 16, backgroundColor: '#0E9F8E', borderRadius: 12, padding: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Invia nuovo link</Text>
            </TouchableOpacity>
          ) : null}

          {sf !== 'firmato' ? (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
              <Text style={{ fontWeight: '700', color: '#0D1B2A', fontSize: 14 }}>Firma su carta</Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: '#6B7280' }}>
                Se il cliente ha firmato a mano, segnalo qui o carica foto/PDF del documento firmato.
              </Text>
              <TouchableOpacity
                disabled={!!loading}
                onPress={() => void segnaFirmatoManuale()}
                style={{ marginTop: 10, borderWidth: 1, borderColor: '#99F6E4', backgroundColor: '#F0FDFA', borderRadius: 12, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ fontWeight: '700', color: '#0E9F8E' }}>
                  {loading === 'manuale' ? '...' : 'Segna firmato a mano'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!!loading}
                onPress={() => void caricaDocumentoFirmato()}
                style={{ marginTop: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ fontWeight: '600', color: '#0D1B2A' }}>
                  {loading === 'upload' ? 'Caricamento...' : 'Carica foto/pdf firmato a mano'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {feedback ? <Text style={{ marginTop: 10, color: '#0E9F8E', fontSize: 13 }}>{feedback}</Text> : null}

          <TouchableOpacity onPress={onClose} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: '#6B7280' }}>Chiudi</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}
