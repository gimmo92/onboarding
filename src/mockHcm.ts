import type { HcmEmployee } from './types'

/** Dati di esempio: in integrazione reale arrivano dal contesto HCM. */
export const MOCK_HCM_EMPLOYEES: HcmEmployee[] = [
  {
    id: 'hcm-001',
    firstName: 'Giulia',
    lastName: 'Ferretti',
    email: 'giulia.ferretti@azienda.it',
    referenceDate: '2026-05-20',
    role: 'Product Designer',
    team: 'Design',
  },
  {
    id: 'hcm-002',
    firstName: 'Marco',
    lastName: 'Vitale',
    email: 'marco.vitale@azienda.it',
    referenceDate: '2026-05-12',
    role: 'Senior Backend',
    team: 'Engineering',
  },
  {
    id: 'hcm-003',
    firstName: 'Elena',
    lastName: 'Sartori',
    email: 'elena.sartori@azienda.it',
    referenceDate: '2026-06-01',
    role: 'HR Business Partner',
    team: 'People',
  },
  {
    id: 'hcm-004',
    firstName: 'Andrea',
    lastName: 'Colombo',
    email: 'andrea.colombo@azienda.it',
    referenceDate: '2026-05-30',
    role: 'Account Executive',
    team: 'Sales',
  },
]
