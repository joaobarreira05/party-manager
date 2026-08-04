import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { InventoryTable } from "./inventory-table";
import { SmartUploadDialog } from "./smart-upload-dialog";

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  
  const party = await prisma.party.findUnique({
    where: { id: resolvedParams.id },
    include: {
      inventory: {
        include: { category: true },
        orderBy: { name: "asc" }
      },
      categories: {
        orderBy: { name: "asc" }
      }
    }
  });

  if (!party) notFound();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Gestão de Inventário</h2>
          <p className="text-xs text-muted-foreground">Regista e controla tudo o que se comprou e consumiu na festa.</p>
        </div>
        <SmartUploadDialog partyId={party.id} />
      </div>

      <InventoryTable 
        partyId={party.id} 
        items={party.inventory} 
        categories={party.categories} 
      />
    </div>
  );
}
