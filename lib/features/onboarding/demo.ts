import { formatImportoEuro } from 'previcloud-shared'

type VoceDemo = { nome: string; dettagli: [string, string]; prezzo: number }
type DemoPreventivo = {
  servizi: VoceDemo[]
  rimborsi: { nome: string; dettaglio: string; tipo: string; importo: number }[]
  note: string
}
export const DEMO_PREVENTIVO: Record<string, DemoPreventivo> = {
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

export const DEMO_NOME_AZIENDA: Record<string, string> = {
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

export function generaTestoDemo(categoria: string, compatto = false): string {
  const demo = DEMO_PREVENTIVO[categoria] || DEMO_PREVENTIVO.altro
  const serviziDemo = compatto ? demo.servizi.slice(0, 4) : demo.servizi
  const rimborsiDemo = compatto ? demo.rimborsi.slice(0, 1) : demo.rimborsi
  const data = new Date().toLocaleDateString('it-IT')
  const imponibile = serviziDemo.reduce((tot, s) => tot + s.prezzo, 0) + rimborsiDemo.reduce((tot, r) => tot + r.importo, 0)
  const iva = imponibile * 0.22
  const totale = imponibile + iva
  const servizi = serviziDemo.map(s =>
    `SERVIZIO: ${s.nome}\nDETTAGLI:\n- ${s.dettagli[0]}\n- ${s.dettagli[1]}\nPREZZO: €${formatImportoEuro(s.prezzo, 2)}`
  ).join('\n\n')
  const rimborsi = rimborsiDemo.map(r =>
    `RIMBORSO: ${r.nome}\nDETTAGLIO: ${r.dettaglio}\nTIPO: ${r.tipo}\nIMPORTO: €${formatImportoEuro(r.importo, 2)}`
  ).join('\n\n')

  return `PREVENTIVO\nData: ${data}  |  Validità: 30 giorni\n\nSERVIZI:\n\n${servizi}\n\nRIMBORSI SPESE:\n\n${rimborsi}\n\nRIEPILOGO:\nImponibile: €${formatImportoEuro(imponibile, 2)}\nIVA 22%: €${formatImportoEuro(iva, 2)}\nTOTALE: €${formatImportoEuro(totale, 2)}\n\nNote: ${demo.note}\nPAGAMENTO: Bonifico bancario\nLINK PAGAMENTO: https://checkout.stripe.com/demo-link-esempio`
}
