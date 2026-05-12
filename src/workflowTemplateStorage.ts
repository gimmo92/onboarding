import type { WorkflowDefinition } from './workflowBuilder'

const KEY = 'hr-workflow-templates:v1'

export function loadWorkflowDefinitions(): WorkflowDefinition[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as unknown
    return Array.isArray(data) ? (data as WorkflowDefinition[]) : []
  } catch {
    return []
  }
}

export function saveWorkflowDefinitions(list: WorkflowDefinition[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
}
