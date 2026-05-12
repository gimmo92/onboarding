import { useEffect, useMemo, useState } from 'react'
import {
  MOCK_COMPANIES,
  MOCK_ROLES,
  MOCK_TEAMS,
  MOCK_WORKFLOW_USERS,
} from './mockWorkflowScope'
import {
  loadWorkflowDefinitions,
  saveWorkflowDefinitions,
} from './workflowTemplateStorage'
import type {
  WorkflowBlueprintStep,
  WorkflowBlueprintStepKind,
  WorkflowDefinition,
  WorkflowScope,
  WorkflowScopeType,
} from './workflowBuilder'
import {
  WORKFLOW_SCOPE_OPTIONS,
  blueprintStepKindLabel,
  blueprintStepRequiresDocumentTemplate,
  summarizeWorkflowScope,
  workflowScopeTypeLabel,
} from './workflowBuilder'

function newId(): string {
  return crypto.randomUUID()
}

const EMPTY_DRAFT_STEP = {
  kind: 'document_sign' as WorkflowBlueprintStepKind,
  title: '',
  description: '',
  requiredDocument: '',
}

const SCOPE_LOOKUP = {
  societa: MOCK_COMPANIES,
  team: MOCK_TEAMS,
  ruolo: MOCK_ROLES,
  utenti: MOCK_WORKFLOW_USERS,
} as const

type WizardStep = 1 | 2

type WizardDraft = {
  name: string
  scopeType: WorkflowScopeType
  targetIds: string[]
  steps: WorkflowBlueprintStep[]
}

function createEmptyDraft(): WizardDraft {
  return {
    name: '',
    scopeType: 'azienda',
    targetIds: [],
    steps: [],
  }
}

function buildScope(draft: WizardDraft): WorkflowScope {
  if (draft.scopeType === 'azienda') return { type: 'azienda' }
  return { type: draft.scopeType, targetIds: draft.targetIds }
}

function scopeRequiresTargets(type: WorkflowScopeType): type is keyof typeof SCOPE_LOOKUP {
  return type !== 'azienda'
}

export default function WorkflowTab() {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])
  const [workflowsReady, setWorkflowsReady] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState<WizardStep>(1)
  const [draft, setDraft] = useState<WizardDraft>(createEmptyDraft)
  const [draftStep, setDraftStep] = useState(EMPTY_DRAFT_STEP)

  useEffect(() => {
    let active = true

    loadWorkflowDefinitions()
      .then((list) => {
        if (!active) return
        setWorkflows(list)
        setWorkflowsReady(true)
      })
      .catch(() => {
        if (!active) return
        setStorageError('Caricamento workflow non riuscito.')
        setWorkflowsReady(true)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!workflowsReady) return

    void saveWorkflowDefinitions(workflows).then((saved) => {
      if (!saved) {
        setStorageError('Salvataggio workflow non riuscito.')
      }
    })
  }, [workflows, workflowsReady])

  const scopeOptions = useMemo(() => {
    if (!scopeRequiresTargets(draft.scopeType)) return []
    return SCOPE_LOOKUP[draft.scopeType]
  }, [draft.scopeType])

  const scopeSelectionValid =
    draft.scopeType === 'azienda' || draft.targetIds.length > 0

  const canContinueStepOne = draft.name.trim().length > 0 && scopeSelectionValid

  const canSaveWorkflow =
    draft.steps.length > 0 &&
    draft.steps.every((step) => {
      if (!step.title.trim()) return false
      if (blueprintStepRequiresDocumentTemplate(step.kind)) {
        return Boolean(step.requiredDocument?.trim())
      }
      return true
    })

  const draftStepNeedsDocument = blueprintStepRequiresDocumentTemplate(draftStep.kind)

  const canAddBlueprintStep =
    draftStep.title.trim().length > 0 &&
    (!draftStepNeedsDocument || Boolean(draftStep.requiredDocument.trim()))

  function openWizard() {
    setDraft(createEmptyDraft())
    setDraftStep(EMPTY_DRAFT_STEP)
    setWizardStep(1)
    setWizardOpen(true)
  }

  function closeWizard() {
    setWizardOpen(false)
    setWizardStep(1)
    setDraft(createEmptyDraft())
    setDraftStep(EMPTY_DRAFT_STEP)
  }

  function changeScopeType(type: WorkflowScopeType) {
    setDraft((current) => ({
      ...current,
      scopeType: type,
      targetIds: [],
    }))
  }

  function changeTargetId(targetId: string) {
    setDraft((current) => ({
      ...current,
      targetIds: targetId ? [targetId] : [],
    }))
  }

  function addBlueprintStep() {
    if (!canAddBlueprintStep) return

    const title = draftStep.title.trim()

    setDraft((current) => ({
      ...current,
      steps: [
        ...current.steps,
        {
          id: newId(),
          kind: draftStep.kind,
          title,
          description: draftStep.description.trim(),
          requiredDocument: draftStepNeedsDocument
            ? draftStep.requiredDocument.trim()
            : undefined,
        },
      ],
    }))
    setDraftStep(EMPTY_DRAFT_STEP)
  }

  function removeBlueprintStep(stepId: string) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.filter((step) => step.id !== stepId),
    }))
  }

  function saveWorkflow() {
    if (!canSaveWorkflow) return

    const workflow: WorkflowDefinition = {
      id: newId(),
      name: draft.name.trim(),
      scope: buildScope(draft),
      steps: draft.steps,
      createdAt: new Date().toISOString(),
    }

    setWorkflows((current) => [workflow, ...current])
    closeWizard()
  }

  return (
    <div className="workflow-tab">
      {storageError ? <p className="document-upload-error">{storageError}</p> : null}
      {wizardOpen ? (
        <section className="panel workflow-panel">
          <div className="workflow-wizard">
            <ol className="wizard-steps" aria-label="Passaggi del wizard">
              <li className={wizardStep === 1 ? 'active' : 'done'}>
                <span className="wizard-step-index">1</span>
                <span>Ambito</span>
              </li>
              <li className={wizardStep === 2 ? 'active' : ''}>
                <span className="wizard-step-index">2</span>
                <span>Step del processo</span>
              </li>
            </ol>

            {wizardStep === 1 ? (
              <div className="wizard-panel">
                <label className="wizard-field">
                  Nome workflow
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Es. Onboarding amministrativo"
                  />
                </label>

                <label className="wizard-field">
                  Ambito
                  <select
                    value={draft.scopeType}
                    onChange={(event) =>
                      changeScopeType(event.target.value as WorkflowScopeType)
                    }
                  >
                    {WORKFLOW_SCOPE_OPTIONS.map((option) => (
                      <option key={option.type} value={option.type}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {scopeRequiresTargets(draft.scopeType) ? (
                  <label className="wizard-field">
                    {workflowScopeTypeLabel(draft.scopeType)}
                    <select
                      value={draft.targetIds[0] ?? ''}
                      onChange={(event) => changeTargetId(event.target.value)}
                    >
                      <option value="">Seleziona un valore</option>
                      {scopeOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <div className="wizard-actions">
                  <button type="button" className="btn ghost" onClick={closeWizard}>
                    Annulla
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={!canContinueStepOne}
                    onClick={() => setWizardStep(2)}
                  >
                    Avanti
                  </button>
                </div>
              </div>
            ) : (
              <div className="wizard-panel">
                <div className="blueprint-builder">
                  <label className="wizard-field">
                    Tipo step
                    <select
                      value={draftStep.kind}
                      onChange={(event) => {
                        const kind = event.target.value as WorkflowBlueprintStepKind
                        setDraftStep((current) => ({
                          ...current,
                          kind,
                          requiredDocument: blueprintStepRequiresDocumentTemplate(kind)
                            ? current.requiredDocument
                            : '',
                        }))
                      }}
                    >
                      <option value="document_sign">Firma documento</option>
                      <option value="document_upload">Caricamento documenti</option>
                      <option value="activity">Attività</option>
                    </select>
                  </label>
                  {draftStepNeedsDocument ? (
                    <label className="wizard-field">
                      Documento richiesto
                      <input
                        type="text"
                        value={draftStep.requiredDocument}
                        onChange={(event) =>
                          setDraftStep((current) => ({
                            ...current,
                            requiredDocument: event.target.value,
                          }))
                        }
                        placeholder="Es. Contratto di assunzione"
                      />
                    </label>
                  ) : null}
                  <label className="wizard-field">
                    Titolo step
                    <input
                      type="text"
                      value={draftStep.title}
                      onChange={(event) =>
                        setDraftStep((current) => ({ ...current, title: event.target.value }))
                      }
                      placeholder="Es. Firma contratto"
                    />
                  </label>
                  <label className="wizard-field">
                    Descrizione
                    <textarea
                      rows={3}
                      value={draftStep.description}
                      onChange={(event) =>
                        setDraftStep((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Istruzioni operative per chi esegue lo step"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn"
                    disabled={!canAddBlueprintStep}
                    onClick={addBlueprintStep}
                  >
                    Aggiungi step
                  </button>
                </div>

                {draft.steps.length === 0 ? (
                  <p className="wizard-empty">Aggiungi almeno uno step al processo.</p>
                ) : (
                  <ol className="blueprint-step-list">
                    {draft.steps.map((step, index) => (
                      <li key={step.id} className="blueprint-step-card">
                        <div>
                          <span className="blueprint-step-index">Step {index + 1}</span>
                          <strong>{step.title}</strong>
                          <p className="blueprint-step-kind">
                            {blueprintStepKindLabel(step.kind)}
                          </p>
                          {step.requiredDocument ? (
                            <p className="blueprint-step-doc">
                              Documento richiesto: {step.requiredDocument}
                            </p>
                          ) : null}
                          {step.description ? (
                            <p className="blueprint-step-desc">{step.description}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="btn ghost btn-compact"
                          onClick={() => removeBlueprintStep(step.id)}
                        >
                          Rimuovi
                        </button>
                      </li>
                    ))}
                  </ol>
                )}

                <div className="wizard-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setWizardStep(1)}
                  >
                    Indietro
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={!canSaveWorkflow}
                    onClick={saveWorkflow}
                  >
                    Salva workflow
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          <section className="panel workflow-panel">
            <div className="workflow-head">
              <div>
                <h2>Crea workflow</h2>
                <p className="hcm-hint">
                  Definisci un nuovo processo con ambito organizzativo e sequenza di step
                  operativi.
                </p>
              </div>
              <button type="button" className="btn primary" onClick={openWizard}>
                Crea workflow
              </button>
            </div>
          </section>

          <section className="panel workflow-panel">
            <h2 className="workflow-list-title">Workflow configurati</h2>
            {workflows.length === 0 ? (
              <p className="workflow-empty">
                Nessun workflow configurato. Usa <strong>Crea workflow</strong> per avviare il
                wizard.
              </p>
            ) : (
              <div className="table-scroll">
                <table className="hcm-table">
                  <thead>
                    <tr>
                      <th scope="col">Nome</th>
                      <th scope="col">Ambito</th>
                      <th scope="col">Step</th>
                      <th scope="col">Creato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflows.map((workflow) => (
                      <tr key={workflow.id}>
                        <td>{workflow.name}</td>
                        <td>
                          {workflowScopeTypeLabel(workflow.scope.type)}
                          {workflow.scope.type !== 'azienda' ? (
                            <>
                              <span className="workflow-scope-sep">·</span>
                              <span className="workflow-scope-detail">
                                {summarizeWorkflowScope(workflow.scope, SCOPE_LOOKUP)}
                              </span>
                            </>
                          ) : null}
                        </td>
                        <td className="nowrap">{workflow.steps.length}</td>
                        <td className="nowrap">
                          {new Date(workflow.createdAt).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
