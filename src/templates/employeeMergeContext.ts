import type { HcmEmployee } from '../types'

export type MergeContext = {
  dipendente: {
    nome: string
    cognome: string
    codice_fiscale: string
    data_nascita: string
    luogo_nascita: string
    indirizzo: string
    email: string
    telefono: string
  }
  contratto: {
    data_assunzione: string
    ruolo: string
    livello_ccnl: string
    ral: string
    sede: string
    tipo_contratto: string
    scadenza_periodo_prova: string
  }
  manager: {
    manager_nome: string
    manager_cognome: string
    manager_email: string
  }
  azienda: {
    ragione_sociale: string
    piva: string
    sede_legale: string
    legale_rappresentante: string
  }
  sistema: {
    data_oggi: string
    anno_corrente: string
  }
}

function formatDateIt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function buildSampleMergeContext(referenceDate = new Date()): MergeContext {
  const dataOggi = formatDateIt(referenceDate.toISOString())
  return {
    dipendente: {
      nome: 'Mario',
      cognome: 'Rossi',
      codice_fiscale: 'RSSMRA85M01F205X',
      data_nascita: '01/08/1985',
      luogo_nascita: 'Milano',
      indirizzo: 'Via Roma 12, 20121 Milano',
      email: 'mario.rossi@azienda.it',
      telefono: '+39 333 1234567',
    },
    contratto: {
      data_assunzione: dataOggi,
      ruolo: 'Specialista amministrativo',
      livello_ccnl: 'C2',
      ral: '32.000 €',
      sede: 'Milano',
      tipo_contratto: 'Tempo indeterminato',
      scadenza_periodo_prova: '12/08/2026',
    },
    manager: {
      manager_nome: 'Laura',
      manager_cognome: 'Bianchi',
      manager_email: 'laura.bianchi@azienda.it',
    },
    azienda: {
      ragione_sociale: 'Azienda Demo S.p.A.',
      piva: '12345678901',
      sede_legale: 'Via Verdi 8, 20121 Milano',
      legale_rappresentante: 'Paolo Verdi',
    },
    sistema: {
      data_oggi: dataOggi,
      anno_corrente: String(referenceDate.getFullYear()),
    },
  }
}

export function buildMergeContextFromHcm(employee: HcmEmployee, referenceDate = new Date()): MergeContext {
  const sample = buildSampleMergeContext(referenceDate)
  return {
    ...sample,
    dipendente: {
      ...sample.dipendente,
      nome: employee.firstName,
      cognome: employee.lastName,
      email: employee.email,
    },
    contratto: {
      ...sample.contratto,
      data_assunzione: formatDateIt(employee.referenceDate),
      ruolo: employee.role,
      sede: employee.team,
    },
  }
}
