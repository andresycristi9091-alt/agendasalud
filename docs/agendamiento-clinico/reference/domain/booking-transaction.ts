/**
 * IMPLEMENTACIÓN DE REFERENCIA — Transacción de reserva
 *
 * Es el punto más delicado del sistema. Tres capas de defensa contra la
 * doble reserva, en orden de menor a mayor garantía:
 *
 *   1. Hold optimista       → experiencia (evita que dos usuarios avancen en paralelo)
 *   2. Lock pesimista       → corrección (serializa a los que igual llegaron juntos)
 *   3. Exclusion constraint → garantía absoluta (red de seguridad del motor)
 *
 * Nunca eliminar ninguna de las tres pensando que la anterior es suficiente.
 *
 * Ver: docs/invariantes.md I-01, I-02, I-03, I-04, I-05
 */

import type { Kysely, Transaction } from 'kysely';
import type { DB } from '@app/db';
import { uuidv7 } from '@app/domain/id';

// ─────────────────────────────────────────────────────────────────────
// Errores de dominio tipados. Nunca `throw new Error('...')`.
// Cada uno mapea a un Problem Details (RFC 9457) en la capa HTTP.
// ─────────────────────────────────────────────────────────────────────

export abstract class BookingError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  abstract readonly humanMessage: Record<string, string>;
}

export class SlotTakenError extends BookingError {
  readonly code = 'SLOT_TAKEN';
  readonly httpStatus = 409;
  readonly humanMessage = {
    es: 'Ese horario se acaba de tomar. Estos están libres y son cercanos:',
    en: 'That time was just taken. These nearby times are available:',
  };
  constructor(readonly alternatives: SlotSummary[]) {
    super('SLOT_TAKEN');
  }
}

export class HoldExpiredError extends BookingError {
  readonly code = 'HOLD_EXPIRED';
  readonly httpStatus = 410;
  readonly humanMessage = {
    es: 'Se agotó el tiempo para completar la reserva. El horario sigue disponible, vuelve a intentarlo.',
    en: 'Your reservation window expired. The slot may still be available — try again.',
  };
}

export class RuleDeniedError extends BookingError {
  readonly code = 'RULE_DENIED';
  readonly httpStatus = 422;
  constructor(
    readonly ruleId: string,
    readonly humanMessage: Record<string, string>,
    readonly remediation?: Remediation,
  ) {
    super(`RULE_DENIED:${ruleId}`);
  }
}

export class ResourceUnavailableError extends BookingError {
  readonly code = 'RESOURCE_UNAVAILABLE';
  readonly httpStatus = 409;
  readonly humanMessage = {
    es: 'No hay box disponible para esta atención en ese horario.',
    en: 'No room is available for this appointment at that time.',
  };
}

// ─────────────────────────────────────────────────────────────────────

export interface BookingRequest {
  holdId: string;
  patientId: string;
  serviceId: string;
  reasonText?: string;
  modality: 'in_person' | 'telehealth' | 'home';
  channel: Channel;
  bookedBy: string;
  actorRole: Role;
  consents: Array<{ type: string; version: string; documentHash: string }>;
}

export class BookingService {
  constructor(
    private readonly db: Kysely<DB>,
    private readonly rules: RulesEngine,
    private readonly resources: ResourceAllocator,
    private readonly idempotency: IdempotencyStore,
    private readonly clock: Clock,
  ) {}

  /**
   * Punto de entrada. La idempotencia envuelve TODO, incluida la
   * evaluación de reglas: un reintento no vuelve a evaluar nada,
   * devuelve la respuesta original.  ← Invariante I-04
   */
  async book(req: BookingRequest, idempotencyKey: string): Promise<Appointment> {
    return this.idempotency.execute(idempotencyKey, req, () => this.doBook(req));
  }

  private async doBook(req: BookingRequest): Promise<Appointment> {
    return this.db.transaction().execute(async (trx) => {
      // ── 1. Fijar contexto de autorización para RLS ─────────────────
      // Sin esto, las políticas de la migración 008 bloquean todo.
      await this.setSessionContext(trx, req);

      // ── 2. Validar y consumir el hold ──────────────────────────────
      const hold = await trx
        .selectFrom('slot_hold')
        .selectAll()
        .where('id', '=', req.holdId)
        .where('released_at', 'is', null)
        .executeTakeFirst();

      if (!hold || hold.expires_at <= this.clock.now()) {
        throw new HoldExpiredError();
      }

      // ── 3. Lock pesimista sobre el slot ────────────────────────────
      //
      // NOWAIT en lugar de esperar: bajo contención es mejor responder
      // de inmediato "se acaba de tomar, mira estas alternativas" que
      // dejar al usuario mirando un spinner durante segundos.
      //
      // Postgres devuelve 55P03 (lock_not_available) si no puede tomarlo.
      let slot;
      try {
        slot = await trx
          .selectFrom('slot')
          .selectAll()
          .where('id', '=', hold.slot_id)
          .forUpdate()
          .noWait()
          .executeTakeFirstOrThrow();
      } catch (e) {
        if (isPgError(e, '55P03')) {
          throw new SlotTakenError(await this.findAlternatives(trx, hold.slot_id));
        }
        throw e;
      }

      if (slot.status === 'booked' || slot.status === 'conflicted') {
        throw new SlotTakenError(await this.findAlternatives(trx, slot.id));
      }

      // ── 4. Evaluar reglas de negocio ───────────────────────────────
      //
      // Se evalúan DOS veces en el ciclo de vida: al listar disponibilidad
      // (para no mostrar lo que se va a rechazar) y aquí, porque el contexto
      // pudo cambiar entre ambos momentos. Misma implementación, sin duplicar
      // lógica.
      const context = await this.buildRuleContext(trx, req, slot);
      const decision = await this.rules.evaluate('booking', context);

      if (decision.effect === 'deny') {
        // Invariante I-08: toda denegación trae mensaje humano.
        throw new RuleDeniedError(
          decision.ruleId,
          decision.humanMessage,
          decision.remediation,
        );
      }

      // ── 5. Asignar recursos físicos ────────────────────────────────
      const service = await trx
        .selectFrom('service').selectAll()
        .where('id', '=', req.serviceId)
        .executeTakeFirstOrThrow();

      const allocated = await this.resources.allocate(trx, {
        locationId: slot.location_id,
        kinds: service.required_resource_kinds,
        period: slot.period,
        accessibility: context.patient.accessibilityNeeds,
      });

      if (allocated.length < service.required_resource_kinds.length) {
        throw new ResourceUnavailableError();
      }

      // ── 6. Registrar consentimientos ───────────────────────────────
      if (req.consents.length > 0) {
        await trx.insertInto('consent').values(
          req.consents.map((c) => ({
            id: uuidv7(),
            patient_id: req.patientId,
            consent_type: c.type,
            version: c.version,
            granted: true,
            granted_by: req.bookedBy,
            channel: req.channel,
            document_hash: c.documentHash,
          })),
        ).execute();
      }

      // ── 7. Crear la cita ───────────────────────────────────────────
      //
      // Si algo se escapó de las capas 1–3, la exclusion constraint
      // rechaza aquí con 23P01 (exclusion_violation). Esa es la
      // garantía real: sobrevive a bugs de aplicación.
      const appointmentId = uuidv7();
      let appointment;
      try {
        appointment = await trx
          .insertInto('appointment')
          .values({
            id: appointmentId,
            slot_id: slot.id,
            patient_id: req.patientId,
            practitioner_id: slot.practitioner_id,
            location_id: slot.location_id,
            service_id: req.serviceId,
            period: slot.period,
            status: 'booked',
            channel: req.channel,
            modality: req.modality,
            reason_text: req.reasonText,
            booked_by: req.bookedBy,
            is_first_visit: context.patient.isFirstVisitForService,
          })
          .returningAll()
          .executeTakeFirstOrThrow();
      } catch (e) {
        if (isPgError(e, '23P01')) {
          // El paciente ya tiene otra cita solapada, o carrera perdida.
          throw new SlotTakenError(await this.findAlternatives(trx, slot.id));
        }
        throw e;
      }

      // ── 8. Vincular recursos ───────────────────────────────────────
      if (allocated.length > 0) {
        await trx.insertInto('appointment_resource').values(
          allocated.map((r) => ({
            appointment_id: appointmentId,
            resource_id: r.id,
            period: slot.period,
            active: true,
          })),
        ).execute();
      }

      // ── 9. Marcar el slot y liberar el hold ────────────────────────
      await trx.updateTable('slot')
        .set({ status: 'booked' })
        .where('id', '=', slot.id)
        .execute();

      await trx.updateTable('slot_hold')
        .set({ released_at: this.clock.now() })
        .where('id', '=', hold.id)
        .execute();

      // ── 10. Transición + outbox, en LA MISMA transacción ───────────
      //
      // Invariante I-05. El constraint trigger DEFERRED de la migración 005
      // verifica esto al hacer COMMIT: si falta la transición, revienta.
      await trx.insertInto('appointment_transition').values({
        appointment_id: appointmentId,
        from_status: null,
        to_status: 'booked',
        actor_id: req.bookedBy,
        actor_role: req.actorRole,
        channel: req.channel,
      }).execute();

      await trx.insertInto('outbox').values({
        aggregate_type: 'appointment',
        aggregate_id: appointmentId,
        event_type: 'AppointmentBooked',
        payload: {
          appointmentId,
          patientId: req.patientId,
          practitionerId: slot.practitioner_id,
          locationId: slot.location_id,
          serviceId: req.serviceId,
          startsAt: lowerBound(slot.period),
          endsAt: upperBound(slot.period),
          modality: req.modality,
          channel: req.channel,
        },
        trace_id: currentTraceId(),
      }).execute();

      // ── 11. Auditoría ──────────────────────────────────────────────
      await trx.insertInto('audit_log').values({
        actor_id: req.bookedBy,
        actor_role: req.actorRole,
        action: 'create',
        resource_type: 'appointment',
        resource_id: appointmentId,
        patient_id: req.patientId,
        trace_id: currentTraceId(),
      }).execute();

      return appointment;
    });
  }

  /**
   * Nunca devolver un error de contención sin alternativas.
   * "Ese horario se acaba de tomar" a secas es una experiencia hostil.
   */
  private async findAlternatives(
    trx: Transaction<DB>,
    slotId: string,
    limit = 5,
  ): Promise<SlotSummary[]> {
    const ref = await trx.selectFrom('slot').selectAll()
      .where('id', '=', slotId).executeTakeFirstOrThrow();

    return trx.selectFrom('slot')
      .select(['id', 'practitioner_id', 'location_id', 'period'])
      .where('status', '=', 'free')
      .where('location_id', '=', ref.location_id)
      .where('service_ids', '&&', ref.service_ids)
      .where(lowerBoundOf('period'), '>=', this.clock.now())
      // Orden por cercanía temporal al slot original
      .orderBy(absDistanceTo('period', ref.period))
      .limit(limit)
      .execute();
  }

  private async setSessionContext(trx: Transaction<DB>, req: BookingRequest) {
    // SET LOCAL: se revierte solo al terminar la transacción.
    await trx.executeQuery(sql`
      SELECT set_config('app.user_id',   ${req.bookedBy}, true),
             set_config('app.roles',     ${req.actorRole}, true),
             set_config('app.patient_id',${req.patientId}, true)
    `.compile(trx));
  }
}
