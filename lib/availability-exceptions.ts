import { chileLocalDateTimeToISO } from './date'

export type ExceptionScope = 'professional' | 'center' | 'all'

export type AvailabilityException = {
  id: string
  scope: ExceptionScope
  scopeId: string
  date: string
  startTime: string
  endTime: string
  reason: string
  createdAt: string
}

type ProfessionalRef = {
  id: string
  centerId?: string
}

export function isFullDayException(exception: Pick<AvailabilityException, 'startTime' | 'endTime'>): boolean {
  return !exception.startTime || !exception.endTime
}

export function exceptionAppliesTo(
  exception: AvailabilityException,
  professional: ProfessionalRef,
  date: string
): boolean {
  if (exception.date !== date) return false
  if (exception.scope === 'all') return true
  if (exception.scope === 'center') {
    return Boolean(professional.centerId) && exception.scopeId === professional.centerId
  }
  return exception.scopeId === professional.id
}

export function filterExceptionsForDate(
  exceptions: AvailabilityException[],
  professional: ProfessionalRef,
  date: string
): AvailabilityException[] {
  return exceptions.filter((exception) => exceptionAppliesTo(exception, professional, date))
}

export function exceptionsToBusyIntervals(
  exceptions: AvailabilityException[],
  date: string
): Array<{ start: string; end: string }> {
  return exceptions.map((exception) => {
    if (isFullDayException(exception)) {
      return {
        start: chileLocalDateTimeToISO(date, '00:00'),
        end: chileLocalDateTimeToISO(date, '23:59'),
      }
    }
    return {
      start: chileLocalDateTimeToISO(date, exception.startTime),
      end: chileLocalDateTimeToISO(date, exception.endTime),
    }
  })
}
