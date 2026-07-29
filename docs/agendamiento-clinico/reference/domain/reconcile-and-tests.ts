/**
 * REFERENCIA A — Reconciliación de plantillas ↔ slots
 *
 * El escenario que genera la mayoría de los tickets de soporte:
 * alguien modifica una plantilla de agenda y hay pacientes ya agendados
 * en horarios que la nueva plantilla ya no contempla.
 *
 * La respuesta NUNCA es borrar. Es marcar `conflicted` y escalar a un humano.
 * Ver docs/invariantes.md I-07.
 */

import { RRule } from 'rrule';
import { Temporal } from '@js-temporal/polyfill';

export interface ReconcileResult {
  created: SlotDraft[];
  deleted: string[];
  conflicted: ConflictedSlot[];   // ← requieren decisión humana
  unchanged: number;
}

export interface ConflictedSlot {
  slotId: string;
  appointmentId: string;
  patientId: string;
  currentPeriod: Interval;
  reason: 'outside_new_hours' | 'duration_changed'
        | 'day_removed' | 'location_changed' | 'template_deactivated';
  suggestedAlternatives: SlotDraft[];
}

export function reconcile(
  template: ScheduleTemplate,
  existing: ExistingSlot[],
  window: { from: Temporal.PlainDate; to: Temporal.PlainDate },
  timezone: string,
): ReconcileResult {
  const desired = expandTemplate(template, window, timezone);

  const desiredByKey = new Map(desired.map((s) => [periodKey(s.period), s]));
  const existingByKey = new Map(existing.map((s) => [periodKey(s.period), s]));

  const created: SlotDraft[] = [];
  const deleted: string[] = [];
  const conflicted: ConflictedSlot[] = [];
  let unchanged = 0;

  for (const [key, slot] of desiredByKey) {
    if (!existingByKey.has(key)) created.push(slot);
    else unchanged++;
  }

  for (const [key, slot] of existingByKey) {
    if (desiredByKey.has(key)) continue;

    if (slot.appointmentId === null) {
      // Slot libre que ya no corresponde: se elimina sin ceremonia.
      deleted.push(slot.id);
    } else {
      // ★ El caso importante ★
      conflicted.push({
        slotId: slot.id,
        appointmentId: slot.appointmentId,
        patientId: slot.patientId!,
        currentPeriod: slot.period,
        reason: classifyConflict(slot, template, timezone),
        suggestedAlternatives: findNearest(desired, slot.period, 3),
      });
    }
  }

  return { created, deleted, conflicted, unchanged };
}

/**
 * Expansión de RRULE en la zona horaria de la sede.
 *
 * ⚠️ Punto crítico de correctitud temporal (invariante I-06).
 * La recurrencia se expande en HORA LOCAL y recién después se convierte a UTC.
 * Hacerlo al revés produce slots desfasados una hora tras cada cambio de
 * horario de verano — un bug silencioso que solo aparece dos veces al año.
 */
export function expandTemplate(
  template: ScheduleTemplate,
  window: { from: Temporal.PlainDate; to: Temporal.PlainDate },
  timezone: string,
): SlotDraft[] {
  const rule = RRule.fromString(template.rrule);
  const occurrences = rule.between(
    toUtcDate(window.from), toUtcDate(window.to), true,
  );

  const slots: SlotDraft[] = [];

  for (const occurrence of occurrences) {
    const day = Temporal.PlainDate.from({
      year: occurrence.getUTCFullYear(),
      month: occurrence.getUTCMonth() + 1,
      day: occurrence.getUTCDate(),
    });

    if (day.since(template.validFrom).days < 0) continue;
    if (template.validTo && day.since(template.validTo).days > 0) continue;

    // Construcción en zona local. La conversión a instante ocurre aquí,
    // aplicando las reglas DST vigentes para esa fecha concreta.
    let cursor = day.toZonedDateTime({
      timeZone: timezone,
      plainTime: template.localStart,
    });
    const dayEnd = day.toZonedDateTime({
      timeZone: timezone,
      plainTime: template.localEnd,
    });

    while (Temporal.ZonedDateTime.compare(cursor, dayEnd) < 0) {
      const next = cursor.add(template.slotDuration);
      if (Temporal.ZonedDateTime.compare(next, dayEnd) > 0) break;

      slots.push({
        templateId: template.id,
        templateVersion: template.version,
        practitionerId: template.practitionerId,
        locationId: template.locationId,
        serviceIds: template.serviceIds,
        period: { start: cursor.toInstant(), end: next.toInstant() },
      });

      cursor = next;
    }
  }

  return slots;
}

// ═══════════════════════════════════════════════════════════════════════
// REFERENCIA B — Pruebas basadas en propiedades
//
// El dominio de agendamiento es exactamente donde las pruebas por ejemplos
// dejan huecos: los bugs viven en combinaciones que nadie escribiría a mano.
// Estas pruebas son OBLIGATORIAS para todo cambio en packages/domain.
// ═══════════════════════════════════════════════════════════════════════

import fc from 'fast-check';
import { describe, expect, test } from 'vitest';

describe('propiedades del motor de agendamiento', () => {

  test('I-01 · ninguna secuencia de operaciones produce slots solapados', () => {
    fc.assert(
      fc.property(arbTemplate(), arbOperations(), (template, ops) => {
        const engine = new SchedulingEngine(template);
        ops.forEach((op) => engine.apply(op));

        const byPractitioner = groupBy(
          engine.activeSlots().filter((s) => !s.overbook),
          (s) => s.practitionerId,
        );

        return Object.values(byPractitioner).every(noOverlaps);
      }),
      { numRuns: 2000 },
    );
  });

  test('I-06 · el cambio de horario de verano preserva la hora local', () => {
    // Zonas del hemisferio sur incluidas a propósito: el cambio ocurre en
    // meses opuestos y es donde más se rompe la lógica escrita pensando
    // solo en Europa o Norteamérica.
    const zones = ['America/Santiago', 'America/Sao_Paulo',
                   'Europe/Madrid', 'Australia/Sydney', 'Pacific/Auckland'];

    fc.assert(
      fc.property(arbTemplate(), fc.constantFrom(...zones), (template, tz) => {
        const slots = expandTemplate(template, dstTransitionWindow(tz), tz);

        return slots.every((s) => {
          const local = s.period.start.toZonedDateTimeISO(tz);
          const offsetMinutes = minutesSince(template.localStart, local);
          // Todo slot empieza en un múltiplo exacto de la duración
          // contado desde la hora local de inicio de la plantilla.
          return offsetMinutes % template.slotDuration.total('minutes') === 0;
        });
      }),
      { numRuns: 1000 },
    );
  });

  test('I-07 · reconciliar nunca reduce el número de citas activas', () => {
    fc.assert(
      fc.property(
        arbTemplate(), arbTemplateEdit(), arbBookedSlots(),
        (template, edit, booked) => {
          const before = booked.filter((s) => s.appointmentId !== null).length;
          const result = reconcile(applyEdit(template, edit), booked,
                                   defaultWindow(), 'America/Santiago');

          // Ningún slot con cita puede aparecer en `deleted`.
          const deletedWithAppointment = result.deleted.filter((id) =>
            booked.find((s) => s.id === id)?.appointmentId !== null,
          );

          const after = before - deletedWithAppointment.length;
          return deletedWithAppointment.length === 0 && after === before;
        },
      ),
      { numRuns: 1500 },
    );
  });

  test('I-02 · cancelar y reagendar conserva exactamente una cita activa', () => {
    fc.assert(
      fc.property(arbAppointment(), arbRescheduleChain(), (appt, chain) => {
        let state = [appt];
        chain.forEach((step) => { state = applyReschedule(state, step); });

        const active = state.filter((a) =>
          ['booked', 'confirmed', 'arrived', 'in_progress'].includes(a.status),
        );
        return active.length === 1;
      }),
      { numRuns: 2000 },
    );
  });

  test('máquina de estados: no existe camino a un estado terminal desde otro terminal', () => {
    const terminal = ['fulfilled', 'cancelled', 'noshow'];
    fc.assert(
      fc.property(arbTransitionSequence(), (seq) => {
        let status = 'requested';
        for (const t of seq) {
          if (terminal.includes(status)) {
            // Desde un estado terminal, toda transición debe ser rechazada.
            return !isTransitionAllowed(status, t.to);
          }
          if (isTransitionAllowed(status, t.to)) status = t.to;
        }
        return true;
      }),
      { numRuns: 5000 },
    );
  });
});

/**
 * Prueba de contención — se ejecuta con Testcontainers contra Postgres real.
 * Las pruebas unitarias NO detectan condiciones de carrera.
 */
describe('contención real sobre la base de datos', () => {
  test('500 reservas concurrentes sobre 50 slots producen exactamente 50 citas', async () => {
    const { db, slots } = await seedContentionScenario({ slotCount: 50 });

    const results = await Promise.allSettled(
      Array.from({ length: 500 }, (_, i) =>
        bookingService.book(
          { holdId: holds[i % 50].id, patientId: patients[i].id, /* ... */ },
          `test-key-${i}`,
        ),
      ),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const rejected  = results.filter(
      (r) => r.status === 'rejected' && r.reason instanceof SlotTakenError,
    );

    expect(succeeded).toHaveLength(50);
    expect(rejected).toHaveLength(450);           // todos con error de dominio
    expect(await countAppointments(db)).toBe(50); // sin duplicados

    // Y ningún error inesperado: si aparece un 500, hay un bug de concurrencia
    const unexpected = results.filter(
      (r) => r.status === 'rejected' && !(r.reason instanceof BookingError),
    );
    expect(unexpected).toHaveLength(0);
  }, 60_000);

  test('idempotencia: 50 requests con la misma clave crean 1 cita', async () => {
    const key = 'same-key';
    const results = await Promise.allSettled(
      Array.from({ length: 50 }, () => bookingService.book(request, key)),
    );

    const ids = new Set(
      results.filter((r) => r.status === 'fulfilled').map((r) => r.value.id),
    );
    expect(ids.size).toBe(1);
    expect(await countAppointments(db)).toBe(1);
  }, 30_000);
});
