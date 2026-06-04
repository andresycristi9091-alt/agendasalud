import { obtenerCentros } from '@/lib/actions/setup'
import { obtenerMedicos } from '@/lib/actions/medicos'
import { FormSetup } from '@/components/agenda/FormSetup'

export default async function ConfiguracionPage() {
  const [centrosResult, medicosResult] = await Promise.all([
    obtenerCentros(),
    obtenerMedicos(),
  ])

  const centros = centrosResult.success ? centrosResult.data : []
  const medicos = medicosResult.success ? medicosResult.data : []

  return (
    <div className="max-w-3xl mx-auto space-y-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Configuración del CESFAM</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Registra tu centro de salud, boxes y médicos
        </p>
      </div>
      <FormSetup centros={centros} medicos={medicos} />
    </div>
  )
}
