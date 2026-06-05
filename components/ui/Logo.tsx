type LogoProps = {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  mono?: boolean
}

const SIZES = { sm: 28, md: 36, lg: 48 }

export function Logo({ size = 'md', showText = true, mono = false }: LogoProps) {
  const px      = SIZES[size]
  const primary = mono ? '#0F172A' : '#2563EB'
  const teal    = mono ? '#0F172A' : '#14B8A6'

  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={px}
        height={px}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="as-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={mono ? '#0F172A' : '#2563EB'} />
            <stop offset="100%" stopColor={mono ? '#475569' : '#14B8A6'} />
          </linearGradient>
        </defs>
        {/* Fondo */}
        <rect width="48" height="48" rx="12" fill="url(#as-grad)" />
        {/* Argollas calendario */}
        <rect x="15" y="6" width="4" height="8" rx="2" fill="white" opacity="0.9" />
        <rect x="29" y="6" width="4" height="8" rx="2" fill="white" opacity="0.9" />
        {/* Cuerpo calendario */}
        <rect x="8" y="14" width="32" height="26" rx="6" fill="white" opacity="0.15" />
        <rect x="8" y="14" width="32" height="26" rx="6" stroke="white" strokeWidth="1.5" strokeOpacity="0.35" />
        {/* Cruz médica */}
        <rect x="21" y="21" width="6" height="14" rx="2" fill="white" />
        <rect x="17" y="25" width="14" height="6" rx="2" fill="white" />
        {/* Badge check */}
        <circle cx="36" cy="36" r="7" fill={mono ? '#475569' : '#22C55E'} />
        <path
          d="M32.5 36l2.5 2.5 4-4"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showText && (
        <span
          style={{
            fontSize:      size === 'lg' ? 24 : size === 'md' ? 20 : 16,
            fontWeight:    800,
            letterSpacing: '-0.02em',
            lineHeight:    1,
          }}
        >
          <span style={{ color: primary }}>Agenda</span>
          <span style={{ color: teal }}>Salud</span>
        </span>
      )}
    </div>
  )
}
