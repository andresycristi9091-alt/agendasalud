export default function DashboardHomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h1>
      <p className="text-slate-500 text-sm mb-8">
        Bienvenido a AgendaSalud APS. El sistema de agenda estará disponible pronto.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-slate-500 mb-1">Citas hoy</p>
          <p className="text-3xl font-bold text-slate-900">—</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-slate-500 mb-1">No-shows esta semana</p>
          <p className="text-3xl font-bold text-slate-900">—</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-slate-500 mb-1">Pacientes registrados</p>
          <p className="text-3xl font-bold text-slate-900">—</p>
        </div>
      </div>
    </div>
  )
}
