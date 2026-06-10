'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/Badge'
import { cancelarCita, marcarNoShow } from '@/lib/actions/citas'
import { formatHora } from '@/lib/utils'
import type { CitaConRelaciones } from '@/lib/types/database'

type TarjetaCitaProps = {
  cita: CitaConRelaciones
}

export function TarjetaCita({ cita }: TarjetaCitaProps) {
  const [isPending, startTransition] = useTransition()
  const [confirmando, setConfirmando] = useState(false)

  function handleCancelar() {
    startTransition(async () => {
      await cancelarCita(cita.id)
      setConfirmando(false)
    })
  }

  function handleNoShow() {
    startTransition(async () => {
      await marcarNoShow(cita.id)
    })
  }

  const esCancelable =
    cita.estado === 'agendada' || cita.estado === 'confirmada'

  return (
    <div
      className={`bg-white border rounded-lg p-3 space-y-1.5 transition-opacity ${
        isPending ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {cita.paciente?.nombre ?? 'Paciente'} {cita.paciente?.apellido ?? ''}
          </p>
          <p className="text-xs text-slate-400">{cita.paciente?.rut ?? 'Sin RUT'}</p>
        </div>
        <span className="text-xs text-slate-500 shrink-0 font-mono">
          {formatHora(cita.fecha_hora)}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge tipo={cita.tipo} />
        <Badge estado={cita.estado} />
      </div>

      {cita.triage_motivo && (
        <p className="text-xs text-slate-400 italic truncate">{cita.triage_motivo}</p>
      )}

      {esCancelable && !confirmando && (
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => setConfirmando(true)}
            disabled={isPending}
            className="text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleNoShow}
            disabled={isPending}
            className="text-xs text-orange-500 hover:text-orange-700 transition-colors"
          >
            No asistió
          </button>
        </div>
      )}

      {confirmando && (
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-slate-500">¿Cancelar cita?</span>
          <button
            onClick={handleCancelar}
            className="text-xs text-red-600 font-semibold hover:underline"
          >
            Sí
          </button>
          <button
            onClick={() => setConfirmando(false)}
            className="text-xs text-slate-400 hover:underline"
          >
            No
          </button>
        </div>
      )}
    </div>
  )
}
