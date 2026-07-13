import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Wallet, PackageOpen } from "lucide-react";
import { SummaryChart } from "./summary-chart";

export default async function PartySummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const partyId = resolvedParams.id;

  const party = await prisma.party.findUnique({
    where: { id: partyId, deletedAt: null },
    include: {
      participants: true,
      events: true,
      inventory: {
        include: { category: true }
      },
      expenses: {
        include: { category: true }
      },
      categories: true,
    },
  });

  if (!party) notFound();

  // Calculations
  const expensesTotal = party.expenses.reduce((sum, e) => sum + e.amount, 0);
  const inventoryTotal = party.inventory.reduce((sum, i) => sum + i.totalPrice, 0);
  const totalGasto = expensesTotal + inventoryTotal;
  
  const valorStock = party.inventory.reduce((sum, i) => sum + (i.unitPrice * i.remainingQuantity), 0);

  // Group by category for chart
  // This aggregates both direct expenses and inventory costs (initial purchase cost) per category
  const categoryMap = new Map<string, number>();
  
  party.expenses.forEach(e => {
    const catName = e.category?.name || "Sem Categoria";
    const val = categoryMap.get(catName) || 0;
    categoryMap.set(catName, val + e.amount);
  });
  
  party.inventory.forEach(i => {
    const catName = i.category?.name || "Sem Categoria";
    const val = categoryMap.get(catName) || 0;
    categoryMap.set(catName, val + i.totalPrice);
  });

  const chartData = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGasto.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground mt-1">
              Despesas ({expensesTotal.toFixed(2)} €) + Inventário ({inventoryTotal.toFixed(2)} €)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor em Stock</CardTitle>
            <PackageOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{valorStock.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground mt-1">
              Valor do inventário restante
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Participantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{party.participants.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Eventos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{party.events.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
            <CardDescription>Distribuição dos gastos totais (incluindo inventário inicial)</CardDescription>
          </CardHeader>
          <CardContent>
            <SummaryChart data={chartData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
