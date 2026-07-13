import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EventsList } from "./events-list";

export default async function EventsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  
  const party = await prisma.party.findUnique({
    where: { id: resolvedParams.id },
    include: {
      participants: { orderBy: { name: "asc" } },
      inventory: { orderBy: { name: "asc" } },
      events: {
        include: {
          participants: { include: { participant: true } },
          itemsUsed: { include: { inventoryItem: { include: { category: true } } } }
        },
        orderBy: { date: "desc" }
      }
    }
  });

  if (!party) notFound();

  return (
    <div className="space-y-6">
      <EventsList 
        partyId={party.id} 
        events={party.events} 
        participants={party.participants}
        inventory={party.inventory}
      />
    </div>
  );
}
