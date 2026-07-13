"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { saveExpense } from "./actions";

export function ExpenseDialog({ partyId, participants, categories, open, onOpenChange }: any) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("none");
  const [paidById, setPaidById] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  // By default, select all participants
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    participants.map((p: any) => p.id)
  );

  const handleSave = () => {
    if (!name || !amount) {
      toast.error("Preencha a descrição e o valor");
      return;
    }

    startTransition(async () => {
      const res = await saveExpense({
        partyId,
        name,
        amount,
        categoryId: categoryId === "none" ? null : categoryId,
        paidById,
        participants: selectedParticipants
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Despesa guardada!");
        onOpenChange(false);
      }
    });
  };

  const toggleParticipant = (id: string) => {
    if (selectedParticipants.includes(id)) {
      setSelectedParticipants(prev => prev.filter(p => p !== id));
    } else {
      setSelectedParticipants(prev => [...prev, id]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Nova Despesa</DialogTitle>
          <DialogDescription>Registe uma despesa extra e quem a pagou.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Gasolina" />
                </div>
                <div className="space-y-2">
                  <Label>Valor (€)</Label>
                  <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria (opcional)</Label>
                  <Select value={categoryId} onValueChange={(val) => setCategoryId(val ?? "none")}>
                    <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quem Pagou?</Label>
                  <Select value={paidById} onValueChange={(val) => setPaidById(val as string)}>
                    <SelectTrigger><SelectValue placeholder="Alguém..." /></SelectTrigger>
                    <SelectContent>
                      {participants.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Dividir por (Quem usufruiu)</Label>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedParticipants(participants.map((p:any) => p.id))}>Todos</Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedParticipants([])}>Nenhum</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
                {participants.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <Checkbox 
                      id={`p-${p.id}`} 
                      checked={selectedParticipants.includes(p.id)}
                      onCheckedChange={() => toggleParticipant(p.id)}
                    />
                    <Label htmlFor={`p-${p.id}`} className="font-normal cursor-pointer">{p.name}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Despesa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
