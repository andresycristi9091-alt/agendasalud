import { CancelAppointmentPage } from '@/components/public/CancelAppointmentPage'

export const dynamic = 'force-dynamic'

export default async function CancelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CancelAppointmentPage appointmentId={id} />
}
