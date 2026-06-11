export function PublicTrustFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-sm font-black text-slate-950">Proteccion de datos</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Tus datos personales se utilizan exclusivamente para gestionar tu solicitud de hora, conforme a la
              Ley 19.628 sobre proteccion de la vida privada. No solicitamos antecedentes clinicos sensibles en
              este formulario.
            </p>
          </div>
          <div>
            <p className="text-sm font-black text-slate-950">Horarios confiables</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Todos los horarios se muestran en hora chilena (America/Santiago) y reflejan la disponibilidad real
              del profesional al momento de la reserva.
            </p>
          </div>
          <div>
            <p className="text-sm font-black text-slate-950">Cancelaciones y cambios</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Si necesitas cancelar o reagendar tu hora, contacta directamente al centro usando los datos que
              recibiras en tu correo de confirmacion.
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-400">
            AgendaSalud - Plataforma de agendamiento para centros de salud.
          </p>
          <div className="flex flex-wrap gap-2">
            <TrustBadge label="Datos cifrados en transito" />
            <TrustBadge label="Sin datos clinicos sensibles" />
            <TrustBadge label="Hora chilena" />
          </div>
        </div>
      </div>
    </footer>
  )
}

function TrustBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {label}
    </span>
  )
}
