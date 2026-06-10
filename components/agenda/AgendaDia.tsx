import { TarjetaCita } from './TarjetaCita'
import type { CitaConRelaciones } from '@/lib/types/database'

type AgendaDiaProps = {
  citas: CitaConRelaciones[]
  fecha: string
}

export function AgendaDia({ citas }: AgendaDiaProps) {
  const citasValidas = citas.filter((cita) => cita && cita.id)
  const porMedico = citasValidas.reduce<Record<string, CitaConRelaciones[]>>(
    (acc, cita) => {
      const key = cita.medico_id ?? 'sin-medico'
      if (!acc[key]) acc[key] = []
      acc[key].push(cita)
      return acc
    },
    {}
  )

  const canceladas = citasValidas.filter((c) => c.estado === 'cancelada').length
  const noShows = citasValidas.filter((c) => c.estado === 'no_show').length

  if (citasValidas.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-5xl mb-4">--</p>
        <p className="font-medium text-slate-600">No hay citas para este dia</p>
        <p className="text-sm mt-2">
          <a href="/dashboard/nueva-cita" className="text-blue-500 hover:underline">
            + Crear primera cita
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {Object.entries(porMedico).map(([medicoId, citasMedico]) => {
        const medico = citasMedico[0].medico
        const nombreMedico = medico?.profile?.nombre ?? 'Medico sin nombre'

        return (
          <div key={medicoId}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <h3 className="text-sm font-semibold text-slate-700">
                {nombreMedico}
                <span className="font-normal text-slate-400 ml-1">
                  - {medico?.especialidad ?? 'Sin especialidad'}
                </span>
              </h3>
              <span className="text-xs text-slate-300">({citasMedico.length})</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {citasMedico.map((cita) => (
                <TarjetaCita key={cita.id} cita={cita} />
              ))}
            </div>
          </div>
        )
      })}

      <div className="pt-6 border-t flex flex-wrap gap-6 text-sm text-slate-500">
        <span>
          <strong className="text-slate-900">{citasValidas.length}</strong> citas totales
        </span>
        <span>
          <strong className="text-slate-900">{canceladas}</strong> canceladas
        </span>
        <span>
          <strong className="text-slate-900">{noShows}</strong> no-shows
        </span>
      </div>
    </div>
  )
}
