import type { WorkflowDefinition } from './workflowBuilder'
import { loadCollection, saveCollection } from './lib/collectionStorage'

const TABLE = 'onboarding_workflows'
const KEY = 'hr-workflow-templates:v1'

function isWorkflowDefinition(value: unknown): value is WorkflowDefinition {
  if (!value || typeof value !== 'object') {
    return false
  }

  const workflow = value as WorkflowDefinition
  return (
    typeof workflow.id === 'string' &&
    typeof workflow.name === 'string' &&
    typeof workflow.createdAt === 'string' &&
    typeof workflow.scope === 'object' &&
    workflow.scope !== null &&
    Array.isArray(workflow.steps)
  )
}

export function loadWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
  return loadCollection(TABLE, KEY, isWorkflowDefinition)
}

export function saveWorkflowDefinitions(list: WorkflowDefinition[]): Promise<boolean> {
  return saveCollection(TABLE, KEY, list, isWorkflowDefinition)
}
