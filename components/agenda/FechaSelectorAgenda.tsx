'use client'

type Props = { fecha: string }

export function FechaSelectorAgenda({ fecha }: Props) {
  return (
    <input
      type="date"
      defaultValue={fecha}
      className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm
                 focus:outline-none focus:ring-2 focus:ring-blue-500"
      onChange={(e) => {
        const url = new URL(window.location.href)
        url.searchParams.set('fecha', e.target.value)
        window.location.href = url.toString()
      }}
    />
  )
}
