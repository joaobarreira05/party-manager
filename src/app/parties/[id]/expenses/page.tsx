import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ExpensesList } from "./expenses-list";

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  
  const party = await prisma.party.findUnique({
    where: { id: resolvedParams.id },
    include: {
      participants: { orderBy: { name: "asc" } },
      categories: { orderBy: { name: "asc" } },
      expenses: {
        include: {
          paidBy: true,
          category: true,
          participants: true
        },
        orderBy: { name: "asc" }
      }
    }
  });

  if (!party) notFound();

  return (
    <div className="space-y-6">
      <ExpensesList 
        partyId={party.id} 
        expenses={party.expenses} 
        participants={party.participants}
        categories={party.categories}
      />
    </div>
  );
}
