"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, Users, Wallet, PackageOpen, Search, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { exportDatabaseToJson } from "./export-action";

export function DashboardClient({ parties }: { parties: any[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, startExport] = useTransition();

  const handleExport = () => {
    startExport(async () => {
      const res = await exportDatabaseToJson();
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Base de dados exportada com sucesso para: ${res?.path}`);
      }
    });
  };

  const filteredParties = parties.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">As Minhas Festas</h1>
          <p className="text-muted-foreground mt-1">
            Faça a gestão de eventos, despesas e inventário.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar festas..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={handleExport} disabled={isExporting} className="w-full sm:w-auto">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Exportar DB (JSON)
          </Button>
        </div>
      </div>

      {filteredParties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl border-dashed bg-muted/30">
          <PackageOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Nenhuma festa encontrada</h2>
          <p className="text-muted-foreground mb-6 max-w-sm mt-2">
            {searchQuery 
              ? "Não foram encontradas festas com esse nome." 
              : "Comece por criar uma nova festa para gerir as suas despesas e inventário."}
          </p>
          {!searchQuery && (
            <Link href="/parties/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Criar Nova Festa
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParties.map((party) => {
            const totalGasto =
              party.expenses.reduce((sum: number, e: any) => sum + e.amount, 0) +
              party.inventory.reduce((sum: number, i: any) => sum + i.totalPrice, 0);
            const valorStock = party.inventory.reduce(
              (sum: number, i: any) => sum + i.unitPrice * i.remainingQuantity,
              0
            );

            return (
              <Link href={`/parties/${party.id}`} key={party.id}>
                <Card className="hover:border-primary/50 transition-colors h-full flex flex-col cursor-pointer">
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{party.name}</CardTitle>
                    <CardDescription>
                      {party.startDate && format(new Date(party.startDate), "dd MMM yyyy")}
                      {party.endDate && ` - ${format(new Date(party.endDate), "dd MMM yyyy")}`}
                      {!party.startDate && !party.endDate && "Sem data definida"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> Participantes
                        </span>
                        <span className="font-medium">{party.participants.length}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Wallet className="h-3.5 w-3.5" /> Gasto
                        </span>
                        <span className="font-medium">{totalGasto.toFixed(2)} €</span>
                      </div>
                      <div className="flex flex-col gap-1 col-span-2">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <PackageOpen className="h-3.5 w-3.5" /> Em Stock
                        </span>
                        <span className="font-medium">{valorStock.toFixed(2)} €</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
