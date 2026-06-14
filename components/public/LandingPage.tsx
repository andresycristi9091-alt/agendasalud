'use client'

import Link from 'next/link'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Nav />
      <Hero />
      <HowItWorks />
      <RoleBenefits />
      <Features />
      <SecuritySection />
      <CTA />
      <Footer />
    </div>
  )
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <AgendaSaludLogo />
          <span className="text-lg font-black tracking-tight">
            Agenda<span className="text-teal-500">Salud</span>
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/mis-citas"
            className="hidden rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50 sm:block"
          >
            Mis citas
          </Link>
          <Link
            href="/agendar"
            className="hidden rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 sm:block"
          >
            Profesionales
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Iniciar sesion
          </Link>
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_70%_10%,rgba(255,255,255,0.3),transparent_40%),linear-gradient(135deg,#1D4ED8_0%,#0891B2_50%,#10B981_100%)] px-4 py-20 text-white sm:px-6 lg:py-32">
      <div className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

      <div className="relative mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur">
          Plataforma de agendamiento medico en Chile
        </div>
        <h1 className="mb-6 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-7xl">
          Agenda tu hora en
          <br />
          <span className="text-emerald-300">3 minutos</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-8 text-white/80 sm:text-xl">
          Conectamos pacientes con profesionales de salud. Sin llamadas, sin esperas.
          Reserva en linea con disponibilidad en tiempo real.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/agendar"
            className="w-full rounded-2xl bg-white px-8 py-4 text-base font-black text-blue-700 shadow-[0_18px_40px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(0,0,0,0.25)] sm:w-auto"
          >
            Agendar hora ahora
          </Link>
          <Link
            href="/login"
            className="w-full rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-base font-black text-white backdrop-blur transition hover:bg-white/20 sm:w-auto"
          >
            Acceso profesionales
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-3 gap-4 sm:gap-8">
          <MetricCard value="-40%" label="Inasistencias" />
          <MetricCard value="3 min" label="Para agendar" />
          <MetricCard value="100%" label="Digital" />
        </div>
      </div>
    </section>
  )
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:px-6">
      <p className="text-2xl font-black text-white sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm font-medium text-white/70">{label}</p>
    </div>
  )
}

function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Elige tu profesional',
      description: 'Busca por especialidad o nombre. Ve el perfil, disponibilidad real y centro de atencion.',
    },
    {
      number: '02',
      title: 'Selecciona fecha y hora',
      description: 'Solo se muestran los horarios realmente disponibles. Sin errores ni doble reserva.',
    },
    {
      number: '03',
      title: 'Confirma en segundos',
      description: 'Ingresa tus datos y confirma. Recibiras un correo con el resumen de tu cita.',
    },
  ]

  return (
    <section className="bg-slate-50 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-teal-600">Como funciona</p>
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Agendar nunca fue tan facil</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563EB,#0891B2)] text-lg font-black text-white">
                {step.number}
              </div>
              <h3 className="mb-2 text-lg font-black">{step.title}</h3>
              <p className="text-sm leading-6 text-slate-500">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  const features = [
    {
      icon: CalendarIcon,
      title: 'Disponibilidad en tiempo real',
      description: 'Sincronizado con Google Calendar del profesional. Solo ves horarios realmente libres.',
    },
    {
      icon: BellIcon,
      title: 'Recordatorios automaticos',
      description: 'Te avisamos 24 horas y 2 horas antes de tu cita para que no la olvides.',
    },
    {
      icon: ShieldIcon,
      title: 'Sin doble reserva',
      description: 'Sistema anti-conflicto garantiza que tu hora quede bloqueada en el momento que confirmas.',
    },
    {
      icon: DeviceIcon,
      title: 'Funciona en cualquier dispositivo',
      description: 'Celular, tablet o computador. Diseño adaptado para una experiencia comoda en todos.',
    },
    {
      icon: ClockIcon,
      title: 'Disponible 24/7',
      description: 'Agenda a cualquier hora del dia, sin esperar que el centro atienda llamadas.',
    },
    {
      icon: CheckIcon,
      title: 'Confirmacion inmediata',
      description: 'Recibe tu comprobante por correo al instante. Sin incertidumbre.',
    },
  ]

  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-blue-600">Beneficios</p>
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Todo lo que necesitas</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-500">
            Desarrollado especificamente para centros de salud chilenos y sus pacientes.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-slate-200 p-6 transition hover:border-blue-200 hover:shadow-md">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
                <feature.icon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="mb-2 font-black">{feature.title}</h3>
              <p className="text-sm leading-6 text-slate-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function RoleBenefits() {
  return (
    <section className="bg-slate-50 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-teal-600">Para todos</p>
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Disenado para cada rol</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-500">
            Una sola plataforma que resuelve las necesidades de pacientes, profesionales y centros de salud.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <RoleCard
            badge="Paciente"
            badgeColor="bg-blue-100 text-blue-700"
            title="Agenda sin llamadas"
            description="Reserva tu hora en minutos, desde cualquier dispositivo y a cualquier hora del dia."
            items={[
              'Disponibilidad en tiempo real',
              'Confirmacion inmediata por correo',
              'Recordatorio 24 horas antes',
              'Consulta tus citas en /mis-citas',
              'Cancela con un clic desde el correo',
            ]}
            cta={{ label: 'Buscar profesional', href: '/agendar' }}
            accent="blue"
          />
          <RoleCard
            badge="Profesional"
            badgeColor="bg-teal-100 text-teal-700"
            title="Tu agenda bajo control"
            description="Gestiona tu calendario, recibe notificaciones y mantén Google Calendar sincronizado automaticamente."
            items={[
              'Notificacion por correo de cada cita nueva',
              'Agenda diaria y semanal en un panel claro',
              'Sincronizacion con Google Calendar',
              'Configura tus horarios y duracion de citas',
              'Registra citas manuales para pacientes sin internet',
            ]}
            cta={{ label: 'Acceso profesional', href: '/login' }}
            accent="teal"
          />
          <RoleCard
            badge="Administrador"
            badgeColor="bg-violet-100 text-violet-700"
            title="Control total del centro"
            description="Gestiona profesionales, centros, usuarios y todas las citas desde un panel unificado."
            items={[
              'Crear y administrar profesionales',
              'Asignar usuarios a centros',
              'Ver todas las citas y estados',
              'Cambiar estado de cualquier cita',
              'Metricas de ocupacion y asistencia',
            ]}
            cta={{ label: 'Panel administrativo', href: '/login' }}
            accent="violet"
          />
        </div>
      </div>
    </section>
  )
}

type RoleCardProps = {
  badge: string
  badgeColor: string
  title: string
  description: string
  items: string[]
  cta: { label: string; href: string }
  accent: 'blue' | 'teal' | 'violet'
}

const accentBorder: Record<RoleCardProps['accent'], string> = {
  blue:   'border-blue-200 hover:border-blue-400',
  teal:   'border-teal-200 hover:border-teal-400',
  violet: 'border-violet-200 hover:border-violet-400',
}

const accentButton: Record<RoleCardProps['accent'], string> = {
  blue:   'bg-blue-600 hover:bg-blue-700',
  teal:   'bg-teal-600 hover:bg-teal-700',
  violet: 'bg-violet-600 hover:bg-violet-700',
}

const accentCheck: Record<RoleCardProps['accent'], string> = {
  blue:   'text-blue-600',
  teal:   'text-teal-600',
  violet: 'text-violet-600',
}

function RoleCard({ badge, badgeColor, title, description, items, cta, accent }: RoleCardProps) {
  return (
    <div className={`flex flex-col rounded-3xl border bg-white p-7 shadow-sm transition ${accentBorder[accent]}`}>
      <span className={`mb-4 inline-block rounded-full px-3 py-1 text-xs font-black ${badgeColor}`}>{badge}</span>
      <h3 className="mb-2 text-xl font-black tracking-tight">{title}</h3>
      <p className="mb-6 text-sm leading-6 text-slate-500">{description}</p>
      <ul className="mb-8 space-y-2.5 flex-1">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <svg className={`mt-0.5 h-4 w-4 shrink-0 ${accentCheck[accent]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-slate-600">{item}</span>
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className={`block rounded-2xl py-3 text-center text-sm font-black text-white transition ${accentButton[accent]}`}
      >
        {cta.label}
      </Link>
    </div>
  )
}

function SecuritySection() {
  return (
    <section className="bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-emerald-400">Privacidad y seguridad</p>
            <h2 className="mb-6 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Tus datos estan
              <br />
              <span className="text-emerald-400">protegidos</span>
            </h2>
            <p className="mb-8 text-lg leading-8 text-slate-400">
              Operamos bajo la Ley 19.628 de Proteccion de Datos Personales de Chile.
              Solo usamos tus datos para gestionar tu cita medica.
            </p>
            <div className="space-y-4">
              {[
                'Datos cifrados en transito y en reposo',
                'Acceso restringido solo al profesional tratante',
                'Sin venta ni cesion de datos a terceros',
                'Cumplimiento Ley 19.628 (Chile)',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500">
                    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SecurityCard
              title="HTTPS"
              description="Conexion cifrada TLS 1.3 en todas las comunicaciones"
              color="blue"
            />
            <SecurityCard
              title="Ley 19.628"
              description="Cumplimiento de la ley de proteccion de datos en Chile"
              color="teal"
            />
            <SecurityCard
              title="Sin spam"
              description="Solo te contactamos para lo relacionado a tu cita"
              color="emerald"
            />
            <SecurityCard
              title="Acceso minimo"
              description="El profesional solo ve lo necesario para atenderte"
              color="violet"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

type SecurityCardProps = {
  title: string
  description: string
  color: 'blue' | 'teal' | 'emerald' | 'violet'
}

const colorMap: Record<SecurityCardProps['color'], string> = {
  blue: 'bg-blue-500/20 text-blue-300',
  teal: 'bg-teal-500/20 text-teal-300',
  emerald: 'bg-emerald-500/20 text-emerald-300',
  violet: 'bg-violet-500/20 text-violet-300',
}

function SecurityCard({ title, description, color }: SecurityCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className={`mb-3 inline-flex rounded-xl px-2 py-1 text-xs font-bold ${colorMap[color]}`}>
        {title}
      </div>
      <p className="text-sm leading-5 text-slate-400">{description}</p>
    </div>
  )
}

function CTA() {
  return (
    <section className="bg-slate-50 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-3xl font-black tracking-tight sm:text-4xl">
          Listo para empezar?
        </h2>
        <p className="mb-8 text-lg text-slate-500">
          Busca al profesional que necesitas y agenda tu hora en minutos.
          Sin registros, sin complicaciones.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/agendar"
            className="w-full rounded-2xl bg-[linear-gradient(135deg,#2563EB_0%,#0891B2_50%,#10B981_100%)] px-8 py-4 text-base font-black text-white shadow-[0_18px_40px_rgba(37,99,235,0.3)] transition hover:-translate-y-0.5 sm:w-auto"
          >
            Ver profesionales disponibles
          </Link>
          <Link
            href="/login"
            className="w-full rounded-2xl border border-slate-300 bg-white px-8 py-4 text-base font-black text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            Soy profesional
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-slate-400 sm:flex-row">
        <div className="flex items-center gap-2">
          <AgendaSaludLogo small />
          <span className="font-bold text-slate-600">AgendaSalud</span>
          <span>&middot; Hecho en Chile</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
          <span>Cumplimiento Ley 19.628 &middot; Datos protegidos</span>
          <Link href="/mis-citas" className="font-bold text-blue-600 hover:underline">Mis citas</Link>
          <Link href="/agendar" className="font-bold text-blue-600 hover:underline">Profesionales</Link>
          <Link href="/login" className="font-bold text-blue-600 hover:underline">Acceso profesionales</Link>
        </div>
      </div>
    </footer>
  )
}

function AgendaSaludLogo({ small = false }: { small?: boolean }) {
  const size = small ? 28 : 36
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2563EB,#10B981)] shadow-md"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.75} height={size * 0.75} viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="4" y="6" width="22" height="20" rx="5" fill="white" fillOpacity="0.95" />
        <path d="M9 5V9M21 5V9" stroke="#DBEAFE" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M10 16H20" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M15 11V21" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

function DeviceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
