import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ReportsView } from "./reports-view";
import { calculateBalances, calculateTransfers, PartyWithDetails } from "@/lib/calculations";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  
  const party = await prisma.party.findUnique({
    where: { id: resolvedParams.id },
    include: {
      participants: { orderBy: { name: "asc" } },
      categories: true,
      events: {
        include: {
          participants: true,
          itemsUsed: { include: { inventoryItem: { include: { category: true } } } }
        }
      },
      expenses: {
        include: { participants: true, category: true, paidBy: true }
      },
      inventory: {
        include: { category: true }
      }
    }
  });

  if (!party) notFound();

  const partyWithDetails = party as unknown as PartyWithDetails;
  const balances = calculateBalances(partyWithDetails);
  const transfers = calculateTransfers(balances, party.participants);

  return (
    <div className="space-y-6 pb-20">
      <ReportsView 
        party={party} 
        balances={balances} 
        transfers={transfers}
      />
    </div>
  );
}
