import { Audio } from 'expo-av'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform,
  Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { elaboraServiziDaTesto } from '../lib/api/listinoSmart'
import { avviaRegistrazioneListinoSmart, fermaRegistrazioneServiziSmart, scattaFotoServiziSmart, scegliFotoServiziSmart } from '../lib/features/listino/media'
import { ServizioForm } from '../lib/types'
import PreviewPaginata from '../lib/components/PreviewPaginata'
import { completaOnboarding, generaPreviewOnboarding, tokenOnboarding } from '../lib/api/onboarding'
import { errorMessage } from '../lib/utils/errors'


const CATEGORIE = ['videomaker', 'fotografo', 'catering', 'falegname', 'estetista', 'elettricista', 'idraulico', 'imbianchino', 'consulente', 'altro']
const UNITA = ['cad', 'ora', 'giorno', 'mq', 'set', 'progetto']
const A4_RATIO = 297 / 210
const PREVIEW_WIDTH = Dimensions.get('window').width - 24 * 2 - 14 * 2 - 2
const PREVIEW_HEIGHT = PREVIEW_WIDTH * A4_RATIO

function Stepper({
  stepAttuale,
  stepMassimoRaggiunto,
  onNavigate,
  canNavigate,
}: {
  stepAttuale: number
  stepMassimoRaggiunto: number
  onNavigate: (s: number) => void
  canNavigate: (s: number) => boolean
}) {
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

// Esempi listino per categoria
const ESEMPI_LISTINO: Record<string, string> = {
  videomaker: 'Riprese mezza giornata: 400€\nMontaggio video: 300€\nColor grading: 150€\nReel social: 200€',
  fotografo: 'Servizio foto evento: 500€\nRitocco foto (set 10): 150€\nBook professionale: 400€\nFoto prodotto: 80€/cad',
  catering: 'Menu pranzo (a persona): 35€\nMenu cena (a persona): 50€\nAperitivo: 20€/persona\nAllestimento tavoli: 200€',
  falegname: 'Montaggio mobile: 150€\nRiparazione porta: 80€\nPosa parquet (mq): 25€\nProgetto su misura: 500€',
  estetista: 'Piega e colore: 80€\nTaglio capelli: 35€\nManicure: 30€\nTrattamento viso: 60€',
  elettricista: 'Installazione presa: 80€\nCertificazione impianto: 200€\nIntervento urgente: 120€\nQuadro elettrico: 350€',
  idraulico: 'Riparazione perdita: 100€\nSostituzione rubinetto: 80€\nInstallazione caldaia: 500€\nIntervento urgente: 150€',
  imbianchino: 'Tinteggiatura stanza (mq): 8€\nPreparazione pareti: 5€/mq\nSmaltimento vernice: 50€\nPosa carta da parati: 15€/mq',
  consulente: 'Consulenza oraria: 80€\nProgetto strategico: 1500€\nFormazione (mezza giornata): 400€\nReport analitico: 600€',
  altro: 'Servizio base: 100€\nServizio premium: 200€\nConsulenza: 80€/ora\nProgetto completo: 500€',
}

type VoceDemo = { nome: string; dettagli: [string, string]; prezzo: number }
type DemoPreventivo = {
  servizi: VoceDemo[]
  rimborsi: { nome: string; dettaglio: string; tipo: string; importo: number }[]
  note: string
}

const DEMO_PREVENTIVO: Record<string, DemoPreventivo> = {
  videomaker: {
    servizi: [
      { nome: 'Brief creativo e pianificazione', dettagli: ['Analisi obiettivi del video e target', 'Scaletta riprese e piano di produzione'], prezzo: 180 },
      { nome: 'Riprese video mezza giornata', dettagli: ['Operatore con camera 4K e stabilizzatore', 'Audio ambiente e riprese di copertura'], prezzo: 450 },
      { nome: 'Riprese drone autorizzate', dettagli: ['Sequenze panoramiche esterne', 'Controllo sicurezza e check area'], prezzo: 220 },
      { nome: 'Montaggio video principale', dettagli: ['Editing narrativo fino a 2 minuti', 'Musica royalty free e sincronizzazione audio'], prezzo: 520 },
      { nome: 'Color correction e finalizzazione', dettagli: ['Bilanciamento colore e contrasto', 'Export in formato web e social'], prezzo: 180 },
      { nome: 'Clip social verticale', dettagli: ['Adattamento 9:16 da materiale principale', 'Sottotitoli e grafiche essenziali'], prezzo: 160 },
    ],
    rimborsi: [
      { nome: 'Trasferta km', dettaglio: '40 km x 0.35 = €14.00', tipo: 'Esente', importo: 14 },
      { nome: 'Musica stock', dettaglio: 'Licenza brano commerciale = €29.00', tipo: 'Imponibile', importo: 29 },
    ],
    note: 'Acconto del 30% richiesto alla firma del preventivo',
  },
  fotografo: {
    servizi: [
      { nome: 'Sopralluogo e moodboard', dettagli: ['Definizione stile fotografico', 'Lista scatti e organizzazione sessione'], prezzo: 120 },
      { nome: 'Servizio fotografico evento', dettagli: ['Copertura fino a 4 ore', 'Scatti spontanei e momenti principali'], prezzo: 520 },
      { nome: 'Ritratti professionali', dettagli: ['Set luci portatile incluso', 'Direzione posa per 5 persone'], prezzo: 260 },
      { nome: 'Post-produzione foto', dettagli: ['Selezione e correzione colore', 'Ritocco leggero su 40 immagini'], prezzo: 240 },
      { nome: 'Galleria online privata', dettagli: ['Consegna digitale in alta risoluzione', 'Download protetto per il cliente'], prezzo: 90 },
    ],
    rimborsi: [
      { nome: 'Trasferta urbana', dettaglio: '25 km x 0.30 = €7.50', tipo: 'Esente', importo: 7.5 },
      { nome: 'Noleggio fondale', dettaglio: 'Fondale neutro per shooting = €35.00', tipo: 'Imponibile', importo: 35 },
    ],
    note: 'Consegna provini entro 5 giorni lavorativi dalla data del servizio',
  },
  catering: {
    servizi: [
      { nome: 'Progettazione menu evento', dettagli: ['Menu stagionale personalizzato', 'Gestione allergeni e preferenze alimentari'], prezzo: 180 },
      { nome: 'Aperitivo di benvenuto', dettagli: ['Finger food caldo e freddo', 'Servizio per 30 ospiti'], prezzo: 540 },
      { nome: 'Primo e secondo serviti', dettagli: ['Preparazione e servizio al tavolo', 'Materie prime selezionate'], prezzo: 960 },
      { nome: 'Dessert e piccola pasticceria', dettagli: ['Selezione dolci monoporzione', 'Allestimento tavolo dessert'], prezzo: 280 },
      { nome: 'Personale di sala', dettagli: ['Due camerieri per 5 ore', 'Coordinamento servizio e riordino'], prezzo: 420 },
      { nome: 'Allestimento buffet', dettagli: ['Tavoli, tovagliato e mise en place', 'Materiale di servizio incluso'], prezzo: 260 },
    ],
    rimborsi: [
      { nome: 'Trasporto attrezzature', dettaglio: 'Consegna e ritiro attrezzature = €65.00', tipo: 'Imponibile', importo: 65 },
      { nome: 'Trasferta staff', dettaglio: '35 km x 0.30 = €10.50', tipo: 'Esente', importo: 10.5 },
    ],
    note: 'Numero ospiti definitivo da confermare almeno 7 giorni prima',
  },
  falegname: {
    servizi: [
      { nome: 'Sopralluogo e rilievo misure', dettagli: ['Verifica pareti, quote e ingombri', 'Consulenza materiali e finiture'], prezzo: 90 },
      { nome: 'Progettazione mobile su misura', dettagli: ['Disegno tecnico e distinta materiali', 'Una revisione inclusa'], prezzo: 280 },
      { nome: 'Realizzazione struttura in legno', dettagli: ['Taglio e assemblaggio in laboratorio', 'Ferramenta professionale inclusa'], prezzo: 1250 },
      { nome: 'Finitura e verniciatura', dettagli: ['Preparazione superfici e levigatura', 'Finitura opaca resistente all uso'], prezzo: 420 },
      { nome: 'Trasporto e montaggio', dettagli: ['Consegna presso abitazione cliente', 'Installazione e regolazioni finali'], prezzo: 360 },
    ],
    rimborsi: [
      { nome: 'Trasferta laboratorio', dettaglio: '45 km x 0.35 = €15.75', tipo: 'Esente', importo: 15.75 },
      { nome: 'Materiali di consumo', dettaglio: 'Viti, tasselli e colle professionali = €38.00', tipo: 'Imponibile', importo: 38 },
    ],
    note: 'Tempi di realizzazione stimati in 20 giorni lavorativi',
  },
  estetista: {
    servizi: [
      { nome: 'Consulenza trattamento personalizzata', dettagli: ['Analisi esigenze e tipologia pelle', 'Piano trattamento consigliato'], prezzo: 45 },
      { nome: 'Trattamento viso completo', dettagli: ['Detersione, scrub e maschera specifica', 'Massaggio finale idratante'], prezzo: 85 },
      { nome: 'Manicure professionale', dettagli: ['Preparazione unghie e cuticole', 'Applicazione smalto semipermanente'], prezzo: 42 },
      { nome: 'Pedicure estetico', dettagli: ['Trattamento piedi e idratazione', 'Applicazione colore a scelta'], prezzo: 48 },
      { nome: 'Pacchetto ceretta', dettagli: ['Gambe complete e braccia', 'Prodotti lenitivi post trattamento'], prezzo: 70 },
      { nome: 'Make-up evento', dettagli: ['Base lunga durata e prova colore', 'Ritocco finale incluso'], prezzo: 95 },
    ],
    rimborsi: [
      { nome: 'Trasferta a domicilio', dettaglio: '20 km x 0.30 = €6.00', tipo: 'Esente', importo: 6 },
      { nome: 'Kit monouso', dettaglio: 'Materiale igienico dedicato = €12.00', tipo: 'Imponibile', importo: 12 },
    ],
    note: 'Disdetta gratuita fino a 24 ore prima dell appuntamento',
  },
  elettricista: {
    servizi: [
      { nome: 'Sopralluogo e preventivo tecnico', dettagli: ['Verifica quadro elettrico e linee esistenti', 'Valutazione carichi e criticita impianto'], prezzo: 80 },
      { nome: 'Installazione quadro elettrico', dettagli: ['Montaggio centralino con protezioni dedicate', 'Cablaggio ordinato e identificazione circuiti'], prezzo: 520 },
      { nome: 'Certificazione impianto', dettagli: ['Verifiche strumentali di sicurezza', 'Rilascio dichiarazione di conformita'], prezzo: 240 },
      { nome: 'Sostituzione prese e interruttori', dettagli: ['Fornitura placche e frutti standard', 'Controllo serraggi e continuita linee'], prezzo: 180 },
      { nome: 'Installazione punto luce LED', dettagli: ['Predisposizione collegamenti e fissaggio corpo luce', 'Test accensione e assorbimento'], prezzo: 150 },
      { nome: 'Intervento urgente', dettagli: ['Ricerca guasto su linea non funzionante', 'Ripristino provvisorio in sicurezza'], prezzo: 210 },
    ],
    rimborsi: [
      { nome: 'Trasferta km', dettaglio: '30 km x 0.25 = €7.50', tipo: 'Esente', importo: 7.5 },
      { nome: 'Materiale elettrico di consumo', dettaglio: 'Morsetti, canaline e minuteria = €35.00', tipo: 'Imponibile', importo: 35 },
    ],
    note: 'Acconto del 30% richiesto alla firma del preventivo',
  },
  idraulico: {
    servizi: [
      { nome: 'Sopralluogo impianto idraulico', dettagli: ['Controllo perdite e pressione acqua', 'Valutazione accessibilita tubazioni'], prezzo: 75 },
      { nome: 'Riparazione perdita', dettagli: ['Individuazione punto critico', 'Sostituzione raccordo o guarnizione'], prezzo: 160 },
      { nome: 'Sostituzione miscelatore', dettagli: ['Rimozione rubinetteria esistente', 'Installazione nuovo miscelatore'], prezzo: 130 },
      { nome: 'Installazione sanitari', dettagli: ['Posizionamento e collegamento scarichi', 'Test tenuta e funzionamento'], prezzo: 360 },
      { nome: 'Manutenzione caldaia ordinaria', dettagli: ['Pulizia componenti principali', 'Controllo sicurezza e rendimento'], prezzo: 140 },
      { nome: 'Intervento urgente fuori orario', dettagli: ['Uscita rapida per guasto improvviso', 'Messa in sicurezza impianto'], prezzo: 220 },
    ],
    rimborsi: [
      { nome: 'Trasferta km', dettaglio: '28 km x 0.30 = €8.40', tipo: 'Esente', importo: 8.4 },
      { nome: 'Materiali idraulici', dettaglio: 'Raccordi, teflon e guarnizioni = €24.00', tipo: 'Imponibile', importo: 24 },
    ],
    note: 'Eventuali ricambi speciali saranno confermati prima dell acquisto',
  },
  imbianchino: {
    servizi: [
      { nome: 'Sopralluogo e protezione ambienti', dettagli: ['Valutazione superfici e stato pareti', 'Copertura pavimenti e arredi'], prezzo: 90 },
      { nome: 'Preparazione pareti', dettagli: ['Stuccatura piccole crepe e fori', 'Carteggiatura e pulizia supporti'], prezzo: 240 },
      { nome: 'Tinteggiatura pareti interne', dettagli: ['Due mani di pittura lavabile', 'Finitura uniforme su 60 mq'], prezzo: 680 },
      { nome: 'Trattamento antimuffa', dettagli: ['Applicazione primer specifico', 'Pittura traspirante nelle zone critiche'], prezzo: 190 },
      { nome: 'Smalto porte e battiscopa', dettagli: ['Preparazione superfici in legno', 'Applicazione smalto satinato'], prezzo: 260 },
    ],
    rimborsi: [
      { nome: 'Trasporto materiali', dettaglio: 'Consegna pitture e attrezzature = €30.00', tipo: 'Imponibile', importo: 30 },
      { nome: 'Smaltimento residui', dettaglio: 'Gestione materiali di risulta = €18.00', tipo: 'Esente', importo: 18 },
    ],
    note: 'Il preventivo include pittura bianca standard lavabile',
  },
  consulente: {
    servizi: [
      { nome: 'Analisi iniziale del progetto', dettagli: ['Raccolta obiettivi e vincoli operativi', 'Mappatura stakeholder e priorita'], prezzo: 280 },
      { nome: 'Audit processi aziendali', dettagli: ['Interviste operative e revisione documenti', 'Identificazione inefficienze principali'], prezzo: 720 },
      { nome: 'Piano strategico operativo', dettagli: ['Roadmap a 90 giorni con milestone', 'Indicatori KPI e responsabilita'], prezzo: 950 },
      { nome: 'Workshop con il team', dettagli: ['Sessione formativa di mezza giornata', 'Materiali e template operativi inclusi'], prezzo: 480 },
      { nome: 'Report finale e raccomandazioni', dettagli: ['Documento di sintesi professionale', 'Call di presentazione risultati'], prezzo: 360 },
      { nome: 'Follow-up mensile', dettagli: ['Verifica avanzamento azioni', 'Aggiornamento piano di lavoro'], prezzo: 220 },
    ],
    rimborsi: [
      { nome: 'Trasferta consulente', dettaglio: '60 km x 0.35 = €21.00', tipo: 'Esente', importo: 21 },
      { nome: 'Materiali workshop', dettaglio: 'Template e dispense stampate = €32.00', tipo: 'Imponibile', importo: 32 },
    ],
    note: 'La proposta include una revisione del piano strategico entro 15 giorni',
  },
  altro: {
    servizi: [
      { nome: 'Consulenza iniziale', dettagli: ['Analisi richiesta e obiettivi del cliente', 'Definizione ambito di intervento'], prezzo: 90 },
      { nome: 'Servizio operativo base', dettagli: ['Esecuzione attivita principale', 'Controllo qualita intermedio'], prezzo: 280 },
      { nome: 'Servizio avanzato', dettagli: ['Personalizzazione secondo esigenze specifiche', 'Verifica finale con il cliente'], prezzo: 420 },
      { nome: 'Coordinamento progetto', dettagli: ['Pianificazione tempi e consegne', 'Aggiornamenti sullo stato lavori'], prezzo: 180 },
      { nome: 'Assistenza post consegna', dettagli: ['Supporto entro 7 giorni dalla consegna', 'Piccole modifiche incluse'], prezzo: 120 },
    ],
    rimborsi: [
      { nome: 'Trasferta km', dettaglio: '30 km x 0.25 = €7.50', tipo: 'Esente', importo: 7.5 },
      { nome: 'Materiali di consumo', dettaglio: 'Dotazioni operative dedicate = €25.00', tipo: 'Imponibile', importo: 25 },
    ],
    note: 'Acconto del 30% richiesto alla conferma del lavoro',
  },
}

const DEMO_NOME_AZIENDA: Record<string, string> = {
  videomaker: 'Studio Visivo Productions',
  fotografo: 'Foto Art Studio',
  catering: 'Sapori Eventi Catering',
  falegname: 'Bottega Legno Vivo',
  estetista: 'Essenza Beauty Studio',
  elettricista: 'Elettro Service Roma',
  idraulico: 'IdroCasa Service',
  imbianchino: 'Colori & Pareti',
  consulente: 'Strategia Pratica Consulting',
  altro: 'Studio Professionale Demo',
}

function formatEuro(valore: number) {
  return valore.toFixed(2).replace('.', ',')
}

function generaTestoDemo(categoria: string, compatto = false): string {
  const demo = DEMO_PREVENTIVO[categoria] || DEMO_PREVENTIVO.altro
  const serviziDemo = compatto ? demo.servizi.slice(0, 4) : demo.servizi
  const rimborsiDemo = compatto ? demo.rimborsi.slice(0, 1) : demo.rimborsi
  const data = new Date().toLocaleDateString('it-IT')
  const imponibile = serviziDemo.reduce((tot, s) => tot + s.prezzo, 0) + rimborsiDemo.reduce((tot, r) => tot + r.importo, 0)
  const iva = imponibile * 0.22
  const totale = imponibile + iva
  const servizi = serviziDemo.map(s =>
    `SERVIZIO: ${s.nome}\nDETTAGLI:\n- ${s.dettagli[0]}\n- ${s.dettagli[1]}\nPREZZO: €${formatEuro(s.prezzo)}`
  ).join('\n\n')
  const rimborsi = rimborsiDemo.map(r =>
    `RIMBORSO: ${r.nome}\nDETTAGLIO: ${r.dettaglio}\nTIPO: ${r.tipo}\nIMPORTO: €${formatEuro(r.importo)}`
  ).join('\n\n')

  return `PREVENTIVO\nData: ${data}  |  Validità: 30 giorni\n\nSERVIZI:\n\n${servizi}\n\nRIMBORSI SPESE:\n\n${rimborsi}\n\nRIEPILOGO:\nImponibile: €${formatEuro(imponibile)}\nIVA 22%: €${formatEuro(iva)}\nTOTALE: €${formatEuro(totale)}\n\nNote: ${demo.note}\nPAGAMENTO: Bonifico bancario\nLINK PAGAMENTO: https://checkout.stripe.com/demo-link-esempio`
}

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [stepMassimoRaggiunto, setStepMassimoRaggiunto] = useState(0)
  const [saving, setSaving] = useState(false)
  const [elaborando, setElaborando] = useState(false)
  const backendUrl = Constants.expoConfig?.extra?.backendUrl

  // Step template
  const [templateScelto, setTemplateScelto] = useState('pulito')
  const [htmlPreview, setHtmlPreview] = useState('')
  const [caricandoPreview, setCaricandoPreview] = useState(false)
  const previewTimeout = useRef<any>(null)

  // Step 2 — dati azienda
  const [nomeAzienda, setNomeAzienda] = useState('')
  const [citta, setCitta] = useState('')
  const [categoria, setCategoria] = useState('')
  const [firmaNome, setFirmaNome] = useState('')

  // Step 3 — servizi
  const [modalitaServizi, setModalitaServizi] = useState<'testo' | 'manuale'>('testo')
  const [testoServizi, setTestoServizi] = useState('')
  const [servizi, setServizi] = useState<Omit<ServizioForm, 'id'>[]>([])
  const [nuovoServizio, setNuovoServizio] = useState({ nome: '', descrizione: '', costo: '', unita: 'ora' })
  const [listinoTab, setListinoTab] = useState<'testo' | 'foto' | 'vocale'>('testo')
  const [registrando, setRegistrando] = useState(false)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [elaborandoMedia, setElaborandoMedia] = useState(false)
  async function elaboraServiziAI() {
    if (!testoServizi.trim()) return
    setElaborando(true)
    try {
      const token = await tokenOnboarding()
      if (!token) return
      const data = await elaboraServiziDaTesto({ backendUrl, token, testo: testoServizi })
      if (data.servizi) {
        setServizi(data.servizi)
        setModalitaServizi('manuale')
      }
    } catch {
      Alert.alert('Errore', 'Impossibile elaborare i servizi')
    }
    setElaborando(false)
  }

  async function gestisciFotoServiziOnboarding(sorgente: 'galleria' | 'camera') {
    setElaborandoMedia(true)
    try {
      const token = await tokenOnboarding()
      if (!token) return
      const result = sorgente === 'galleria'
        ? await scegliFotoServiziSmart({ backendUrl, token })
        : await scattaFotoServiziSmart({ backendUrl, token })

      if (result.permissionDenied === 'gallery') { Alert.alert('Permesso negato', 'Serve accesso alla galleria.'); return }
      if (result.permissionDenied === 'camera') { Alert.alert('Permesso negato', 'Serve accesso alla fotocamera.'); return }
      if (result.canceled) return
      if (result.servizi.length) {
        setServizi(result.servizi)
        setModalitaServizi('manuale')
      } else {
        Alert.alert('Nessun servizio trovato', 'Prova con un\'altra foto.')
      }
    } catch { Alert.alert('Errore', 'Impossibile elaborare la foto') }
    setElaborandoMedia(false)
  }

  async function toggleRegistrazioneServiziOnboarding() {
    if (registrando) {
      setRegistrando(false)
      if (!recording) return
      setRecording(null)
      setElaborandoMedia(true)
      try {
        const token = await tokenOnboarding()
        if (!token) return
        const serviziEstratti = await fermaRegistrazioneServiziSmart(recording, { backendUrl, token })
        if (serviziEstratti.length) {
          setServizi(serviziEstratti)
          setModalitaServizi('manuale')
        } else {
          Alert.alert('Nessun servizio trovato', 'Riprova descrivendo meglio i servizi.')
        }
      } catch { Alert.alert('Errore', 'Impossibile elaborare il vocale') }
      setElaborandoMedia(false)
      return
    }

    const rec = await avviaRegistrazioneListinoSmart()
    if (!rec) { Alert.alert('Permesso negato', 'Serve accesso al microfono.'); return }
    setRecording(rec)
    setRegistrando(true)
  }

  async function aggiornaPreview(tmpl: string) {
    setCaricandoPreview(true)
    try {
      const token = await tokenOnboarding()
      if (!token) return
      const categoriaDemo = categoria && DEMO_PREVENTIVO[categoria] ? categoria : 'altro'
      const nomeAziendaDemo = DEMO_NOME_AZIENDA[categoriaDemo]
      const testoDemo = generaTestoDemo(categoriaDemo, tmpl === 'artigiano')
      const data = await generaPreviewOnboarding({
        backendUrl,
        token,
        testo: testoDemo,
        template: tmpl,
        demoProfile: {
          nome_azienda: nomeAziendaDemo,
          citta: 'Roma',
          piva: '12345678901',
          telefono: '06 1234567',
          firma_nome: firmaNome.trim() || nomeAziendaDemo,
        },
        demoCliente: {
          nome: 'Marco Bianchi',
          email: 'marco.bianchi@email.it',
          telefono: '333 1234567',
          indirizzo: 'Via Roma 24, 00100 Roma',
        },
      })
      if (data.html) {
        const htmlScalato = data.html.replace(
          '</head>',
          `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>html{width:100%;overflow:hidden}body{transform-origin:top left;transform:scale(0.45);width:222%;overflow:hidden}a{pointer-events:none!important;cursor:default!important}</style>
        </head>`
        )
        setHtmlPreview(htmlScalato)
      }
    } catch {}
    setCaricandoPreview(false)
  }

  function aggiungiServizio() {
    if (!nuovoServizio.nome.trim()) return
    setServizi(s => [...s, { ...nuovoServizio }])
    setNuovoServizio({ nome: '', descrizione: '', costo: '', unita: 'ora' })
  }

  function rimuoviServizio(i: number) {
    setServizi(s => s.filter((_, idx) => idx !== i))
  }

  function puoNavigareAlloStep(targetStep: number) {
    if (targetStep >= 2 && (!nomeAzienda.trim() || !categoria)) return false
    return targetStep >= 0 && targetStep <= 3
  }

  function vaiAlloStep(targetStep: number) {
    if (!puoNavigareAlloStep(targetStep)) return
    setStep(targetStep)
    setStepMassimoRaggiunto(s => Math.max(s, targetStep))
    if (targetStep === 3) aggiornaPreview(templateScelto)
  }

  function avanzaDaServizi() {
    if (modalitaServizi === 'testo' && listinoTab === 'testo' && testoServizi.trim() !== '' && servizi.length === 0) {
      const riconosciUnita = (riga: string) => {
        const testo = riga.toLowerCase()
        if (/(ora|orario|all'ora|\/ora)/.test(testo)) return 'ora'
        if (/(giorno|giornata|al giorno)/.test(testo)) return 'giorno'
        if (/(mq|metro quadro|al mq)/.test(testo)) return 'mq'
        if (/(set|a set)/.test(testo)) return 'set'
        if (/(progetto|a progetto)/.test(testo)) return 'progetto'
        return 'cad'
      }
      const pulisciNome = (riga: string, prezzo: string) =>
        riga
          .replace(prezzo, '')
          .replace(/€/gi, '')
          .replace(/\beuro\b/gi, '')
          .replace(/\ball'ora\b|\b\/ora\b|\borario\b|\bora\b/gi, '')
          .replace(/\bal giorno\b|\bgiornata\b|\bgiorno\b/gi, '')
          .replace(/\bal mq\b|\bmetro quadro\b|\bmq\b/gi, '')
          .replace(/\ba set\b|\bset\b/gi, '')
          .replace(/\ba progetto\b|\bprogetto\b/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim()
      const serviziDaTesto = testoServizi
        .split('\n')
        .map(riga => riga.trim())
        .filter(Boolean)
        .map(riga => {
          const unita = riconosciUnita(riga)
          const match = riga.match(/^(.+?):\s*(\d+(?:[.,]\d+)?)\s*€?/)
          if (match) {
            return {
              nome: match[1].trim(),
              descrizione: '',
              costo: match[2].replace(',', '.'),
              unita,
            }
          }
          const matchPrezzo = riga.match(/(\d+(?:[.,]\d+)?)/)
          if (matchPrezzo) {
            const costo = matchPrezzo[1].replace(',', '.')
            return {
              nome: pulisciNome(riga, matchPrezzo[1]) || riga,
              descrizione: '',
              costo,
              unita,
            }
          }
          return { nome: riga, descrizione: '', costo: '', unita: 'cad' }
        })
      setServizi(serviziDaTesto)
    }
    vaiAlloStep(3)
  }

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 0) {
        setStep(step - 1)
        return true
      }

      Alert.alert(
        'Vuoi uscire?',
        'La configurazione non è completa',
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Esci', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]
      )
      return true
    })

    return () => subscription.remove()
  }, [step])

  async function completa() {
    setSaving(true)
    try {
      const { error } = await completaOnboarding({
        nomeAzienda,
        citta,
        categoria,
        templateScelto,
        firmaNome,
        servizi,
      })
      if (error) throw error

      router.replace('/(tabs)')
    } catch (err: unknown) {
      Alert.alert('Errore', errorMessage(err))
    }
    setSaving(false)
  }

  // ── STEP 0: Benvenuto ──
  if (step === 0) return (
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
        <TouchableOpacity style={styles.nextBtn} onPress={() => vaiAlloStep(1)}>
          <Text style={styles.nextBtnText}>Inizia la configurazione →</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  // ── STEP 1: Dati azienda ──
  if (step === 1) return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.stepHeader}>
        <Stepper stepAttuale={2} stepMassimoRaggiunto={stepMassimoRaggiunto} onNavigate={vaiAlloStep} canNavigate={puoNavigareAlloStep} />
      </View>
      <ScrollView contentContainerStyle={styles.stepContent}>
        <Text style={styles.stepTitle}>Chi sei?</Text>
        <Text style={styles.stepSub}>Questi dati appariranno nei tuoi preventivi PDF</Text>

        <Text style={styles.fieldLabel}>NOME O RAGIONE SOCIALE *</Text>
        <TextInput
          style={styles.fieldInput}
          value={nomeAzienda}
          onChangeText={setNomeAzienda}
          placeholder="es. Mario Rossi, Studio Rossi"
          placeholderTextColor="#9CA3AF"
          autoFocus
        />

        <Text style={styles.fieldLabel}>CITTÀ</Text>
        <TextInput
          style={styles.fieldInput}
          value={citta}
          onChangeText={setCitta}
          placeholder="es. Roma"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.fieldLabel}>CHE LAVORO FAI?</Text>
        <View style={styles.categorie}>
          {CATEGORIE.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.categoriaChip, categoria === c && styles.categoriaChipActive]}
              onPress={() => setCategoria(c)}
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
          onChangeText={setFirmaNome}
          placeholder="es. Mario Rossi"
          placeholderTextColor="#9CA3AF"
        />
        {firmaNome ? (
          <Text style={{ fontSize: 20, color: '#374151', fontStyle: 'italic', textAlign: 'center', paddingVertical: 8, fontFamily: 'Dancing Script' }}>
            {firmaNome}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.nextBtn, (!nomeAzienda.trim() || !categoria) && styles.nextBtnDisabled]}
          onPress={() => vaiAlloStep(2)}
          disabled={!nomeAzienda.trim() || !categoria}
        >
          <Text style={styles.nextBtnText}>Avanti →</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )

  // ── STEP 2: Servizi ──
  if (step === 2) return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.stepHeader}>
        <Stepper stepAttuale={3} stepMassimoRaggiunto={stepMassimoRaggiunto} onNavigate={vaiAlloStep} canNavigate={puoNavigareAlloStep} />
      </View>
      <ScrollView contentContainerStyle={styles.stepContent}>
        <Text style={styles.stepTitle}>I tuoi servizi</Text>
        <Text style={styles.stepSub}>Claude userà questi prezzi per ogni preventivo</Text>

        <View style={styles.modalitaTabs}>
          {([['testo', '📋 Incolla'] , ['foto', '📷 Foto'], ['vocale', '🎙 Vocale'], ['manuale', '✏️ Manuale']] as const).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.modalitaTab, ((key === 'manuale' && modalitaServizi === 'manuale') || (key !== 'manuale' && listinoTab === key && modalitaServizi !== 'manuale')) && styles.modalitaTabActive]}
              onPress={() => {
                if (key === 'manuale') { setModalitaServizi('manuale') }
                else { setModalitaServizi('testo'); setListinoTab(key) }
              }}
            >
              <Text style={[styles.modalitaTabText, ((key === 'manuale' && modalitaServizi === 'manuale') || (key !== 'manuale' && listinoTab === key && modalitaServizi !== 'manuale')) && styles.modalitaTabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {modalitaServizi === 'testo' && listinoTab === 'testo' && (
          <View style={styles.testoServiziBox}>
            <Text style={styles.testoServiziHint}>
              Incolla il tuo listino prezzi — anche disordinato. Claude lo struttura automaticamente.
            </Text>
            <TextInput
              style={styles.testoServiziInput}
              value={testoServizi}
              onChangeText={setTestoServizi}
              multiline
              textAlignVertical="top"
              placeholder={categoria && ESEMPI_LISTINO[categoria] ? `es.\n${ESEMPI_LISTINO[categoria]}` : 'es.\nServizio 1: 100€\nServizio 2: 200€/ora\nServizio 3: 50€/cad'}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              style={[styles.elaboraBtn, (!testoServizi.trim() || elaborando) && styles.nextBtnDisabled]}
              onPress={elaboraServiziAI}
              disabled={!testoServizi.trim() || elaborando}
            >
              {elaborando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.elaboraBtnText}>🤖 Struttura con AI</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {modalitaServizi === 'testo' && listinoTab === 'foto' && (
          <View style={{ gap: 12, marginBottom: 80 }}>
            <Text style={styles.testoServiziHint}>Scatta o carica una foto del tuo listino — anche scritto a mano.</Text>
            <TouchableOpacity
              style={[styles.testoServiziInput, { height: 120, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' }]}
              onPress={() => gestisciFotoServiziOnboarding('galleria')}
            >
              {elaborandoMedia ? <ActivityIndicator color="#0E9F8E" /> : <>
                <Text style={{ fontSize: 32 }}>📷</Text>
                <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Scegli dalla galleria</Text>
              </>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.elaboraBtn, elaborandoMedia && styles.nextBtnDisabled]}
              disabled={elaborandoMedia}
              onPress={() => gestisciFotoServiziOnboarding('camera')}
            >
              <Text style={styles.elaboraBtnText}>📸 Scatta una foto</Text>
            </TouchableOpacity>
          </View>
        )}

        {modalitaServizi === 'testo' && listinoTab === 'vocale' && (
          <View style={{ gap: 12, alignItems: 'center' }}>
            <Text style={styles.testoServiziHint}>Descrivi i tuoi servizi a voce — prezzi, nomi, unità. Claude trascrive e struttura tutto.</Text>
            <TouchableOpacity
              style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: registrando ? '#EF4444' : '#0D1B2A', justifyContent: 'center', alignItems: 'center', marginVertical: 8 }}
              onPress={toggleRegistrazioneServiziOnboarding}
            >
              {elaborandoMedia ? <ActivityIndicator color="#fff" size="large" /> : <Text style={{ fontSize: 32 }}>{registrando ? '⏹' : '🎙'}</Text>}
            </TouchableOpacity>
            <Text style={{ fontSize: 13, color: registrando ? '#EF4444' : '#9CA3AF', fontWeight: '500' }}>
              {elaborandoMedia ? 'Elaborazione...' : registrando ? 'Tocca per fermare' : 'Tocca per registrare'}
            </Text>
          </View>
        )}

        {modalitaServizi === 'manuale' && (
          <View style={styles.manualBox}>
            {servizi.map((s, i) => (
              <View key={i} style={styles.servizioItem}>
                <View style={styles.servizioItemLeft}>
                  <Text style={styles.servizioItemNome}>{s.nome}</Text>
                  {s.costo ? <Text style={styles.servizioItemCosto}>€{s.costo}/{s.unita}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => rimuoviServizio(i)}>
                  <Text style={styles.servizioItemDel}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.nuovoServizioForm}>
              <TextInput
                style={styles.fieldInput}
                value={nuovoServizio.nome}
                onChangeText={v => setNuovoServizio(s => ({ ...s, nome: v }))}
                placeholder="Nome servizio *"
                placeholderTextColor="#9CA3AF"
              />
              <View style={styles.costoUnitaRow}>
                <TextInput
                  style={[styles.fieldInput, { flex: 1 }]}
                  value={nuovoServizio.costo}
                  onChangeText={v => setNuovoServizio(s => ({ ...s, costo: v }))}
                  placeholder="Costo €"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
                <View style={styles.unitaMiniChips}>
                  {UNITA.map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitaMiniChip, nuovoServizio.unita === u && styles.unitaMiniChipActive]}
                      onPress={() => setNuovoServizio(s => ({ ...s, unita: u }))}
                    >
                      <Text style={[styles.unitaMiniText, nuovoServizio.unita === u && styles.unitaMiniTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.aggiungiBtn, !nuovoServizio.nome.trim() && styles.nextBtnDisabled]}
                onPress={aggiungiServizio}
                disabled={!nuovoServizio.nome.trim()}
              >
                <Text style={styles.aggiungiBtnText}>+ Aggiungi servizio</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.skipRow}>
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={avanzaDaServizi}
          >
            <Text style={styles.nextBtnText}>
              {servizi.length > 0 ? `Avanti — ${servizi.length} servizi →` : 'Avanti →'}
            </Text>
          </TouchableOpacity>
          {servizi.length === 0 && (
            <Text style={styles.skipNote}>Potrai aggiungere i servizi in seguito dalle impostazioni</Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )

  // ── STEP 3: Scelta template ──
  if (step === 3) return (
    <View style={styles.container}>
      <View style={styles.stepHeader}>
        <Stepper stepAttuale={4} stepMassimoRaggiunto={stepMassimoRaggiunto} onNavigate={vaiAlloStep} canNavigate={puoNavigareAlloStep} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16, backgroundColor: '#F7F8FA', flexGrow: 1 }}>
        <Text style={styles.stepTitle}>Scegli il tuo stile</Text>
        <Text style={styles.stepSub}>Il template che preferisci per i tuoi preventivi PDF</Text>
        <Text style={[styles.stepSub, { marginTop: -8 }]}>Questa è un'anteprima dimostrativa — potrai personalizzare servizi, prezzi, logo e note in qualsiasi momento dalle Impostazioni</Text>

        {/* Selector template */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { id: 'pulito', nome: 'Pulito', emoji: '⬜' },
            { id: 'classico', nome: 'Classico', emoji: '📋' },
            { id: 'bold', nome: 'Bold', emoji: '🎨' },
            { id: 'minimal_dark', nome: 'Dark', emoji: '🌙' },
            { id: 'artigiano', nome: 'Artigiano', emoji: '🪵' },
          ].map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.templateChip, templateScelto === t.id && styles.templateChipActive]}
              onPress={() => {
                setTemplateScelto(t.id)
                if (previewTimeout.current) clearTimeout(previewTimeout.current)
                previewTimeout.current = setTimeout(() => aggiornaPreview(t.id), 300)
              }}
            >
              <Text style={styles.templateChipEmoji}>{t.emoji}</Text>
              <Text style={[styles.templateChipText, templateScelto === t.id && styles.templateChipTextActive]}>{t.nome}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Preview */}
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
          onPress={completa}
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

  return null
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A' },
  welcomeContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  welcomeEmoji: { fontSize: 64 },
  welcomeTitle: { fontSize: 34, fontWeight: '700', color: '#fff', textAlign: 'center', lineHeight: 42 },
  welcomeSub: { fontSize: 16, color: '#9EC5C0', textAlign: 'center', lineHeight: 24 },
  welcomeFeatures: { width: '100%', gap: 12, marginTop: 8 },
  welcomeFeature: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14 },
  welcomeFeatureIcon: { fontSize: 24 },
  welcomeFeatureText: { fontSize: 15, color: '#fff', fontWeight: '500' },
  stepHeader: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16, backgroundColor: '#0D1B2A' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  stepperCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  stepperCircleActive: { borderColor: '#0E9F8E', backgroundColor: '#0E9F8E' },
  stepperCircleDone: { borderColor: '#0E9F8E', backgroundColor: 'rgba(14,159,142,0.15)' },
  stepperCircleText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  stepperCircleTextActive: { color: '#fff' },
  stepperLine: { width: 24, height: 1.5, backgroundColor: 'rgba(255,255,255,0.2)' },
  stepperLineDone: { backgroundColor: '#0E9F8E' },
  stepContent: { padding: 24, gap: 12, backgroundColor: '#F7F8FA', flexGrow: 1 },
  stepTitle: { fontSize: 26, fontWeight: '700', color: '#0D1B2A', marginTop: 8 },
  stepSub: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8, marginTop: 4 },
  fieldInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  categorie: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  categoriaChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  categoriaChipActive: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  categoriaText: { fontSize: 13, color: '#6B7280' },
  categoriaTextActive: { color: '#fff', fontWeight: '500' },
  nextBtn: { backgroundColor: '#0E9F8E', borderRadius: 16, padding: 16, alignItems: 'center' as const, marginTop: 16 },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalitaTabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 3, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4 },
  modalitaTab: { flex: 1, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 10, alignItems: 'center' as const },
  modalitaTabActive: { backgroundColor: '#0D1B2A' },
  modalitaTabText: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
  modalitaTabTextActive: { color: '#fff' },
  testoServiziBox: { gap: 10 },
  testoServiziHint: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  testoServiziInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, fontSize: 13, color: '#0D1B2A', minHeight: 160, textAlignVertical: 'top' },
  elaboraBtn: { backgroundColor: '#0D1B2A', borderRadius: 12, padding: 14, alignItems: 'center' as const },
  elaboraBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  manualBox: { gap: 10 },
  servizioItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  servizioItemLeft: { flex: 1 },
  servizioItemNome: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  servizioItemCosto: { fontSize: 12, color: '#0E9F8E', marginTop: 2 },
  servizioItemDel: { fontSize: 16, color: '#9CA3AF', padding: 4 },
  nuovoServizioForm: { gap: 8, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  costoUnitaRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  unitaMiniChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 },
  unitaMiniChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F7F8FA' },
  unitaMiniChipActive: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  unitaMiniText: { fontSize: 10, color: '#6B7280' },
  unitaMiniTextActive: { color: '#fff' },
  aggiungiBtn: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, alignItems: 'center' as const, borderWidth: 1, borderColor: '#0E9F8E' },
  aggiungiBtnText: { color: '#0E9F8E', fontSize: 13, fontWeight: '600' },
  skipRow: { gap: 8 },
  skipNote: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' as const },
  templateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  templateChipActive: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  templateChipEmoji: { fontSize: 16 },
  templateChipText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  templateChipTextActive: { color: '#fff' },
  previewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  previewContainer: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
})
