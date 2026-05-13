import type { StepKind, WorkflowStep } from './types'

export function completionAttachments(
  kind: StepKind,
  uploadedAt: string
): Pick<WorkflowStep, 'attachments'> {
  if (kind === 'document') {
    return {
      attachments: [{ fileName: 'Documento_accettazione.pdf', uploadedAt }],
    }
  }
  if (kind === 'training') {
    return {
      attachments: [{ fileName: 'Attestato_corso.pdf', uploadedAt }],
    }
  }
  return {
    attachments: [{ fileName: 'Evidenza_attivita.pdf', uploadedAt }],
  }
}
