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
import WorkflowTab from './WorkflowTab'
import DocumentsTab from './DocumentsTab'
import UserViewTab from './UserViewTab'
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

type WorkspaceTab = 'da_completare' | 'workflow' | 'documenti' | 'vista_utente'

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeesReady, setEmployeesReady] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('da_completare')
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
  const [previewHcm, setPreviewHcm] = useState<HcmEmployee | null>(null)
  const employeesPersistReady = useRef(false)

  useEffect(() => {
    let active = true

    loadEmployees()
      .then((list) => {
        if (!active) return
        setEmployees(list)
        setEmployeesReady(true)
      })
      .catch(() => {
        if (!active) return
        setStorageError('Caricamento dati non riuscito.')
        setEmployeesReady(true)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!employeesReady) return
    if (!employeesPersistReady.current) {
      employeesPersistReady.current = true
      return
    }

    void saveEmployees(employees).then((result) => {
      if (!result.ok) {
        setStorageError(result.error ?? 'Salvataggio dati non riuscito.')
      }
    })
  }, [employees, employeesReady])

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

  const onboardingIncomplete = useMemo(() => {
    return employees.filter((e) => {
      if (e.flow !== 'onboarding') return false
      const { done, total } = progressOf(e)
      return done < total
    })
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
    setPreviewHcm(null)
    setWorkspaceTab('da_completare')
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

  function openEmployeeFlow(employeeId: string) {
    setPreviewHcm(null)
    setSelectedId(employeeId)
    setWorkspaceTab('da_completare')
  }

  function openHcmProfile(hcm: HcmEmployee) {
    setPreviewHcm(hcm)
    setSelectedId(null)
    setWorkspaceTab('da_completare')
  }

  function closeFlowView() {
    setSelectedId(null)
    setPreviewHcm(null)
  }

  const flowViewOpen =
    workspaceTab === 'da_completare' && Boolean(selected || previewHcm)

  function showDaCompletareTab() {
    setWorkspaceTab('da_completare')
  }

  function showWorkflowTab() {
    setWorkspaceTab('workflow')
    closeFlowView()
  }

  function showDocumentsTab() {
    setWorkspaceTab('documenti')
    closeFlowView()
  }

  function showUserViewTab() {
    setWorkspaceTab('vista_utente')
    closeFlowView()
  }

  return (
    <div className="app">
      <div className="workspace">
        <nav className="main-tabs" aria-label="Sezioni dell’area di lavoro">
          <button
            type="button"
            role="tab"
            aria-selected={workspaceTab === 'vista_utente'}
            aria-controls="panel-vista-utente"
            id="tab-vista-utente"
            className={`main-tab${workspaceTab === 'vista_utente' ? ' active' : ''}`}
            onClick={showUserViewTab}
          >
            <span className="main-tab-label">
              <svg className="main-tab-icon" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M10 2.75a4.25 4.25 0 1 0 0 8.5 4.25 4.25 0 0 0 0-8.5ZM4.5 16.25v-.5a5.5 5.5 0 0 1 11 0v.5H4.5Z"
                />
              </svg>
              <span>Le tue attività</span>
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={workspaceTab === 'da_completare'}
            aria-controls="panel-da-completare"
            id="tab-da-completare"
            className={`main-tab${workspaceTab === 'da_completare' ? ' active' : ''}`}
            onClick={showDaCompletareTab}
          >
            <span className="main-tab-label">
              <svg className="main-tab-icon" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M10 10.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Zm-5.5 6a5.5 5.5 0 0 1 11 0v.25H4.5v-.25Z"
                />
              </svg>
              <span>Da completare</span>
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={workspaceTab === 'workflow'}
            aria-controls="panel-workflow"
            id="tab-workflow"
            className={`main-tab${workspaceTab === 'workflow' ? ' active' : ''}`}
            onClick={showWorkflowTab}
          >
            <span className="main-tab-label">
              <svg className="main-tab-icon" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M4.25 5.5h11.5a1.25 1.25 0 0 1 1.25 1.25v7a1.25 1.25 0 0 1-1.25 1.25H4.25A1.25 1.25 0 0 1 3 13.75v-7A1.25 1.25 0 0 1 4.25 5.5Zm2.5 2.25v1.5h6.5v-1.5h-6.5Zm0 3v1.5h4.25v-1.5H6.75Z"
                />
              </svg>
              <span>Workflow</span>
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={workspaceTab === 'documenti'}
            aria-controls="panel-documenti"
            id="tab-documenti"
            className={`main-tab${workspaceTab === 'documenti' ? ' active' : ''}`}
            onClick={showDocumentsTab}
          >
            <span className="main-tab-label">
              <svg className="main-tab-icon" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M5.5 3.75h9A1.25 1.25 0 0 1 15.75 5v10a1.25 1.25 0 0 1-1.25 1.25h-9A1.25 1.25 0 0 1 4.25 15V5A1.25 1.25 0 0 1 5.5 3.75Zm1.5 3h5.5v1.5H7v-1.5Zm0 3h5.5v1.5H7v-1.5Z"
                />
              </svg>
              <span>Documenti</span>
            </span>
          </button>
        </nav>

        {workspaceTab === 'da_completare' && storageError ? (
          <p className="document-upload-error">{storageError}</p>
        ) : null}

        {workspaceTab === 'da_completare' ? (
        <div
          id="panel-da-completare"
          role="tabpanel"
          aria-labelledby="tab-da-completare"
          className="tab-stack"
        >
          {flowViewOpen ? (
            <main className="main flow-main">
          {selected ? (
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
                  <button type="button" className="btn ghost" onClick={closeFlowView}>
                    Torna all&apos;elenco
                  </button>
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
          ) : previewHcm ? (
            <>
              <div className="detail-head">
                <div>
                  <h2>
                    {previewHcm.firstName} {previewHcm.lastName}
                  </h2>
                  <p className="meta">
                    <span>{previewHcm.email}</span>
                    <span>·</span>
                    <span>{previewHcm.role}</span>
                    <span>·</span>
                    <span>{previewHcm.team}</span>
                    <span>·</span>
                    <span>Data riferimento: {formatDateIt(previewHcm.referenceDate)}</span>
                  </p>
                </div>
                <div className="head-actions">
                  <button type="button" className="btn ghost" onClick={closeFlowView}>
                    Torna all&apos;elenco
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => setStartContext(previewHcm)}
                  >
                    Avvia onboarding
                  </button>
                </div>
              </div>
            </>
          ) : null}
            </main>
          ) : (
            <>
              <section className="hcm-panel panel">
                <div className="hcm-head">
                  <h2>Da avviare onboarding</h2>
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
                            Nessun dipendente da avviare in onboarding.
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
                              <div className="row-actions">
                                <button
                                  type="button"
                                  className="btn primary btn-compact"
                                  onClick={() => setStartContext(h)}
                                >
                                  Avvia
                                </button>
                                <button
                                  type="button"
                                  className="btn ghost btn-compact"
                                  onClick={() => openHcmProfile(h)}
                                >
                                  Apri
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="panel hcm-panel">
                <div className="hcm-head">
                  <h2>Onboarding da completare</h2>
                </div>
                <div className="table-scroll">
                  <table className="hcm-table">
                    <thead>
                      <tr>
                        <th scope="col">Nome</th>
                        <th scope="col">Cognome</th>
                        <th scope="col">Ruolo</th>
                        <th scope="col">Team</th>
                        <th scope="col">Attività</th>
                        <th scope="col" className="col-action">
                          <span className="sr-only">Azione</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {onboardingIncomplete.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="table-empty">
                            Nessun onboarding in corso da completare.
                          </td>
                        </tr>
                      ) : (
                        onboardingIncomplete.map((emp) => {
                          const { done, total } = progressOf(emp)
                          return (
                            <tr key={emp.id}>
                              <td>{emp.firstName}</td>
                              <td>{emp.lastName}</td>
                              <td>{emp.role ?? '—'}</td>
                              <td>{emp.department}</td>
                              <td className="nowrap col-progress">{done}&nbsp;/&nbsp;{total}</td>
                              <td className="col-action">
                                <button
                                  type="button"
                                  className="btn primary btn-compact"
                                  onClick={() => openEmployeeFlow(emp.id)}
                                >
                                  Apri
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
        ) : workspaceTab === 'workflow' ? (
        <div
          id="panel-workflow"
          role="tabpanel"
          aria-labelledby="tab-workflow"
        >
          <WorkflowTab />
        </div>
        ) : workspaceTab === 'documenti' ? (
        <div
          id="panel-documenti"
          role="tabpanel"
          aria-labelledby="tab-documenti"
        >
          <DocumentsTab />
        </div>
        ) : (
        <div
          id="panel-vista-utente"
          role="tabpanel"
          aria-labelledby="tab-vista-utente"
        >
          <UserViewTab />
        </div>
        )}
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
