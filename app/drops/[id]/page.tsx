import { notFound } from "next/navigation"
import { getDrop } from "@/lib/queries"
import { SiteHeader } from "@/components/site-header"
import { ControlRoom } from "@/components/control-room"

export const dynamic = "force-dynamic"

export default async function DropControlPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const drop = await getDrop(id)
  if (!drop) notFound()

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <ControlRoom dropId={drop.id} initialDrop={drop} />
    </div>
  )
}
