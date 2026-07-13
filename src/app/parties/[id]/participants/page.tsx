import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { calculateBalances } from "@/lib/calculations";
import { ParticipantDialog } from "./participant-dialog";
import { PartyWithDetails } from "@/lib/calculations";
import { ParticipantList } from "./participant-list";

export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  
  const party = await prisma.party.findUnique({
    where: { id: resolvedParams.id },
    include: {
      participants: { orderBy: { name: "asc" } },
      events: {
        include: {
          participants: true,
          itemsUsed: { include: { inventoryItem: { include: { category: true } } } }
        }
      },
      expenses: {
        include: { participants: true }
      },
      inventory: {
        include: { category: true }
      }
    }
  });

  if (!party) notFound();

  // TypeScript needs a bit of help with the exact nested types Prisma returns
  const partyWithDetails = party as unknown as PartyWithDetails;
  const balances = calculateBalances(partyWithDetails);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Participantes</h2>
          <p className="text-muted-foreground">Gerir as pessoas que participam na festa.</p>
        </div>
        <ParticipantDialog partyId={party.id} />
      </div>

      <ParticipantList 
        partyId={party.id} 
        participants={party.participants} 
        balances={balances} 
      />
    </div>
  );
}
