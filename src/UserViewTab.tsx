import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
    description: 'Completa il modulo obbligatorio su rischi, DPI e procedure di emergenza.',
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

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}

function openDemoDocument(title: string, intro: string) {
  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeAttr(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.55; max-width: 42rem; margin: 2rem auto; padding: 0 1.25rem; color: #111; }
    h1 { font-size: 1.35rem; margin-bottom: 1rem; }
    p { color: #333; }
    .muted { color: #666; font-size: 0.9rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <h1>${escapeAttr(title)}</h1>
  <p>${escapeAttr(intro)}</p>
  <p>Questo è un documento di esempio aperto in una nuova scheda. In produzione qui comparirebbe il PDF o il viewer integrato.</p>
  <p class="muted">Finestra dimostrativa — puoi chiuderla e tornare all’app per firmare.</p>
</body>
</html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
}

type SignatureCanvasProps = {
  onChange: (hasInk: boolean) => void
}

function SignatureCanvas({ onChange }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const painting = useRef(false)
  const hasInk = useRef(false)

  const layoutCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    const w = Math.max(280, parent ? parent.clientWidth : 320)
    const h = 160
    const dpr = window.devicePixelRatio || 1
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    hasInk.current = false
    onChange(false)
  }, [onChange])

  useEffect(() => {
    const id = requestAnimationFrame(() => layoutCanvas())
    return () => cancelAnimationFrame(id)
  }, [layoutCanvas])

  function clientToLocal(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    let clientX: number
    let clientY: number
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX
      clientY = e.changedTouches[0].clientY
    } else {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }
    return { x: clientX - r.left, y: clientY - r.top }
  }

  function startStroke(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    painting.current = true
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = clientToLocal(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function drawStroke(e: React.MouseEvent | React.TouchEvent) {
    if (!painting.current) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = clientToLocal(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)
    if (!hasInk.current) {
      hasInk.current = true
      onChange(true)
    }
  }

  function endStroke() {
    painting.current = false
  }

  function clearPad() {
    layoutCanvas()
  }

  return (
    <div className="signature-pad-wrap">
      <p className="signature-pad-label">Firma digitale</p>
      <canvas
        ref={canvasRef}
        className="signature-pad"
        aria-label="Area firma: traccia con mouse o dito"
        onMouseDown={startStroke}
        onMouseMove={drawStroke}
        onMouseUp={endStroke}
        onMouseLeave={endStroke}
        onTouchStart={startStroke}
        onTouchMove={drawStroke}
        onTouchEnd={endStroke}
      />
      <div className="signature-pad-actions">
        <button type="button" className="btn ghost btn-compact" onClick={clearPad}>
          Cancella firma
        </button>
      </div>
    </div>
  )
}

function ActivityDetailPanel({
  step,
  onBack,
  onComplete,
}: {
  step: UserFlowStep
  onBack: () => void
  onComplete: () => void
}) {
  const [uploadLabel, setUploadLabel] = useState('')
  const [signOk, setSignOk] = useState(false)

  const canComplete =
    step.kind === 'activity'
      ? true
      : step.kind === 'document_upload'
        ? uploadLabel.length > 0
        : signOk

  return (
    <section className="user-activity-runner" aria-labelledby="user-activity-runner-title">
      <div className="user-activity-runner-toolbar">
        <button type="button" className="btn ghost" onClick={onBack}>
          Torna indietro
        </button>
      </div>
      <h3 id="user-activity-runner-title" className="user-activity-runner-title">
        {step.title}
      </h3>
      <p className="user-activity-runner-desc">{step.description}</p>

      {step.kind === 'document_sign' ? (
        <div className="user-activity-runner-block">
          <button
            type="button"
            className="btn primary"
            onClick={() =>
              openDemoDocument(step.title, step.description)
            }
          >
            Apri documento in nuova scheda
          </button>
          <SignatureCanvas key={step.id} onChange={setSignOk} />
          <p className="user-activity-runner-hint">
            Apri il documento, leggilo nella nuova scheda, poi firma nell’area qui sopra.
          </p>
        </div>
      ) : null}

      {step.kind === 'document_upload' ? (
        <div className="user-activity-runner-block">
          <label className="upload-zone">
            <span className="upload-zone-label">Trascina qui o scegli un file</span>
            <span className="upload-zone-formats">PDF, JPG, PNG</span>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png"
              className="upload-zone-input"
              onChange={(e) => {
                const f = e.target.files?.[0]
                setUploadLabel(f ? f.name : '')
              }}
            />
          </label>
          {uploadLabel ? (
            <p className="upload-zone-file" role="status">
              File selezionato: <strong>{uploadLabel}</strong>
            </p>
          ) : null}
        </div>
      ) : null}

      {step.kind === 'activity' ? (
        <div className="user-activity-runner-block user-activity-runner-block--activity">
          <p className="user-activity-runner-hint">
            Completa l’attività secondo le istruzioni ricevute (LMS, modulo interno, ecc.).
            Quando hai finito, conferma qui sotto.
          </p>
        </div>
      ) : null}

      <div className="user-activity-runner-footer">
        <button
          type="button"
          className="btn primary"
          disabled={!canComplete}
          title={
            !canComplete
              ? step.kind === 'document_upload'
                ? 'Seleziona un file da caricare'
                : step.kind === 'document_sign'
                  ? 'Traccia la firma nell’area dedicata'
                  : undefined
              : undefined
          }
          onClick={onComplete}
        >
          {step.kind === 'document_upload'
            ? 'Invia e completa'
            : step.kind === 'document_sign'
              ? 'Completa con firma'
              : 'Segna completato'}
        </button>
      </div>
    </section>
  )
}

export default function UserViewTab() {
  const [steps, setSteps] = useState<UserFlowStep[]>(INITIAL_STEPS)
  const [openActivityId, setOpenActivityId] = useState<string | null>(null)

  const progress = useMemo(() => {
    const total = steps.length
    const done = steps.filter((step) => step.status === 'completed').length
    const pct = total ? Math.round((done / total) * 100) : 0
    return { done, total, pct }
  }, [steps])

  const openStep = useMemo(
    () => (openActivityId ? steps.find((s) => s.id === openActivityId) ?? null : null),
    [openActivityId, steps]
  )

  function openActivity(stepId: string) {
    setSteps((current) => {
      const step = current.find((s) => s.id === stepId)
      if (!step || step.status === 'completed') return current
      if (step.status === 'pending') {
        return current.map((s) =>
          s.id === stepId ? { ...s, status: 'in_progress' as const } : s
        )
      }
      return current
    })
    setOpenActivityId(stepId)
  }

  function completeStep(stepId: string) {
    setSteps((current) =>
      current.map((step) =>
        step.id === stepId ? { ...step, status: 'completed' as const } : step
      )
    )
    setOpenActivityId(null)
  }

  function handleBackFromRunner() {
    setOpenActivityId(null)
  }

  return (
    <div className="user-view-tab">
      <section className="panel user-view-panel">
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
            </div>
          </header>

          {openStep && openStep.status !== 'completed' ? (
            <ActivityDetailPanel
              key={openStep.id}
              step={openStep}
              onBack={handleBackFromRunner}
              onComplete={() => completeStep(openStep.id)}
            />
          ) : (
            <>
              <ol className="admin-task-grid user-activity-grid" aria-label="Le tue attività">
                {steps.map((step, index) => {
                  return (
                    <li
                      key={step.id}
                      className={`admin-task-cell ${step.status}`}
                      aria-current={step.status === 'in_progress' ? 'step' : undefined}
                    >
                      <span className="admin-task-cell-marker" aria-hidden>
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
                      <div className="admin-task-cell-body">
                        <div className="admin-task-cell-head">
                          <span className={`badge ${stepKindBadgeClass(step.kind)}`}>
                            {blueprintStepKindLabel(step.kind)}
                          </span>
                          <strong>{step.title}</strong>
                          <span className={`pill status-${step.status}`}>
                            {stepStatusLabel(step.status)}
                          </span>
                        </div>
                        <p className="admin-task-cell-desc">{step.description}</p>
                        <div className="admin-task-cell-actions">
                          {step.status !== 'completed' && (
                            <button
                              type="button"
                              className="btn primary"
                              onClick={() => openActivity(step.id)}
                            >
                              {step.status === 'pending' ? 'Avvia attività' : 'Continua'}
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </>
          )}
        </article>
      </section>
    </div>
  )
}
