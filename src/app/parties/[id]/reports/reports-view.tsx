"use client";

import { useMemo } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ReportsView({ party, balances, transfers }: any) {
  
  const { totalGasto, totalAlcohol, totalFood, stockValue, exhaustedItems, topItems } = useMemo(() => {
    let tGasto = 0;
    let tAlc = 0;
    let tFood = 0;

    party.expenses.forEach((e: any) => {
      tGasto += e.amount;
      if (e.category?.isAlcohol) tAlc += e.amount;
      else if (e.category?.name?.toLowerCase().includes("comida")) tFood += e.amount;
    });

    party.inventory.forEach((i: any) => {
      tGasto += i.totalPrice;
      if (i.category?.isAlcohol) tAlc += i.totalPrice;
      else if (i.category?.name?.toLowerCase().includes("comida")) tFood += i.totalPrice;
    });

    const sValue = party.inventory.reduce((sum: number, i: any) => sum + (i.unitPrice * i.remainingQuantity), 0);
    
    const exhausted = party.inventory.filter((i: any) => i.remainingQuantity <= 0);

    const usedMap = new Map<string, number>();
    party.events.forEach((e: any) => {
      e.itemsUsed.forEach((iu: any) => {
        const current = usedMap.get(iu.inventoryItem.name) || 0;
        usedMap.set(iu.inventoryItem.name, current + iu.quantityUsed);
      });
    });

    const top = Array.from(usedMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalGasto: tGasto,
      totalAlcohol: tAlc,
      totalFood: tFood,
      stockValue: sValue,
      exhaustedItems: exhausted,
      topItems: top
    };
  }, [party]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Balances Sheet
    const balancesData = party.participants.map((p: any) => ({
      Nome: p.name,
      'Já Pagou (€)': balances[p.id].paid.toFixed(2),
      'Total a Pagar (€)': balances[p.id].owes.toFixed(2),
      'Saldo (€)': balances[p.id].balance.toFixed(2),
    }));
    const ws1 = XLSX.utils.json_to_sheet(balancesData);
    XLSX.utils.book_append_sheet(wb, ws1, "Saldos");

    // Transfers Sheet
    const transfersData = transfers.map((t: any) => {
      const from = party.participants.find((p:any) => p.id === t.from)?.name;
      const to = party.participants.find((p:any) => p.id === t.to)?.name;
      return {
        De: from,
        Para: to,
        'Valor (€)': t.amount.toFixed(2)
      };
    });
    const ws2 = XLSX.utils.json_to_sheet(transfersData);
    XLSX.utils.book_append_sheet(wb, ws2, "Transferências");

    XLSX.writeFile(wb, `${party.name}-Relatorio.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`Relatório: ${party.name}`, 14, 22);

    doc.setFontSize(14);
    doc.text("Saldos Finais", 14, 32);

    const balancesBody = party.participants.map((p: any) => [
      p.name,
      balances[p.id].paid.toFixed(2) + ' €',
      balances[p.id].owes.toFixed(2) + ' €',
      balances[p.id].balance.toFixed(2) + ' €'
    ]);

    autoTable(doc, {
      startY: 36,
      head: [['Nome', 'Já Pagou', 'Total a Pagar', 'Saldo']],
      body: balancesBody,
    });

    const finalY = (doc as any).lastAutoTable.finalY || 40;
    
    doc.text("Acerto de Contas (Transferências)", 14, finalY + 10);

    const transfersBody = transfers.map((t: any) => {
      const from = party.participants.find((p:any) => p.id === t.from)?.name;
      const to = party.participants.find((p:any) => p.id === t.to)?.name;
      return [from, "paga a", to, t.amount.toFixed(2) + ' €'];
    });

    autoTable(doc, {
      startY: finalY + 14,
      head: [['De', '', 'Para', 'Valor']],
      body: transfersBody,
    });

    doc.save(`${party.name}-Relatorio.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Relatórios e Fechar Contas</h2>
          <p className="text-muted-foreground">Estatísticas e cálculos finais de quem deve a quem.</p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button />}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportExcel}>
              <FileDown className="mr-2 h-4 w-4" />
              Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportPDF}>
              <FileText className="mr-2 h-4 w-4" />
              PDF (.pdf)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalGasto.toFixed(2)} €</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total em Álcool</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalAlcohol.toFixed(2)} €</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total em Comida</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalFood.toFixed(2)} €</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor em Stock (Sobra)</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stockValue.toFixed(2)} €</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Produtos Esgotados</CardTitle>
          </CardHeader>
          <CardContent>
            {exhaustedItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum produto esgotado.</p>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-sm">
                {exhaustedItems.map((i: any) => (
                  <li key={i.id}>{i.name} ({i.initialQuantity} {i.unit})</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Utilizados</CardTitle>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum produto consumido ainda.</p>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-sm">
                {topItems.map((i: any) => (
                  <li key={i.name}>{i.name} - {i.count} usados</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acerto de Contas</CardTitle>
          <CardDescription>O algoritmo minimiza o número de transferências necessárias.</CardDescription>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              As contas estão certas. Ninguém deve nada!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quem deve (De)</TableHead>
                  <TableHead>Quem recebe (Para)</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t: any, idx: number) => {
                  const from = party.participants.find((p:any) => p.id === t.from)?.name;
                  const to = party.participants.find((p:any) => p.id === t.to)?.name;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-destructive">{from}</TableCell>
                      <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">{to}</TableCell>
                      <TableCell className="text-right font-bold">{t.amount.toFixed(2)} €</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
