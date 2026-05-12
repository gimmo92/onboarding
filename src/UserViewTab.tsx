import { useMemo, useState } from 'react'
import type { WorkflowBlueprintStepKind } from './workflowBuilder'
import { blueprintStepKindLabel } from './workflowBuilder'

type UserFlowStepStatus = 'pending' | 'in_progress' | 'completed'

type UserFlowStep = {
  id: string
  kind: WorkflowBlueprintStepKind
  title: string
  description: string
  status: UserFlowStepStatus
}

const EXAMPLE_WORKFLOW = {
  name: 'Onboarding Product Design',
  flowLabel: 'Onboarding',
  referenceDateLabel: '15 mag 2026',
  role: 'Product Designer',
  team: 'Design',
}

const INITIAL_STEPS: UserFlowStep[] = [
  {
    id: 'step-contract',
    kind: 'document_sign',
    title: 'Firma contratto di lavoro',
    description: 'Leggi e accetta il contratto individuale prima dell’ingresso.',
    status: 'pending',
  },
  {
    id: 'step-id',
    kind: 'document_upload',
    title: 'Carica documento d’identità',
    description: 'Allega fronte e retro del documento in corso di validità.',
    status: 'pending',
  },
  {
    id: 'step-safety',
    kind: 'activity',
    title: 'Corso sicurezza sul lavoro',
    description: 'Completa il modulo obbligatorio su rischi e procedure di emergenza.',
    status: 'pending',
  },
  {
    id: 'step-hr',
    kind: 'activity',
    title: 'Compila modulo dati HR',
    description: 'Inserisci recapiti, benefici e contatti di emergenza.',
    status: 'pending',
  },
  {
    id: 'step-privacy',
    kind: 'document_sign',
    title: 'Firma informativa privacy',
    description: 'Conferma la presa visione del trattamento dati personali.',
    status: 'pending',
  },
]

function stepStatusLabel(status: UserFlowStepStatus): string {
  switch (status) {
    case 'in_progress':
      return 'In corso'
    case 'completed':
      return 'Completato'
    default:
      return 'Da fare'
  }
}

function stepKindBadgeClass(kind: WorkflowBlueprintStepKind): string {
  switch (kind) {
    case 'document_sign':
      return 'doc'
    case 'document_upload':
      return 'task'
    default:
      return 'train'
  }
}

export default function UserViewTab() {
  const [started, setStarted] = useState(false)
  const [steps, setSteps] = useState<UserFlowStep[]>(INITIAL_STEPS)

  const progress = useMemo(() => {
    const total = steps.length
    const done = steps.filter((step) => step.status === 'completed').length
    const pct = total ? Math.round((done / total) * 100) : 0
    return { done, total, pct }
  }, [steps])

  function startWorkflow() {
    setStarted(true)
    setSteps((current) =>
      current.map((step, index) =>
        index === 0 ? { ...step, status: 'in_progress' } : step
      )
    )
  }

  function completeStep(stepId: string) {
    setSteps((current) => {
      const index = current.findIndex((step) => step.id === stepId)
      if (index < 0) return current

      const next = current.map((step, stepIndex) => {
        if (step.id === stepId) {
          return { ...step, status: 'completed' as const }
        }
        if (stepIndex === index + 1 && step.status === 'pending') {
          return { ...step, status: 'in_progress' as const }
        }
        return step
      })

      return next
    })
  }

  return (
    <div className="user-view-tab">
      <section className="panel user-view-panel">
        <div className="user-view-head">
          <h2>Vista utente</h2>
        </div>

        <article className="user-workflow-card">
          <header className="user-workflow-card-head">
            <div>
              <p className="user-workflow-kicker">{EXAMPLE_WORKFLOW.flowLabel}</p>
              <h3>{EXAMPLE_WORKFLOW.name}</h3>
              <p className="user-workflow-meta">
                <span>{EXAMPLE_WORKFLOW.role}</span>
                <span aria-hidden>·</span>
                <span>{EXAMPLE_WORKFLOW.team}</span>
                <span aria-hidden>·</span>
                <span>Assunzione {EXAMPLE_WORKFLOW.referenceDateLabel}</span>
              </p>
            </div>
            <div className="user-workflow-card-actions">
              <div className="summary-pill user-workflow-progress" role="status">
                <span className="summary-label">Completamento</span>
                <span className="summary-value">
                  {progress.done}/{progress.total} ({progress.pct}%)
                </span>
                <span
                  className="summary-bar"
                  style={{ ['--p' as string]: `${progress.pct}%` }}
                  aria-hidden
                />
              </div>
              {!started ? (
                <button type="button" className="btn primary" onClick={startWorkflow}>
                  Inizia workflow
                </button>
              ) : null}
            </div>
          </header>

          <ol className="user-completion-steps" aria-label="Step del workflow">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className={`user-completion-step ${step.status}`}
                aria-current={step.status === 'in_progress' ? 'step' : undefined}
              >
                <span className="user-completion-marker" aria-hidden>
                  {step.status === 'completed' ? (
                    <svg viewBox="0 0 20 20">
                      <path
                        fill="currentColor"
                        d="M7.75 13.19 4.53 9.97l1.06-1.06 2.16 2.16 6.16-6.16 1.06 1.06-7.22 7.22Z"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                <div className="user-completion-body">
                  <div className="user-completion-title-row">
                    <span className={`badge ${stepKindBadgeClass(step.kind)}`}>
                      {blueprintStepKindLabel(step.kind)}
                    </span>
                    <strong>{step.title}</strong>
                    <span className={`pill status-${step.status}`}>
                      {stepStatusLabel(step.status)}
                    </span>
                  </div>
                  <p className="user-completion-desc">{step.description}</p>
                  {started && step.status === 'in_progress' ? (
                    <button
                      type="button"
                      className="btn primary user-completion-action"
                      onClick={() => completeStep(step.id)}
                    >
                      Segna completato
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </article>
      </section>
    </div>
  )
}
