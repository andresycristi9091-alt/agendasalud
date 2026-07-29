// Feriados irrenunciables y nacionales de Chile.
// Fuente: Ley 2.977, Ley 19.973 y leyes de feriados movibles (Ley 19.668 / 20.299).
// Los feriados movibles ya vienen desplazados al dia que rige ese ano.
// El administrador puede editar o eliminar cualquiera desde el panel de bloqueos.

export type ChileHoliday = {
  date: string
  name: string
}

const HOLIDAYS_BY_YEAR: Record<number, ChileHoliday[]> = {
  2026: [
    { date: '2026-01-01', name: 'Ano Nuevo' },
    { date: '2026-04-03', name: 'Viernes Santo' },
    { date: '2026-04-04', name: 'Sabado Santo' },
    { date: '2026-05-01', name: 'Dia del Trabajo' },
    { date: '2026-05-21', name: 'Glorias Navales' },
    { date: '2026-06-21', name: 'Dia de los Pueblos Indigenas' },
    { date: '2026-06-29', name: 'San Pedro y San Pablo' },
    { date: '2026-07-16', name: 'Virgen del Carmen' },
    { date: '2026-08-15', name: 'Asuncion de la Virgen' },
    { date: '2026-09-18', name: 'Independencia Nacional' },
    { date: '2026-09-19', name: 'Glorias del Ejercito' },
    { date: '2026-10-12', name: 'Encuentro de Dos Mundos' },
    { date: '2026-10-31', name: 'Iglesias Evangelicas y Protestantes' },
    { date: '2026-11-01', name: 'Dia de Todos los Santos' },
    { date: '2026-12-08', name: 'Inmaculada Concepcion' },
    { date: '2026-12-25', name: 'Navidad' },
  ],
  2027: [
    { date: '2027-01-01', name: 'Ano Nuevo' },
    { date: '2027-03-26', name: 'Viernes Santo' },
    { date: '2027-03-27', name: 'Sabado Santo' },
    { date: '2027-05-01', name: 'Dia del Trabajo' },
    { date: '2027-05-21', name: 'Glorias Navales' },
    { date: '2027-06-21', name: 'Dia de los Pueblos Indigenas' },
    { date: '2027-06-28', name: 'San Pedro y San Pablo' },
    { date: '2027-07-16', name: 'Virgen del Carmen' },
    { date: '2027-08-15', name: 'Asuncion de la Virgen' },
    { date: '2027-09-17', name: 'Feriado adicional Fiestas Patrias' },
    { date: '2027-09-18', name: 'Independencia Nacional' },
    { date: '2027-09-19', name: 'Glorias del Ejercito' },
    { date: '2027-10-11', name: 'Encuentro de Dos Mundos' },
    { date: '2027-10-31', name: 'Iglesias Evangelicas y Protestantes' },
    { date: '2027-11-01', name: 'Dia de Todos los Santos' },
    { date: '2027-12-08', name: 'Inmaculada Concepcion' },
    { date: '2027-12-25', name: 'Navidad' },
  ],
}

export function getChileHolidays(year: number): ChileHoliday[] {
  return HOLIDAYS_BY_YEAR[year] ?? []
}

export function getSupportedHolidayYears(): number[] {
  return Object.keys(HOLIDAYS_BY_YEAR).map(Number).sort()
}
