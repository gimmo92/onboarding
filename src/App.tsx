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
import EmployeeSimulationPanels from './EmployeeSimulationPanels'
import { completionAttachments } from './workflowStepCompletion'

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
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [remindStep, setRemindStep] = useState<WorkflowStep | null>(null)
  const [detailStep, setDetailStep] = useState<WorkflowStep | null>(null)
  const [remindSubject, setRemindSubject] = useState('')
  const [remindBody, setRemindBody] = useState('')
  const employeesPersistReady = useRef(false)
  const remindDialogRef = useRef<HTMLDialogElement>(null)
  const detailDialogRef = useRef<HTMLDialogElement>(null)

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

  const openTask = useMemo(() => {
    if (!openTaskId) return null
    return taskSteps.find((s) => s.id === openTaskId) ?? null
  }, [openTaskId, taskSteps])

  useEffect(() => {
    setOpenTaskId(null)
    setRemindStep(null)
    setDetailStep(null)
  }, [selectedId])

  useEffect(() => {
    const d = remindDialogRef.current
    if (!d) return
    if (remindStep) {
      d.showModal()
    } else {
      d.close()
    }
  }, [remindStep])

  useEffect(() => {
    const d = detailDialogRef.current
    if (!d) return
    if (detailStep) {
      d.showModal()
    } else {
      d.close()
    }
  }, [detailStep])

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

  function downloadDemoAttachment(fileName: string, title: string) {
    const body = `Copia dimostrativa generata in locale.\nRiferimento: ${title}\n`
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName.toLowerCase().endsWith('.pdf')
      ? fileName.replace(/\.pdf$/i, '') + '_demo.txt'
      : `${fileName}_demo.txt`
    a.rel = 'noopener'
    a.click()
    URL.revokeObjectURL(url)
  }

  function confirmSignature() {
    if (!signContext || !acceptChecked) return
    const ts = new Date().toISOString()
    patchStep(signContext.employeeId, signContext.step.id, {
      status: 'completed',
      signedAt: ts,
      trainingProgress: undefined,
      ...completionAttachments(signContext.step.kind, ts),
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
    setOpenTaskId(null)
    setRemindStep(null)
    setDetailStep(null)
  }

  function openRemind(step: WorkflowStep) {
    if (!selected) return
    setRemindSubject(`Sollecito onboarding: ${step.title}`)
    setRemindBody(
      `Ciao ${selected.firstName},\n\n` +
        `ti ricordiamo di completare l’attività «${step.title}» nel percorso di onboarding.\n\n` +
        `Accedi al portale dipendente per aggiornare lo stato.\n\n` +
        `Cordiali saluti,\nTeam HR`
    )
    setRemindStep(step)
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
                  d="M7.75 13.19 4.53 9.97l1.06-1.06 2.16 2.16 6.16-6.16 1.06 1.06-7.22 7.22Z"
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

              {selected.flow === 'onboarding' ? (
                <>
                  <section className="hr-workflow-monitor panel">
                    <h3 className="steps-title">Vista HR — attività nel workflow</h3>
                    <p className="steps-intro hr-workflow-intro">
                      Monitoraggio del percorso del dipendente. Per le attività completate apri il
                      dettaglio con documenti registrati; per quelle ancora aperte invia un sollecito
                      via email.
                    </p>
                    <ol className="hr-activity-timeline" aria-label="Elenco attività">
                      {selected.steps.map((step, index) => (
                        <li key={step.id} className={`hr-activity-card ${step.status}`}>
                          <div className="hr-activity-card-marker" aria-hidden>
                            {step.status === 'completed' ? (
                              <svg viewBox="0 0 20 20" className="hr-activity-check">
                                <path
                                  fill="currentColor"
                                  d="M7.75 13.19 4.53 9.97l1.06-1.06 2.16 2.16 6.16-6.16 1.06 1.06-7.22 7.22Z"
                                />
                              </svg>
                            ) : (
                              index + 1
                            )}
                          </div>
                          <div className="hr-activity-card-body">
                            <div className="hr-activity-card-head">
                              <span
                                className={`badge ${
                                  step.kind === 'document'
                                    ? 'doc'
                                    : step.kind === 'training'
                                      ? 'train'
                                      : 'task'
                                }`}
                              >
                                {labelKind(step.kind)}
                              </span>
                              <strong>{step.title}</strong>
                              <span className={`pill status-${step.status}`}>
                                {statusLabel(step.status)}
                              </span>
                            </div>
                            <p className="hr-activity-desc">{step.description}</p>
                            <div className="hr-activity-card-actions">
                              {step.status === 'completed' ? (
                                <button
                                  type="button"
                                  className="btn"
                                  onClick={() => setDetailStep(step)}
                                >
                                  Visualizza
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn primary"
                                  onClick={() => openRemind(step)}
                                >
                                  Sollecita
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                  <details className="hr-sim-details panel">
                    <summary className="hr-sim-details-summary">
                      Simulazione azioni dipendente (test)
                    </summary>
                    <p className="steps-intro hr-sim-details-intro">
                      Sezione opzionale per simulare firme, corsi e attività come farebbe il
                      dipendente nell&apos;app.
                    </p>
                    <EmployeeSimulationPanels
                      employee={selected}
                      openTask={openTask}
                      documentSteps={documentSteps}
                      trainingSteps={trainingSteps}
                      taskSteps={taskSteps}
                      setOpenTaskId={setOpenTaskId}
                      patchStep={patchStep}
                      setSignContext={setSignContext}
                      labelKind={labelKind}
                      statusLabel={statusLabel}
                      formatDateTimeIt={formatDateTimeIt}
                    />
                  </details>
                </>
              ) : (
                <EmployeeSimulationPanels
                  employee={selected}
                  openTask={openTask}
                  documentSteps={documentSteps}
                  trainingSteps={trainingSteps}
                  taskSteps={taskSteps}
                  setOpenTaskId={setOpenTaskId}
                  patchStep={patchStep}
                  setSignContext={setSignContext}
                  labelKind={labelKind}
                  statusLabel={statusLabel}
                  formatDateTimeIt={formatDateTimeIt}
                />
              )}
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
            <div className="da-completare-home">
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
            </div>
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
            <h4>Nuovo dipendente in flusso</h4>
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
                Conferma e crea
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

      <dialog
        ref={remindDialogRef}
        className="sign-dialog hr-remind-dialog"
        onClose={() => setRemindStep(null)}
      >
        {remindStep && selected ? (
          <>
            <h4>Invia sollecito email</h4>
            <p className="dialog-doc-title">
              Attività: <strong>{remindStep.title}</strong>
            </p>
            <label className="wizard-field">
              A
              <input type="email" readOnly value={selected.email} />
            </label>
            <label className="wizard-field">
              Oggetto
              <input
                type="text"
                value={remindSubject}
                onChange={(e) => setRemindSubject(e.target.value)}
              />
            </label>
            <label className="wizard-field">
              Messaggio
              <textarea
                rows={8}
                value={remindBody}
                onChange={(e) => setRemindBody(e.target.value)}
              />
            </label>
            <p className="dialog-copy hr-remind-note">
              Invio simulato: in produzione verrebbe usato il servizio email aziendale (SMTP / API).
            </p>
            <div className="dialog-actions">
              <button type="button" className="btn ghost" onClick={() => setRemindStep(null)}>
                Annulla
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  window.alert(
                    `Sollecito inviato (demo) a ${selected.email}.\nOggetto: ${remindSubject}`
                  )
                  setRemindStep(null)
                }}
              >
                Invia email
              </button>
            </div>
          </>
        ) : null}
      </dialog>

      <dialog
        ref={detailDialogRef}
        className="sign-dialog hr-detail-dialog"
        onClose={() => setDetailStep(null)}
      >
        {detailStep ? (
          <>
            <h4>Dettaglio attività completata</h4>
            <p className="dialog-doc-title">
              <span
                className={`badge ${
                  detailStep.kind === 'document'
                    ? 'doc'
                    : detailStep.kind === 'training'
                      ? 'train'
                      : 'task'
                }`}
              >
                {labelKind(detailStep.kind)}
              </span>{' '}
              <strong>{detailStep.title}</strong>
            </p>
            <p className="dialog-copy">{detailStep.description}</p>
            {detailStep.signedAt ? (
              <p className="signed-at">
                Accettazione registrata il {formatDateTimeIt(detailStep.signedAt)}
              </p>
            ) : null}
            {detailStep.trainingCompletedAt ? (
              <p className="signed-at">
                Corso completato il {formatDateTimeIt(detailStep.trainingCompletedAt)}
              </p>
            ) : null}
            {detailStep.trainingProgress != null && detailStep.status === 'completed' ? (
              <p className="hr-detail-meta">Avanzamento corso: {detailStep.trainingProgress}%</p>
            ) : null}
            <h4 className="hr-detail-subtitle">Documenti e allegati</h4>
            {(detailStep.attachments ?? []).length === 0 ? (
              <p className="hr-detail-empty">Nessun allegato registrato per questa attività.</p>
            ) : (
              <ul className="hr-attachment-list">
                {(detailStep.attachments ?? []).map((att, i) => (
                  <li key={`${att.fileName}-${i}`} className="hr-attachment-item">
                    <div>
                      <strong>{att.fileName}</strong>
                      <p className="hr-attachment-meta">
                        Caricato il {formatDateTimeIt(att.uploadedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn ghost btn-compact"
                      onClick={() => downloadDemoAttachment(att.fileName, detailStep.title)}
                    >
                      Scarica copia dimostrativa
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="dialog-actions">
              <button type="button" className="btn primary" onClick={() => setDetailStep(null)}>
                Chiudi
              </button>
            </div>
          </>
        ) : null}
      </dialog>
    </div>
  )
}
