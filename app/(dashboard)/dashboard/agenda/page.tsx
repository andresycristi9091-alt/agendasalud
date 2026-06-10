import { obtenerCitasDia } from '@/lib/actions/citas'
import { AgendaDia } from '@/components/agenda/AgendaDia'
import { FechaSelectorAgenda } from '@/components/agenda/FechaSelectorAgenda'
import { formatFecha } from '@/lib/utils'

type AgendaPageProps = {
  searchParams: Promise<{ fecha?: string }>
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const params = await searchParams
  const fecha = params.fecha ?? new Date().toISOString().split('T')[0]
  const result = await obtenerCitasDia(fecha).catch((error) => {
    console.error('[agenda] obtenerCitasDia:', error)
    return { success: false as const, error: 'No se pudieron cargar las citas' }
  })
  const citas = result.success ? result.data : []

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda del dia</h1>
          <p className="text-slate-500 text-sm mt-0.5 capitalize">
            {formatFecha(`${fecha}T12:00:00`)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <FechaSelectorAgenda fecha={fecha} />
          <a
            href="/dashboard/nueva-cita"
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            + Nueva cita
          </a>
        </div>
      </div>

      {!result.success && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-red-600 text-sm mb-4">
          {result.error}
        </div>
      )}

      <AgendaDia citas={citas} fecha={fecha} />
    </div>
  )
}
