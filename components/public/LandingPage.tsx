'use client'

import Link from 'next/link'

const navItems = [
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'IA', href: '#ia' },
  { label: 'Planes', href: '#planes' },
  { label: 'Seguridad', href: '#seguridad' },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#1A1A2E]">
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <RoleBenefits />
        <AISuite />
        <Testimonials />
        <SecuritySection />
        <PricingSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="AgendaSalud inicio">
          <AgendaSaludLogo />
          <span className="text-lg font-black tracking-tight">
            Agenda<span className="text-[#2ECC71]">Salud</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegacion principal">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-xl px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-50 sm:block">
            Iniciar sesion
          </Link>
          <Link href="/agendar" className="rounded-xl bg-[#1E6FD9] px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-700">
            Agendar
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_78%_18%,rgba(46,204,113,0.26),transparent_30%),linear-gradient(135deg,#1A1A2E_0%,#1E6FD9_54%,#2ECC71_100%)] px-4 py-16 text-white sm:px-6 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/80">
            SaaS de agendamiento medico inteligente
          </p>
          <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-7xl">
            Agenda medica simple para pacientes, profesionales y centros.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82">
            AgendaSalud conecta disponibilidad real, recordatorios, Google Calendar y reportes en una experiencia rapida, segura y lista para crecer.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <HeroCTA href="/agendar" label="Agenda tu hora" primary />
            <HeroCTA href="/login" label="Registra tu consulta" />
            <HeroCTA href="#demo" label="Ver demo" />
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <HeroMetric value="3 min" label="flujo de reserva" />
            <HeroMetric value="24/7" label="agenda disponible" />
            <HeroMetric value="IA-ready" label="automatizacion preparada" />
          </div>
        </div>

        <div id="demo" className="rounded-[32px] border border-white/15 bg-white/12 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.22)] backdrop-blur">
          <div className="rounded-[24px] bg-white p-5 text-slate-950">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1E6FD9]">Hoy</p>
                <h2 className="mt-1 text-2xl font-black">Centro NeuroPlus</h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Online</span>
            </div>
            <div className="mt-5 grid gap-3">
              <DemoRow time="09:00" title="Paciente nuevo" status="Confirmada" tone="blue" />
              <DemoRow time="10:30" title="Control neurologia" status="Riesgo bajo" tone="green" />
              <DemoRow time="12:00" title="Hueco disponible" status="Sugerido por IA" tone="amber" />
            </div>
            <div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-black text-blue-950">Asistente de agenda</p>
              <p className="mt-2 text-sm leading-6 text-blue-700">
                Sugerencia: ofrece el bloque de 12:00 a pacientes en seguimiento. Es el horario con mejor asistencia historica.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HeroCTA({ href, label, primary = false }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={[
        'flex h-14 items-center justify-center rounded-2xl px-5 text-sm font-black transition hover:-translate-y-0.5',
        primary ? 'bg-white text-[#1E6FD9] shadow-[0_18px_40px_rgba(0,0,0,0.18)]' : 'border border-white/25 bg-white/10 text-white hover:bg-white/18',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-sm font-semibold text-white/68">{label}</p>
    </div>
  )
}

function DemoRow({ time, title, status, tone }: { time: string; title: string; status: string; tone: 'blue' | 'green' | 'amber' }) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }[tone]

  return (
    <div className="grid grid-cols-[70px_1fr] gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-black text-slate-500">{time}</p>
      <div>
        <p className="font-black text-slate-950">{title}</p>
        <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-black ${toneClass}`}>{status}</span>
      </div>
    </div>
  )
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Como funciona" title="Dos flujos simples, una sola plataforma" subtitle="Paciente y profesional avanzan sin llamadas, planillas ni confirmaciones manuales." />
        <div className="grid gap-6 lg:grid-cols-2">
          <FlowCard title="Paciente" steps={['Busca profesional o especialidad', 'Elige fecha y hora disponible', 'Confirma sus datos y recibe correo']} />
          <FlowCard title="Profesional" steps={['Configura disponibilidad', 'Comparte su link publico', 'Gestiona citas, estados y recordatorios']} />
        </div>
      </div>
    </section>
  )
}

function FlowCard({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
      <h3 className="text-2xl font-black">{title}</h3>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step} className="rounded-2xl border border-slate-200 bg-[#F4F6F9] p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E6FD9] text-sm font-black text-white">{index + 1}</span>
            <p className="mt-4 text-sm font-black leading-6 text-slate-800">{step}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function RoleBenefits() {
  const roles = [
    {
      role: 'Paciente',
      title: 'Menos espera, mas claridad',
      items: ['Reserva en 3 pasos', 'Mis citas por correo', 'Cancelacion guiada', 'Datos protegidos'],
    },
    {
      role: 'Profesional',
      title: 'Agenda operativa diaria',
      items: ['Dashboard de jornada', 'Disponibilidad visual', 'Citas manuales', 'Google Calendar'],
    },
    {
      role: 'Centro',
      title: 'Gestion multi-profesional',
      items: ['Centros independientes', 'Usuarios por centro', 'Metricas por profesional', 'Control de directorio publico'],
    },
  ]

  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Beneficios por perfil" title="Cada usuario ve solo lo que necesita" subtitle="Una experiencia separada por responsabilidades: paciente, profesional, centro y super admin." />
        <div className="grid gap-5 lg:grid-cols-3">
          {roles.map((role) => (
            <div key={role.role} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(30,111,217,0.12)]">
              <p className="mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#1E6FD9]">{role.role}</p>
              <h3 className="text-xl font-black">{role.title}</h3>
              <ul className="mt-5 space-y-3">
                {role.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm font-semibold text-slate-600">
                    <CheckBullet />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AISuite() {
  const items = [
    {
      title: 'Sugerencia inteligente de horarios',
      text: 'Base heuristica preparada para recomendar bloques con menor friccion y mejor asistencia.',
    },
    {
      title: 'Prediccion de ausencias',
      text: 'Badges de riesgo bajo, medio y alto a partir de anticipacion, historial y confirmaciones.',
    },
    {
      title: 'Comunicacion automatizada',
      text: 'Recordatorios y mensajes transaccionales con tono claro, humano y revisable por el equipo.',
    },
  ]

  return (
    <section id="ia" className="px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="IA integrada" title="No solo agenda: motor inteligente de operacion" subtitle="La IA no toma decisiones clinicas. Sugiere, prioriza y reduce trabajo administrativo." />
        <div className="grid gap-5 lg:grid-cols-3">
          {items.map((item, index) => (
            <div key={item.title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-lg font-black text-emerald-700">AI{index + 1}</div>
              <h3 className="text-lg font-black">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Testimonials() {
  const quotes = [
    ['Antes coordinabamos por telefono. Ahora el paciente llega con su hora confirmada.', 'Administracion centro medico'],
    ['El panel diario permite saber quien viene, quien falta y que huecos puedo ocupar.', 'Profesional de salud'],
    ['Me interesa que sea simple: elegir profesional, hora y confirmar sin llamar.', 'Paciente piloto'],
  ]

  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Testimonios" title="Preparado para escalar con evidencia real" subtitle="Textos iniciales para pilotos; luego se reemplazan por citas verificadas de centros y pacientes." />
        <div className="grid gap-5 lg:grid-cols-3">
          {quotes.map(([quote, author]) => (
            <figure key={quote} className="rounded-[28px] border border-slate-200 bg-[#F4F6F9] p-6">
              <blockquote className="text-base font-bold leading-7 text-slate-800">{quote}</blockquote>
              <figcaption className="mt-5 text-sm font-black text-[#1E6FD9]">{author}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

function SecuritySection() {
  return (
    <section id="seguridad" className="bg-[#1A1A2E] px-4 py-16 text-white sm:px-6 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">Seguridad y privacidad</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Privacidad explicada sin tecnicismos.</h2>
          <p className="mt-5 text-lg leading-8 text-white/70">
            AgendaSalud guarda solo lo necesario para coordinar una cita. Evitamos solicitar informacion clinica sensible en el flujo publico.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SecurityCard title="HTTPS" text="Conexion segura en todas las rutas publicas y privadas." />
          <SecurityCard title="Roles" text="El super admin unico es admin@agendasalud.cl; usuarios operan por centro." />
          <SecurityCard title="No urgencias" text="El flujo de reserva no reemplaza servicios de emergencia." />
          <SecurityCard title="Auditable" text="Arquitectura preparada para logs de acciones y sincronizacion." />
        </div>
      </div>
    </section>
  )
}

function SecurityCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
      <p className="text-sm font-black text-emerald-300">{title}</p>
      <p className="mt-2 text-sm leading-6 text-white/68">{text}</p>
    </div>
  )
}

function PricingSection() {
  const plans: Array<{ name: string; price: string; features: string[] }> = [
    { name: 'Starter', price: 'Consultar', features: ['1 profesional', 'Agenda basica', 'Recordatorios email', 'Hasta 30 citas/mes'] },
    { name: 'Pro', price: 'Consultar', features: ['1 a 3 profesionales', 'Google Calendar', 'Reportes simples', 'IA basica preparada'] },
    { name: 'Centro', price: 'Consultar', features: ['Multi-profesional', 'Panel de centro', 'Reportes por profesional', 'Soporte prioritario'] },
    { name: 'Enterprise', price: 'A medida', features: ['Multi-sede', 'White-label', 'API futura', 'SLA y soporte dedicado'] },
  ]

  return (
    <section id="planes" className="px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Planes y negocio" title="Modelo SaaS listo para pilotos y venta consultiva" subtitle="Los precios pueden definirse despues; la estructura del producto ya separa planes y limites futuros." />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map(({ name, price, features }) => (
            <div key={name} className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-lg font-black">{name}</p>
              <p className="mt-3 text-3xl font-black text-[#1E6FD9]">{price}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm font-semibold text-slate-600">
                    <CheckBullet />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login" className="mt-6 rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50">
                Solicitar acceso
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCTA() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-4xl rounded-[32px] bg-[linear-gradient(135deg,#1E6FD9,#2ECC71)] p-8 text-center text-white shadow-[0_24px_80px_rgba(30,111,217,0.22)] sm:p-12">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-white/70">Piloto healthtech</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Empieza gratis hoy, sin tarjeta de credito.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/78">
          AgendaSalud esta preparado para partir con un centro piloto, medir conversion y evolucionar hacia SaaS multi-centro.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/agendar" className="rounded-2xl bg-white px-6 py-4 text-sm font-black text-[#1E6FD9]">Agendar una hora</Link>
          <Link href="/login" className="rounded-2xl border border-white/25 px-6 py-4 text-sm font-black text-white">Entrar al panel</Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <AgendaSaludLogo />
            <span className="text-lg font-black">Agenda<span className="text-[#2ECC71]">Salud</span></span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
            Plataforma SaaS de agendamiento medico para pilotos, profesionales y centros de salud.
          </p>
          <p className="mt-4 text-xs font-bold text-slate-400">Version piloto 2026 - Hecho en Chile</p>
        </div>
        <FooterGroup title="Producto" links={[['Agendar', '/agendar'], ['Mis citas', '/mis-citas'], ['Acceso profesional', '/login']]} />
        <FooterGroup title="Legal y contacto" links={[['Privacidad', '#seguridad'], ['Planes', '#planes'], ['Contacto', 'mailto:admin@agendasalud.cl']]} />
      </div>
    </footer>
  )
}

function FooterGroup({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-sm font-black text-slate-900">{title}</p>
      <div className="mt-4 grid gap-2">
        {links.map(([label, href]) => (
          <Link key={label} href={href} className="text-sm font-semibold text-slate-500 hover:text-[#1E6FD9]">
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-[#1E6FD9]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{title}</h2>
      <p className="mt-5 text-base leading-7 text-slate-500">{subtitle}</p>
    </div>
  )
}

function CheckBullet() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
      <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 10.4L8 14L16 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function AgendaSaludLogo() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1E6FD9,#2ECC71)] shadow-md">
      <svg width="28" height="28" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="4" y="6" width="22" height="20" rx="5" fill="white" fillOpacity="0.96" />
        <path d="M9 5V9M21 5V9" stroke="#DBEAFE" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M10 16H20" stroke="#1E6FD9" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M15 11V21" stroke="#1E6FD9" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="23.5" cy="23.5" r="5.5" fill="#2ECC71" />
        <path d="M21.2 23.5L22.8 25.1L26 21.8" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
