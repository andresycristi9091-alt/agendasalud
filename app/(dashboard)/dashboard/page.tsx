import Link from 'next/link'

const STATS = [
  {
    label:   'Citas hoy',
    value:   '—',
    icon:    '📅',
    color:   '#2563EB',
    bg:      '#EFF6FF',
    border:  '#DBEAFE',
  },
  {
    label:   'No-shows semana',
    value:   '—',
    icon:    '⏰',
    color:   '#D97706',
    bg:      '#FFFBEB',
    border:  '#FDE68A',
  },
  {
    label:   'Pacientes registrados',
    value:   '—',
    icon:    '👤',
    color:   '#0D9488',
    bg:      '#F0FDFA',
    border:  '#CCFBF1',
  },
  {
    label:   'Citas este mes',
    value:   '—',
    icon:    '📊',
    color:   '#7C3AED',
    bg:      '#F5F3FF',
    border:  '#DDD6FE',
  },
]

const QUICK_ACTIONS = [
  {
    href:    '/dashboard/agenda',
    icon:    '📅',
    title:   'Ver agenda',
    desc:    'Consulta las citas de hoy y los próximos días',
    color:   '#2563EB',
    bg:      '#EFF6FF',
  },
  {
    href:    '/dashboard/citas',
    icon:    '📋',
    title:   'Gestionar citas',
    desc:    'Ve todas las citas, cancela o marca como completadas',
    color:   '#0891B2',
    bg:      '#F0FDFA',
  },
  {
    href:    '/dashboard/disponibilidad',
    icon:    '🗓',
    title:   'Disponibilidad',
    desc:    'Define horarios disponibles para pacientes',
    color:   '#10B981',
    bg:      '#F0FDF4',
  },
  {
    href:    '/dashboard/nueva-cita',
    icon:    '➕',
    title:   'Nueva cita manual',
    desc:    'Registra un paciente y agenda su atención',
    color:   '#7C3AED',
    bg:      '#F5F3FF',
  },
]

export default function DashboardHomePage() {
  const now  = new Date()
  const hora = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  const dia  = now.toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="space-y-8">

      {/* Hero saludo */}
      <div
        className="rounded-3xl p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)' }}
      >
        {/* Decoración */}
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        />
        <div
          className="absolute -bottom-8 right-32 w-40 h-40 rounded-full"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        />

        <div className="relative z-10">
          <p className="text-white/60 text-sm font-medium mb-1 capitalize">{dia}</p>
          <h1
            className="text-white mb-2"
            style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            Buenos días 👋
          </h1>
          <p className="text-white/70 text-lg">
            Son las <strong className="text-white">{hora}</strong>. Tu panel de AgendaSalud está listo.
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div>
        <h2
          className="mb-4"
          style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}
        >
          Resumen
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-5"
              style={{
                backgroundColor: s.bg,
                border:          `1.5px solid ${s.border}`,
                boxShadow:       '0 1px 2px rgba(15,23,42,0.04)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{s.icon}</span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: s.color + '22' }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                </div>
              </div>
              <p
                style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1 }}
              >
                {s.value}
              </p>
              <p
                className="mt-1"
                style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div>
        <h2
          className="mb-4"
          style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}
        >
          Acciones rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group quick-card rounded-2xl p-6 block"
              style={{
                backgroundColor: 'white',
                border:          '1.5px solid #E2E8F0',
                boxShadow:       '0 1px 2px rgba(15,23,42,0.04)',
                textDecoration:  'none',
                transition:      'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
                style={{ backgroundColor: a.bg }}
              >
                {a.icon}
              </div>
              <h3
                className="mb-1"
                style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}
              >
                {a.title}
              </h3>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: '20px' }}>
                {a.desc}
              </p>
              <div
                className="mt-4 flex items-center gap-1 text-sm font-semibold"
                style={{ color: a.color }}
              >
                Ir ahora
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div
        className="rounded-2xl px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: '#22C55E' }}
          />
          <span style={{ fontSize: 14, color: '#475569' }}>
            AgendaSalud está operativo
          </span>
        </div>
        <span style={{ fontSize: 13, color: '#94A3B8' }}>v2.0 · Piloto</span>
      </div>

    </div>
  )
}
