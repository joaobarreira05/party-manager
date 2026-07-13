"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Wallet, Users, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpenseDialog } from "./expense-dialog";
import { deleteExpense } from "./actions";

export function ExpensesList({ partyId, expenses, participants, categories }: any) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayer, setSelectedPayer] = useState("all");

  const filteredExpenses = expenses.filter((expense: any) => {
    const matchesSearch = expense.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPayer = selectedPayer === "all" || expense.paidById === selectedPayer;
    return matchesSearch && matchesPayer;
  });

  const handleDelete = (id: string) => {
    if (confirm("Tem a certeza que deseja apagar esta despesa?")) {
      startTransition(() => {
        deleteExpense(id, partyId);
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Despesas Extras</h2>
          <p className="text-muted-foreground">Registe despesas que não pertencem ao inventário (ex: Gasolina, Alojamento).</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Despesa
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar despesa..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedPayer} onValueChange={(v) => setSelectedPayer(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Quem Pagou" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Pagadores</SelectItem>
            {participants.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Quem Pagou</TableHead>
              <TableHead>Divisão</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  Sem despesas encontradas.
                </TableCell>
              </TableRow>
            )}
            {filteredExpenses.map((expense: any) => (
              <TableRow key={expense.id}>
                <TableCell className="font-medium">{expense.name}</TableCell>
                <TableCell>{expense.category?.name || <span className="text-muted-foreground italic">—</span>}</TableCell>
                <TableCell>{expense.paidBy ? expense.paidBy.name : "Indefinido"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {expense.participants.length} pessoas
                </TableCell>
                <TableCell className="text-right font-semibold">{expense.amount.toFixed(2)} €</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)} disabled={isPending} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {isDialogOpen && (
        <ExpenseDialog 
          partyId={partyId}
          participants={participants}
          categories={categories}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </div>
  );
}
