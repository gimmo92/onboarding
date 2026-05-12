import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  Employee,
  FlowType,
  HcmEmployee,
  StepKind,
  StepStatus,
  WorkflowStep,
} from './types'
import { MOCK_HCM_EMPLOYEES } from './mockHcm'
import { loadEmployees, saveEmployees } from './storage'
import { stepsForFlow } from './workflowTemplates'
import './App.css'

function newEmployeeId(): string {
  return crypto.randomUUID()
}

function formatDateIt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatDateTimeIt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function labelKind(k: StepKind): string {
  switch (k) {
    case 'document':
      return 'Documento'
    case 'training':
      return 'Formazione'
    default:
      return 'Attività'
  }
}

function statusLabel(s: StepStatus): string {
  switch (s) {
    case 'pending':
      return 'Da fare'
    case 'in_progress':
      return 'In corso'
    default:
      return 'Completato'
  }
}

function progressOf(emp: Employee): { done: number; total: number } {
  const total = emp.steps.length
  const done = emp.steps.filter((x) => x.status === 'completed').length
  return { done, total }
}

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>(() => loadEmployees())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [signContext, setSignContext] = useState<{
    employeeId: string
    step: WorkflowStep
  } | null>(null)
  const [acceptChecked, setAcceptChecked] = useState(false)

  const dialogRef = useRef<HTMLDialogElement>(null)
  const startDialogRef = useRef<HTMLDialogElement>(null)

  const [startContext, setStartContext] = useState<HcmEmployee | null>(null)
  const [startFlow, setStartFlow] = useState<FlowType>('onboarding')
  const [startRefDate, setStartRefDate] = useState('')

  useEffect(() => {
    saveEmployees(employees)
  }, [employees])

  useEffect(() => {
    if (employees.length && !selectedId) {
      setSelectedId(employees[0].id)
    }
  }, [employees, selectedId])

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    if (signContext) {
      setAcceptChecked(false)
      d.showModal()
    } else {
      d.close()
    }
  }, [signContext])

  useEffect(() => {
    const d = startDialogRef.current
    if (!d) return
    if (startContext) {
      setStartFlow('onboarding')
      setStartRefDate(startContext.referenceDate)
      d.showModal()
    } else {
      d.close()
    }
  }, [startContext])

  const pendingHcm = useMemo(() => {
    const started = new Set(
      employees.map((e) => e.hcmEmployeeId).filter(Boolean) as string[]
    )
    return MOCK_HCM_EMPLOYEES.filter((h) => !started.has(h.id))
  }, [employees])

  const selected = useMemo(
    () => employees.find((e) => e.id === selectedId) ?? null,
    [employees, selectedId]
  )

  const documentSteps = selected?.steps.filter((s) => s.kind === 'document') ?? []
  const trainingSteps = selected?.steps.filter((s) => s.kind === 'training') ?? []
  const taskSteps = selected?.steps.filter((s) => s.kind === 'task') ?? []

  function confirmStartWorkflow() {
    if (!startContext) return

    const now = new Date().toISOString()
    const emp: Employee = {
      id: newEmployeeId(),
      hcmEmployeeId: startContext.id,
      firstName: startContext.firstName,
      lastName: startContext.lastName,
      email: startContext.email.toLowerCase(),
      department: startContext.team,
      role: startContext.role,
      flow: startFlow,
      referenceDate: startRefDate,
      createdAt: now,
      steps: stepsForFlow(startFlow),
    }
    setEmployees((prev) => [emp, ...prev])
    setSelectedId(emp.id)
    setStartContext(null)
  }

  function patchStep(employeeId: string, stepId: string, patch: Partial<WorkflowStep>) {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp
        return {
          ...emp,
          steps: emp.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
        }
      })
    )
  }

  function confirmSignature() {
    if (!signContext || !acceptChecked) return
    const ts = new Date().toISOString()
    patchStep(signContext.employeeId, signContext.step.id, {
      status: 'completed',
      signedAt: ts,
      trainingProgress: undefined,
    })
    setSignContext(null)
  }

  function removeEmployee(id: string) {
    setEmployees((prev) => prev.filter((e) => e.id !== id))
    setSelectedId((cur) => (cur === id ? null : cur))
  }

  return (
    <div className="app">
      <div className="workspace">
        <section className="hcm-panel panel">
          <div className="hcm-head">
            <h2>Da avviare</h2>
            <p className="hcm-hint">
              Elenco dall’HCM: nome, cognome, data di riferimento, ruolo e team. Avvia il
              workflow appropriato (onboarding o offboarding).
            </p>
          </div>
          <div className="table-scroll">
            <table className="hcm-table">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Cognome</th>
                  <th scope="col">Data</th>
                  <th scope="col">Ruolo</th>
                  <th scope="col">Team</th>
                  <th scope="col" className="col-action">
                    <span className="sr-only">Azione</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingHcm.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="table-empty">
                      Nessun dipendente in attesa di avvio workflow.
                    </td>
                  </tr>
                ) : (
                  pendingHcm.map((h) => (
                    <tr key={h.id}>
                      <td>{h.firstName}</td>
                      <td>{h.lastName}</td>
                      <td className="nowrap">{formatDateIt(h.referenceDate)}</td>
                      <td>{h.role}</td>
                      <td>{h.team}</td>
                      <td className="col-action">
                        <button
                          type="button"
                          className="btn primary btn-compact"
                          onClick={() => setStartContext(h)}
                        >
                          Avvia
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="layout">
          <aside className="sidebar">
          <section className="panel list-panel">
            <h2>Flussi attivi</h2>
            {employees.length === 0 ? (
              <p className="muted">
                Nessun flusso in corso. Usa <strong>Avvia</strong> nella tabella sopra.
              </p>
            ) : (
              <ul className="emp-list">
                {employees.map((emp) => {
                  const { done, total } = progressOf(emp)
                  const active = emp.id === selectedId
                  return (
                    <li key={emp.id}>
                      <button
                        type="button"
                        className={`emp-chip${active ? ' active' : ''}`}
                        onClick={() => setSelectedId(emp.id)}
                      >
                        <span className="chip-name">
                          {emp.firstName} {emp.lastName}
                        </span>
                        <span className={`chip-flow ${emp.flow}`}>
                          {emp.flow === 'onboarding' ? 'On' : 'Off'}
                        </span>
                        <span className="chip-progress">
                          {done}/{total}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </aside>

          <main className="main">
          {!selected ? (
            <div className="empty-main">
              <p>
                Seleziona un dipendente da <strong>Flussi attivi</strong> oppure avvia un
                nuovo workflow dalla tabella in alto.
              </p>
            </div>
          ) : (
            <>
              <div className="detail-head">
                <div>
                  <h2>
                    {selected.firstName} {selected.lastName}
                  </h2>
                  <p className="meta">
                    <span>{selected.email}</span>
                    <span>·</span>
                    <span>{selected.role ?? '—'}</span>
                    <span>·</span>
                    <span>{selected.department}</span>
                    <span>·</span>
                    <span className={selected.flow}>
                      {selected.flow === 'onboarding' ? 'Onboarding' : 'Offboarding'}
                    </span>
                    <span>·</span>
                    <span>
                      {selected.flow === 'onboarding' ? 'Assunzione' : 'Uscita'}:{' '}
                      {formatDateIt(selected.referenceDate)}
                    </span>
                  </p>
                </div>
                <div className="head-actions">
                  {(() => {
                    const { done, total } = progressOf(selected)
                    const pct = total ? Math.round((done / total) * 100) : 0
                    return (
                      <div className="summary-pill" role="status">
                        <span className="summary-label">Completamento</span>
                        <span className="summary-value">
                          {done}/{total} ({pct}%)
                        </span>
                        <span
                          className="summary-bar"
                          style={{ ['--p' as string]: `${pct}%` }}
                          aria-hidden
                        />
                      </div>
                    )
                  })()}
                  <button
                    type="button"
                    className="btn danger ghost"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Eliminare il flusso di ${selected.firstName} ${selected.lastName}?`
                        )
                      ) {
                        removeEmployee(selected.id)
                      }
                    }}
                  >
                    Elimina flusso
                  </button>
                </div>
              </div>

              <section className="steps-section">
                <h3 className="steps-title">Firma documentale</h3>
                <p className="steps-intro">
                  Ogni documento richiede accettazione esplicita; la firma è simulata in
                  questa demo (integrabile con provider eIDAS / DocuSign).
                </p>
                <ul className="step-list">
                  {documentSteps.map((step) => (
                    <li key={step.id} className={`step-card ${step.status}`}>
                      <div className="step-main">
                        <span className="badge doc">{labelKind(step.kind)}</span>
                        <div>
                          <strong>{step.title}</strong>
                          <p className="step-desc">{step.description}</p>
                          {step.signedAt && (
                            <p className="signed-at">
                              Firmato il {formatDateTimeIt(step.signedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="step-actions">
                        <span className={`pill status-${step.status}`}>
                          {statusLabel(step.status)}
                        </span>
                        {step.status !== 'completed' && (
                          <button
                            type="button"
                            className="btn primary"
                            onClick={() =>
                              setSignContext({ employeeId: selected.id, step })
                            }
                          >
                            Firma documento
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="steps-section">
                <h3 className="steps-title">Corsi di formazione</h3>
                <p className="steps-intro">
                  Avvia il modulo, aggiorna l&apos;avanzamento e completa quando il corso è
                  concluso (es. quiz superato o registrazione LMS).
                </p>
                <ul className="step-list">
                  {trainingSteps.map((step) => {
                    const progress = step.trainingProgress ?? 0
                    return (
                      <li key={step.id} className={`step-card ${step.status}`}>
                        <div className="step-main">
                          <span className="badge train">{labelKind(step.kind)}</span>
                          <div>
                            <strong>{step.title}</strong>
                            {step.estimatedHours != null && (
                              <span className="hours">
                                {' '}
                                · {step.estimatedHours} h stimate
                              </span>
                            )}
                            <p className="step-desc">{step.description}</p>
                            {step.trainingCompletedAt && (
                              <p className="signed-at">
                                Completato il {formatDateTimeIt(step.trainingCompletedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="step-actions training-actions">
                          <span className={`pill status-${step.status}`}>
                            {statusLabel(step.status)}
                          </span>
                          {step.status !== 'completed' && (
                            <>
                              {step.status === 'pending' && (
                                <button
                                  type="button"
                                  className="btn"
                                  onClick={() =>
                                    patchStep(selected.id, step.id, {
                                      status: 'in_progress',
                                      trainingProgress: 0,
                                    })
                                  }
                                >
                                  Avvia corso
                                </button>
                              )}
                              {step.status === 'in_progress' && (
                                <label className="progress-wrap">
                                  Avanzamento {progress}%
                                  <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={progress}
                                    onChange={(e) =>
                                      patchStep(selected.id, step.id, {
                                        trainingProgress: Number(e.target.value),
                                      })
                                    }
                                  />
                                </label>
                              )}
                              {step.status === 'in_progress' && (
                                <button
                                  type="button"
                                  className="btn primary"
                                  disabled={progress < 100}
                                  title={
                                    progress < 100
                                      ? 'Porta l’avanzamento al 100% per completare'
                                      : undefined
                                  }
                                  onClick={() =>
                                    patchStep(selected.id, step.id, {
                                      status: 'completed',
                                      trainingProgress: 100,
                                      trainingCompletedAt: new Date().toISOString(),
                                    })
                                  }
                                >
                                  Segna completato
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>

              <section className="steps-section">
                <h3 className="steps-title">Altre attività</h3>
                <ul className="step-list">
                  {taskSteps.map((step) => (
                    <li key={step.id} className={`step-card ${step.status}`}>
                      <div className="step-main">
                        <span className="badge task">{labelKind(step.kind)}</span>
                        <div>
                          <strong>{step.title}</strong>
                          <p className="step-desc">{step.description}</p>
                        </div>
                      </div>
                      <div className="step-actions">
                        <span className={`pill status-${step.status}`}>
                          {statusLabel(step.status)}
                        </span>
                        {step.status === 'pending' && (
                          <button
                            type="button"
                            className="btn"
                            onClick={() =>
                              patchStep(selected.id, step.id, { status: 'in_progress' })
                            }
                          >
                            Inizia
                          </button>
                        )}
                        {step.status === 'in_progress' && (
                          <button
                            type="button"
                            className="btn primary"
                            onClick={() =>
                              patchStep(selected.id, step.id, { status: 'completed' })
                            }
                          >
                            Completata
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
          </main>
        </div>
      </div>

      <dialog
        ref={startDialogRef}
        className="sign-dialog start-dialog"
        onClose={() => setStartContext(null)}
      >
        {startContext && (
          <>
            <h4>Avvia workflow</h4>
            <p className="dialog-doc-title">
              <strong>
                {startContext.firstName} {startContext.lastName}
              </strong>
              <span className="dialog-sub">
                {' '}
                — {startContext.role}, {startContext.team}
              </span>
            </p>
            <fieldset className="start-fieldset">
              <legend>Tipo flusso</legend>
              <label className="radio">
                <input
                  type="radio"
                  name="startFlow"
                  checked={startFlow === 'onboarding'}
                  onChange={() => setStartFlow('onboarding')}
                />
                Onboarding
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="startFlow"
                  checked={startFlow === 'offboarding'}
                  onChange={() => setStartFlow('offboarding')}
                />
                Offboarding
              </label>
            </fieldset>
            <label className="start-date-label">
              {startFlow === 'onboarding' ? 'Data di assunzione' : 'Data di uscita'}
              <input
                type="date"
                value={startRefDate}
                onChange={(e) => setStartRefDate(e.target.value)}
                required
              />
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setStartContext(null)}
              >
                Annulla
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!startRefDate}
                onClick={confirmStartWorkflow}
              >
                Avvia flusso
              </button>
            </div>
          </>
        )}
      </dialog>

      <dialog ref={dialogRef} className="sign-dialog" onClose={() => setSignContext(null)}>
        {signContext && (
          <>
            <h4>Firma documento</h4>
            <p className="dialog-doc-title">
              <strong>{signContext.step.title}</strong>
            </p>
            <p className="dialog-copy">
              Confermi di aver letto il documento e di accettarne il contenuto? Questa
              azione registra data e ora come prova di accettazione (demo senza valore
              legale).
            </p>
            <label className="check">
              <input
                type="checkbox"
                checked={acceptChecked}
                onChange={(e) => setAcceptChecked(e.target.checked)}
              />
              Ho letto e accetto
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setSignContext(null)}
              >
                Annulla
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!acceptChecked}
                onClick={confirmSignature}
              >
                Conferma firma
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  )
}
