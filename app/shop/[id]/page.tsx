import { notFound } from "next/navigation"
import { getDrop } from "@/lib/queries"
import { Storefront } from "@/components/storefront"

export const dynamic = "force-dynamic"

export default async function ShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const drop = await getDrop(id)
  if (!drop) notFound()

  return <Storefront dropId={drop.id} initialDrop={drop} />
}
