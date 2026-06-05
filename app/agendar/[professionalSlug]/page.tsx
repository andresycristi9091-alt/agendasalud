import { PublicBookingPage } from '@/components/public/PublicBookingPage'

type Props = { params: Promise<{ professionalSlug: string }> }

export default async function AgendarPage({ params }: Props) {
  const { professionalSlug } = await params
  return <PublicBookingPage slug={professionalSlug} />
}
