import { obtenerMedicos } from '@/lib/actions/medicos'
import { FormNuevaCita } from '@/components/agenda/FormNuevaCita'

export default async function NuevaCitaPage() {
  const result  = await obtenerMedicos()
  const medicos = result.success ? result.data : []

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nueva Cita</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Registra un paciente y agenda su cita manualmente
        </p>
      </div>

      {medicos.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm mb-6">
          ⚠️ No hay médicos configurados.{' '}
          <a href="/dashboard/configuracion" className="underline font-medium">
            Ve a Configuración
          </a>{' '}
          para registrar el CESFAM primero.
        </div>
      )}

      <FormNuevaCita medicos={medicos} />
    </div>
  )
}
