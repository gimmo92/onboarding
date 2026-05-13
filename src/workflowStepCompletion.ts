import type { Employee, StepKind, WorkflowStep } from './types'

export type CompletionAttachmentOptions = {
  documentFileName?: string
  trainingFileName?: string
  taskFileName?: string
}

export function completionAttachments(
  kind: StepKind,
  uploadedAt: string,
  options?: CompletionAttachmentOptions
): Pick<WorkflowStep, 'attachments'> {
  if (kind === 'document') {
    return {
      attachments: [
        {
          fileName: options?.documentFileName ?? 'Documento_accettazione.pdf',
          uploadedAt,
        },
      ],
    }
  }
  if (kind === 'training') {
    return {
      attachments: [
        {
          fileName: options?.trainingFileName ?? 'Attestato_corso.pdf',
          uploadedAt,
        },
      ],
    }
  }
  return {
    attachments: [
      {
        fileName: options?.taskFileName ?? 'Evidenza_attivita.pdf',
        uploadedAt,
      },
    ],
  }
}

const GIULIA_HCM_ID = 'hcm-001'

function demoAttachmentName(step: WorkflowStep): string {
  const cleaned = step.title
    .trim()
    .replace(/[/\\?%*:|"<>#]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 72)
  const base = cleaned || 'Documento'
  return `${base}_firmato_demo.pdf`
}

/**
 * Demo HCM Giulia Ferretti: prime due attività onboarding già completate,
 * con allegato scaricabile dalla vista HR (dialog «Visualizza»).
 */
export function applyDemoGiuliaOnboardingProgress(employee: Employee): Employee {
  if (employee.hcmEmployeeId !== GIULIA_HCM_ID || employee.flow !== 'onboarding') {
    return employee
  }

  let changed = false
  const steps = employee.steps.map((step, index) => {
    if (index > 1) return step

    const hasAttachments = (step.attachments?.length ?? 0) > 0
    const docOk = step.kind !== 'document' || Boolean(step.signedAt)
    const already = step.status === 'completed' && hasAttachments && docOk

    if (already) return step

    changed = true
    const uploadedAt =
      index === 0 ? '2026-05-12T09:15:00.000Z' : '2026-05-12T09:18:00.000Z'
    const name = demoAttachmentName(step)

    return {
      ...step,
      status: 'completed' as const,
      signedAt: step.kind === 'document' ? uploadedAt : step.signedAt,
      trainingProgress: step.kind === 'training' ? 100 : step.trainingProgress,
      trainingCompletedAt: step.kind === 'training' ? uploadedAt : step.trainingCompletedAt,
      ...completionAttachments(step.kind, uploadedAt, {
        documentFileName: step.kind === 'document' ? name : undefined,
        trainingFileName: step.kind === 'training' ? name : undefined,
        taskFileName: step.kind === 'task' ? name : undefined,
      }),
    }
  })

  return changed ? { ...employee, steps } : employee
}
