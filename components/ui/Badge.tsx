import { cn } from '@/lib/utils'
import type { EstadoCita, TipoCita } from '@/lib/types/database'

const ESTADO_STYLES: Record<EstadoCita, string> = {
  agendada:    'bg-blue-100 text-blue-700',
  confirmada:  'bg-green-100 text-green-700',
  cancelada:   'bg-red-100 text-red-700',
  no_show:     'bg-orange-100 text-orange-700',
  atendida:    'bg-slate-100 text-slate-600',
}

const TIPO_STYLES: Record<TipoCita, string> = {
  urgente:     'bg-red-50 text-red-600 border border-red-200',
  control:     'bg-blue-50 text-blue-600 border border-blue-200',
  orientacion: 'bg-purple-50 text-purple-600 border border-purple-200',
}

type BadgeProps = {
  estado?: EstadoCita
  tipo?: TipoCita
  className?: string
}

export function Badge({ estado, tipo, className }: BadgeProps) {
  const style = estado
    ? ESTADO_STYLES[estado]
    : tipo
    ? TIPO_STYLES[tipo]
    : ''

  const label = estado ?? tipo ?? ''

  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium',
        style,
        className
      )}
    >
      {label.replace('_', ' ')}
    </span>
  )
}
