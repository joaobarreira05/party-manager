import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { InventoryTable } from "./inventory-table";

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
      <InventoryTable 
        partyId={party.id} 
        items={party.inventory} 
        categories={party.categories} 
      />
    </div>
  );
}
