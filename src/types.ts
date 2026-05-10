export type FlowType = 'onboarding' | 'offboarding'

export type StepStatus = 'pending' | 'in_progress' | 'completed'

export type StepKind = 'document' | 'training' | 'task'

export type WorkflowStep = {
  id: string
  kind: StepKind
  title: string
  description: string
  status: StepStatus
  /** ISO timestamp — documenti firmati digitalmente */
  signedAt?: string
  /** 0–100 per corsi */
  trainingProgress?: number
  trainingCompletedAt?: string
  estimatedHours?: number
}

/** Record proveniente dall’HCM (in produzione: props dall’host o API). */
export type HcmEmployee = {
  id: string
  firstName: string
  lastName: string
  email: string
  /** Data suggerita (ingresso previsto, uscita, ecc.) yyyy-mm-dd */
  referenceDate: string
  role: string
  team: string
}

export type Employee = {
  id: string
  /** Allineamento con persona nell’HCM; se presente, la riga sparisce dalla lista “da avviare”. */
  hcmEmployeeId?: string
  firstName: string
  lastName: string
  email: string
  department: string
  /** Ruolo come da anagrafica HCM */
  role?: string
  flow: FlowType
  /** Data riferimento: assunzione (onboarding) o uscita (offboarding) */
  referenceDate: string
  createdAt: string
  steps: WorkflowStep[]
}
