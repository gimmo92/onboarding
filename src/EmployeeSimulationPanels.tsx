import type { Employee, WorkflowStep } from './types'
import { completionAttachments } from './workflowStepCompletion'

export type EmployeeSimulationPanelsProps = {
  employee: Employee
  openTask: WorkflowStep | null
  documentSteps: WorkflowStep[]
  trainingSteps: WorkflowStep[]
  taskSteps: WorkflowStep[]
  setOpenTaskId: (id: string | null) => void
  patchStep: (employeeId: string, stepId: string, patch: Partial<WorkflowStep>) => void
  setSignContext: (ctx: { employeeId: string; step: WorkflowStep } | null) => void
  labelKind: (k: WorkflowStep['kind']) => string
  statusLabel: (s: WorkflowStep['status']) => string
  formatDateTimeIt: (iso: string) => string
}

export default function EmployeeSimulationPanels({
  employee,
  openTask,
  documentSteps,
  trainingSteps,
  taskSteps,
  setOpenTaskId,
  patchStep,
  setSignContext,
  labelKind,
  statusLabel,
  formatDateTimeIt,
}: EmployeeSimulationPanelsProps) {
  if (openTask && openTask.status !== 'completed') {
    return (
      <div className="activity-runner-section">
        <section
          className="user-activity-runner"
          aria-labelledby="task-activity-runner-title"
        >
          <div className="user-activity-runner-toolbar">
            <button type="button" className="btn ghost" onClick={() => setOpenTaskId(null)}>
              Torna indietro
            </button>
          </div>
          <h3 id="task-activity-runner-title" className="user-activity-runner-title">
            {openTask.title}
          </h3>
          <p className="user-activity-runner-desc">{openTask.description}</p>
          <div className="user-activity-runner-block user-activity-runner-block--activity">
            <p className="user-activity-runner-hint">
              Esegui l’attività (ticket IT, presenza welcome HR, checklist interna, ecc.).
              Quando è stata svolta, conferma il completamento qui sotto.
            </p>
          </div>
          <div className="user-activity-runner-footer">
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                const ts = new Date().toISOString()
                patchStep(employee.id, openTask.id, {
                  status: 'completed',
                  ...completionAttachments('task', ts),
                })
                setOpenTaskId(null)
              }}
            >
              Segna completata
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <>
      <section className="steps-section">
        <h3 className="steps-title">Firma documentale</h3>
        <p className="steps-intro">
          Ogni documento richiede accettazione esplicita; la firma è simulata in questa demo
          (integrabile con provider eIDAS / DocuSign).
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
                    <p className="signed-at">Firmato il {formatDateTimeIt(step.signedAt)}</p>
                  )}
                </div>
              </div>
              <div className="step-actions">
                <span className={`pill status-${step.status}`}>{statusLabel(step.status)}</span>
                {step.status !== 'completed' && (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => setSignContext({ employeeId: employee.id, step })}
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
          Avvia il modulo, aggiorna l&apos;avanzamento e completa quando il corso è concluso (es.
          quiz superato o registrazione LMS).
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
                      <span className="hours"> · {step.estimatedHours} h stimate</span>
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
                  <span className={`pill status-${step.status}`}>{statusLabel(step.status)}</span>
                  {step.status !== 'completed' && (
                    <>
                      {step.status === 'pending' && (
                        <button
                          type="button"
                          className="btn"
                          onClick={() =>
                            patchStep(employee.id, step.id, {
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
                              patchStep(employee.id, step.id, {
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
                          onClick={() => {
                            const ts = new Date().toISOString()
                            patchStep(employee.id, step.id, {
                              status: 'completed',
                              trainingProgress: 100,
                              trainingCompletedAt: ts,
                              ...completionAttachments('training', ts),
                            })
                          }}
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
        <ol className="admin-task-grid" aria-label="Attività operative">
          {taskSteps.map((step, index) => (
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
                  <span className="badge task">{labelKind(step.kind)}</span>
                  <strong>{step.title}</strong>
                  <span className={`pill status-${step.status}`}>{statusLabel(step.status)}</span>
                </div>
                <p className="admin-task-cell-desc">{step.description}</p>
                <div className="admin-task-cell-actions">
                  {step.status === 'pending' && (
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => {
                        patchStep(employee.id, step.id, { status: 'in_progress' })
                        setOpenTaskId(step.id)
                      }}
                    >
                      Avvia attività
                    </button>
                  )}
                  {step.status === 'in_progress' && (
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => setOpenTaskId(step.id)}
                    >
                      Continua
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
