import type { FlowType, WorkflowStep } from './types'

function newId(): string {
  return crypto.randomUUID()
}

function step(
  kind: WorkflowStep['kind'],
  title: string,
  description: string,
  extras: Partial<Omit<WorkflowStep, 'id' | 'kind' | 'title' | 'description' | 'status'>> = {}
): WorkflowStep {
  return {
    id: newId(),
    kind,
    title,
    description,
    status: 'pending',
    ...extras,
  }
}

export function stepsForFlow(flow: FlowType): WorkflowStep[] {
  if (flow === 'onboarding') {
    return [
      step('document', 'Contratto di lavoro', 'Firma contratto individuale o lettera di intenti.', {}),
      step('document', 'Accordo riservatezza (NDA)', 'Protezione know-how e dati cliente.', {}),
      step(
        'document',
        'Regolamento aziendale e codice etico',
        'Accettazione policy interne, anticorruzione e uso risorse IT.',
        {}
      ),
      step(
        'training',
        'Sicurezza sul lavoro',
        'Modulo obbligatorio su rischi, DPI e procedure di emergenza.',
        { estimatedHours: 4 }
      ),
      step(
        'training',
        'GDPR e trattamento dati personali',
        'Ruoli, basi giuridiche, diritti degli interessati e incident response.',
        { estimatedHours: 2 }
      ),
      step(
        'training',
        'Strumenti e cultura aziendale',
        'Suite produttività, ticketing, canali comunicazione.',
        { estimatedHours: 1 }
      ),
      step('task', 'Account IT e badge', 'Creazione utenze, MFA, badge accessi fisici.'),
      step('task', 'Welcome HR — benvenuto in azienda', 'Presentazione valori, benefici e punti di contatto.'),
    ]
  }

  return [
    step('document', 'Accordo/chiusura rapporto', 'Documentazione legale fine rapporto o dimissioni volontarie.', {}),
    step(
      'document',
      'Lettera revoche e consegna beni',
      'Conferma restituzione materiali e revoca uso marchio/materiale aziendale.',
      {}
    ),
    step(
      'training',
      'Sensibilizzazione uscita e dati',
      'Brief su obblighi post-rapporto: segreto professionale, divieto divulgazione, restituzione info.',
      { estimatedHours: 1 }
    ),
    step('task', 'Restituzione hardware', 'PC, badge, chiavi e dispositivi mobili.'),
    step('task', 'Checklist IT — dismissione account', 'Chiusura caselle, SSO, rimozione dai gruppi e backup autorizzati.'),
    step('task', 'Colloquio di uscita', 'Feedback, handover documentazione e trasferimento conoscenza.'),
  ]
}
