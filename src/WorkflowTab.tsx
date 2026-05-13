import { useEffect, useMemo, useRef, useState } from 'react'
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
import { loadDocumentTemplates } from './documentTemplateStorage'
import { documentTemplateLabel } from './documentTemplates'
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
  blueprintStepRequiresRequiredDocument,
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
  documentTemplateId: '',
  requiredDocument: '',
}

const SCOPE_LOOKUP = {
  societa: MOCK_COMPANIES,
  team: MOCK_TEAMS,
  ruolo: MOCK_ROLES,
  utenti: MOCK_WORKFLOW_USERS,
} as const

type WizardStep = 1 | 2 | 3

type WizardDraft = {
  name: string
  scopeType: WorkflowScopeType
  targetIds: string[]
  steps: WorkflowBlueprintStep[]
  requireManagerSignature: boolean
  designatedSignerUserId: string
}

function createEmptyDraft(): WizardDraft {
  return {
    name: '',
    scopeType: 'azienda',
    targetIds: [],
    steps: [],
    requireManagerSignature: false,
    designatedSignerUserId: '',
  }
}

function createDraftFromWorkflow(workflow: WorkflowDefinition): WizardDraft {
  const scopeType = workflow.scope.type
  return {
    name: workflow.name,
    scopeType,
    targetIds: scopeType === 'azienda' ? [] : [...workflow.scope.targetIds],
    steps: workflow.steps.map((step) => ({ ...step })),
    requireManagerSignature: workflow.requireManagerSignature ?? false,
    designatedSignerUserId: workflow.designatedSignerUserId ?? '',
  }
}

function buildScope(draft: WizardDraft): WorkflowScope {
  if (draft.scopeType === 'azienda') return { type: 'azienda' }
  return { type: draft.scopeType, targetIds: draft.targetIds }
}

function scopeRequiresTargets(type: WorkflowScopeType): type is keyof typeof SCOPE_LOOKUP {
  return type !== 'azienda'
}

function signingSummary(workflow: WorkflowDefinition): string {
  const parts: string[] = []
  if (workflow.requireManagerSignature) {
    parts.push('Firma manager')
  }
  if (workflow.designatedSignerUserId) {
    const user = MOCK_WORKFLOW_USERS.find((u) => u.id === workflow.designatedSignerUserId)
    parts.push(user ? `Firmatario: ${user.label}` : 'Firmatario designato')
  }
  return parts.length > 0 ? parts.join(' · ') : '—'
}

export default function WorkflowTab() {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])
  const [workflowsReady, setWorkflowsReady] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const workflowsPersistReady = useRef(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null)
  const [wizardStep, setWizardStep] = useState<WizardStep>(1)
  const [draft, setDraft] = useState<WizardDraft>(createEmptyDraft)
  const [draftStep, setDraftStep] = useState(EMPTY_DRAFT_STEP)
  const [documentTemplates, setDocumentTemplates] = useState<Awaited<
    ReturnType<typeof loadDocumentTemplates>
  >>([])

  useEffect(() => {
    if (!wizardOpen) return

    let active = true
    void loadDocumentTemplates().then((templates) => {
      if (active) {
        setDocumentTemplates(templates)
      }
    })

    return () => {
      active = false
    }
  }, [wizardOpen])

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
    if (!workflowsPersistReady.current) {
      workflowsPersistReady.current = true
      return
    }

    void saveWorkflowDefinitions(workflows).then((result) => {
      if (!result.ok) {
        setStorageError(result.error ?? 'Salvataggio workflow non riuscito.')
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
        return Boolean(step.documentTemplateId)
      }
      if (blueprintStepRequiresRequiredDocument(step.kind)) {
        return Boolean(step.requiredDocument?.trim())
      }
      return true
    })

  const draftStepNeedsDocumentTemplate = blueprintStepRequiresDocumentTemplate(draftStep.kind)
  const draftStepNeedsRequiredDocument = blueprintStepRequiresRequiredDocument(draftStep.kind)

  const canAddBlueprintStep =
    draftStep.title.trim().length > 0 &&
    (!draftStepNeedsDocumentTemplate || Boolean(draftStep.documentTemplateId)) &&
    (!draftStepNeedsRequiredDocument || Boolean(draftStep.requiredDocument.trim()))

  function openWizard() {
    setEditingWorkflowId(null)
    setDraft(createEmptyDraft())
    setDraftStep(EMPTY_DRAFT_STEP)
    setWizardStep(1)
    setWizardOpen(true)
  }

  function openWizardForEdit(workflow: WorkflowDefinition) {
    setEditingWorkflowId(workflow.id)
    setDraft(createDraftFromWorkflow(workflow))
    setDraftStep(EMPTY_DRAFT_STEP)
    setWizardStep(1)
    setWizardOpen(true)
  }

  function closeWizard() {
    setWizardOpen(false)
    setEditingWorkflowId(null)
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
          documentTemplateId: draftStepNeedsDocumentTemplate
            ? draftStep.documentTemplateId
            : undefined,
          requiredDocument: draftStepNeedsRequiredDocument
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

    const payload = {
      name: draft.name.trim(),
      scope: buildScope(draft),
      steps: draft.steps,
      requireManagerSignature: draft.requireManagerSignature,
      designatedSignerUserId: draft.designatedSignerUserId.trim() || undefined,
    }

    if (editingWorkflowId) {
      setWorkflows((current) =>
        current.map((workflow) =>
          workflow.id === editingWorkflowId
            ? {
                ...workflow,
                ...payload,
              }
            : workflow
        )
      )
    } else {
      const workflow: WorkflowDefinition = {
        id: newId(),
        ...payload,
        createdAt: new Date().toISOString(),
      }

      setWorkflows((current) => [workflow, ...current])
    }

    closeWizard()
  }

  const isEditingWorkflow = editingWorkflowId !== null

  return (
    <div className="workflow-tab">
      {storageError ? <p className="document-upload-error">{storageError}</p> : null}
      {wizardOpen ? (
        <section className="panel workflow-panel">
          <div className="workflow-wizard">
            <ol className="wizard-steps" aria-label="Passaggi del wizard">
              <li className={wizardStep === 1 ? 'active' : wizardStep > 1 ? 'done' : ''}>
                <span className="wizard-step-index">1</span>
                <span>Ambito</span>
              </li>
              <li className={wizardStep === 2 ? 'active' : wizardStep > 2 ? 'done' : ''}>
                <span className="wizard-step-index">2</span>
                <span>Step del processo</span>
              </li>
              <li className={wizardStep === 3 ? 'active' : ''}>
                <span className="wizard-step-index">3</span>
                <span>Opzioni firma</span>
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
            ) : wizardStep === 2 ? (
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
                          documentTemplateId: blueprintStepRequiresDocumentTemplate(kind)
                            ? current.documentTemplateId
                            : '',
                          requiredDocument: blueprintStepRequiresRequiredDocument(kind)
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
                  {draftStepNeedsDocumentTemplate ? (
                    <label className="wizard-field">
                      Documento
                      <select
                        value={draftStep.documentTemplateId}
                        onChange={(event) =>
                          setDraftStep((current) => ({
                            ...current,
                            documentTemplateId: event.target.value,
                          }))
                        }
                      >
                        <option value="">Seleziona un documento</option>
                        {documentTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {draftStepNeedsDocumentTemplate && documentTemplates.length === 0 ? (
                    <p className="wizard-empty">
                      Nessun documento disponibile. Crea un modello nella tab{' '}
                      <strong>Documenti</strong>.
                    </p>
                  ) : null}
                  {draftStepNeedsRequiredDocument ? (
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
                        placeholder="Es. Certificato medico"
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
                          {step.documentTemplateId ? (
                            <p className="blueprint-step-doc">
                              Documento:{' '}
                              {documentTemplateLabel(documentTemplates, step.documentTemplateId) ??
                                'Modello non disponibile'}
                            </p>
                          ) : null}
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
                    onClick={() => setWizardStep(3)}
                  >
                    Avanti
                  </button>
                </div>
              </div>
            ) : (
              <div className="wizard-panel">
                <fieldset className="wizard-signing-fieldset">
                  <legend>Firme aggiuntive</legend>
                  <p className="wizard-signing-intro">
                    Opzioni per richiedere firme oltre a quella del dipendente o del soggetto
                    principale del flusso.
                  </p>
                  <label className="wizard-check">
                    <input
                      type="checkbox"
                      checked={draft.requireManagerSignature}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          requireManagerSignature: event.target.checked,
                        }))
                      }
                    />
                    Richiedi anche la firma del manager
                  </label>
                  <label className="wizard-field">
                    Utente che deve firmare (opzionale)
                    <select
                      value={draft.designatedSignerUserId}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          designatedSignerUserId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Nessuno</option>
                      {MOCK_WORKFLOW_USERS.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>

                <div className="wizard-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setWizardStep(2)}
                  >
                    Indietro
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={!canSaveWorkflow}
                    onClick={saveWorkflow}
                  >
                    {isEditingWorkflow ? 'Salva modifiche' : 'Salva workflow'}
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
                      <th scope="col">Firme</th>
                      <th scope="col">Creato</th>
                      <th scope="col" className="col-action">
                        <span className="sr-only">Azione</span>
                      </th>
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
                        <td className="workflow-signing-cell">{signingSummary(workflow)}</td>
                        <td className="nowrap">
                          {new Date(workflow.createdAt).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="col-action">
                          <button
                            type="button"
                            className="btn ghost btn-compact"
                            onClick={() => openWizardForEdit(workflow)}
                          >
                            Modifica
                          </button>
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
