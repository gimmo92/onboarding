export type WorkflowScopeType = 'azienda' | 'societa' | 'team' | 'ruolo' | 'utenti'

export type WorkflowBlueprintStepKind = 'document_sign' | 'document_upload' | 'activity'

export type WorkflowBlueprintStep = {
  id: string
  kind: WorkflowBlueprintStepKind
  title: string
  description: string
  documentTemplateId?: string
  requiredDocument?: string
}

export type WorkflowScope =
  | { type: 'azienda' }
  | { type: 'societa'; targetIds: string[] }
  | { type: 'team'; targetIds: string[] }
  | { type: 'ruolo'; targetIds: string[] }
  | { type: 'utenti'; targetIds: string[] }

export type WorkflowDefinition = {
  id: string
  name: string
  scope: WorkflowScope
  steps: WorkflowBlueprintStep[]
  createdAt: string
  /** Se true, il flusso richiede anche la firma del manager */
  requireManagerSignature?: boolean
  /** Utente designato che deve firmare (ID da elenco utenti workflow) */
  designatedSignerUserId?: string
}

export type ScopeOption = {
  id: string
  label: string
}

export const WORKFLOW_SCOPE_OPTIONS: {
  type: WorkflowScopeType
  label: string
  hint: string
}[] = [
  {
    type: 'azienda',
    label: 'Azienda',
    hint: 'Il processo viene assegnato a tutta l’organizzazione.',
  },
  {
    type: 'societa',
    label: 'Società',
    hint: 'Limita il processo a una o più società del gruppo.',
  },
  {
    type: 'team',
    label: 'Team',
    hint: 'Applica il processo a team come Amministrazione o Vendite.',
  },
  {
    type: 'ruolo',
    label: 'Ruolo',
    hint: 'Rivolgi il processo a ruoli organizzativi specifici.',
  },
  {
    type: 'utenti',
    label: 'Utenti',
    hint: 'Assegna il processo a singole persone, ad esempio Mario Rossi.',
  },
]

export function blueprintStepKindLabel(kind: WorkflowBlueprintStepKind): string {
  switch (kind) {
    case 'document_sign':
      return 'Firma documento'
    case 'document_upload':
      return 'Caricamento documenti'
    default:
      return 'Attività'
  }
}

export function blueprintStepRequiresDocumentTemplate(
  kind: WorkflowBlueprintStepKind
): boolean {
  return kind === 'document_sign'
}

export function blueprintStepRequiresRequiredDocument(
  kind: WorkflowBlueprintStepKind
): boolean {
  return kind === 'document_upload'
}

export function workflowScopeTypeLabel(type: WorkflowScopeType): string {
  return WORKFLOW_SCOPE_OPTIONS.find((option) => option.type === type)?.label ?? type
}

export function summarizeWorkflowScope(
  scope: WorkflowScope,
  lookup: Record<Exclude<WorkflowScopeType, 'azienda'>, ScopeOption[]>
): string {
  if (scope.type === 'azienda') return 'Tutta l’azienda'

  const options = lookup[scope.type]
  const labels = scope.targetIds
    .map((id) => options.find((option) => option.id === id)?.label)
    .filter(Boolean)

  return labels.length ? labels.join(', ') : 'Nessuna selezione'
}
