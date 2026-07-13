import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ReceiptsGallery } from "./receipts-gallery";

export default async function ReceiptsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  
  const party = await prisma.party.findUnique({
    where: { id: resolvedParams.id },
    include: {
      receipts: { orderBy: { createdAt: "desc" } },
      inventory: {
        include: { category: true },
        orderBy: { name: "asc" }
      },
      categories: { orderBy: { name: "asc" } },
    }
  });

  if (!party) notFound();

  return (
    <div className="space-y-6">
      <ReceiptsGallery 
        partyId={party.id} 
        receipts={party.receipts}
        inventory={party.inventory}
        categories={party.categories}
      />
    </div>
  );
}
