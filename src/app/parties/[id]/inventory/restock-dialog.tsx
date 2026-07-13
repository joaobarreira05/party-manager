"use client";

import { useState, useTransition } from "react";
import { Loader2, Search, ShoppingCart, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { restockItems } from "./actions";

type RestockEntry = {
  id: string;
  name: string;
  unit: string;
  currentQuantity: number;
  addQuantity: number;
  addPrice: number;
};

export function RestockDialog({
  partyId,
  items,
  open,
  onOpenChange,
}: {
  partyId: string;
  items: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [restockEntries, setRestockEntries] = useState<Record<string, RestockEntry>>({});

  const filteredItems = items.filter((item: any) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const updateEntry = (item: any, field: "addQuantity" | "addPrice", value: number) => {
    setRestockEntries(prev => ({
      ...prev,
      [item.id]: {
        id: item.id,
        name: item.name,
        unit: item.unit,
        currentQuantity: item.remainingQuantity,
        addQuantity: field === "addQuantity" ? value : (prev[item.id]?.addQuantity || 0),
        addPrice: field === "addPrice" ? value : (prev[item.id]?.addPrice || 0),
      }
    }));
  };

  const getEntry = (itemId: string) => restockEntries[itemId];

  const activeEntries = Object.values(restockEntries).filter(e => e.addQuantity > 0);

  const handleSave = () => {
    if (activeEntries.length === 0) {
      toast.error("Adicione pelo menos uma quantidade a algum produto");
      return;
    }

    startTransition(async () => {
      const res = await restockItems(
        partyId,
        activeEntries.map(e => ({ id: e.id, addQuantity: e.addQuantity, addPrice: e.addPrice }))
      );
      if (res?.success) {
        toast.success(`${activeEntries.length} produto(s) reabastecido(s)!`);
        onOpenChange(false);
        setRestockEntries({});
      }
    });
  };

  const totalNewCost = activeEntries.reduce((sum, e) => sum + e.addPrice, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Adicionar Compras
          </DialogTitle>
          <DialogDescription>
            Selecione os produtos existentes e adicione a quantidade comprada. O inventário será atualizado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar produto..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {activeEntries.length > 0 && (
            <div className="flex items-center justify-between mt-3 p-2 bg-primary/5 rounded-md">
              <span className="text-sm font-medium">
                {activeEntries.length} produto(s) • Total: {totalNewCost.toFixed(2)} €
              </span>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-2">
            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum produto encontrado.
              </div>
            )}
            {filteredItems.map((item: any) => {
              const entry = getEntry(item.id);
              const hasValue = entry && entry.addQuantity > 0;

              return (
                <div
                  key={item.id}
                  className={`border rounded-lg p-3 transition-colors ${hasValue ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.remainingQuantity} {item.unit} em stock
                      </Badge>
                      {item.category && (
                        <Badge variant="secondary" className="text-xs">{item.category.name}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">+ Quantidade</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        className="h-8 text-sm"
                        value={entry?.addQuantity || ""}
                        onChange={(e) => updateEntry(item, "addQuantity", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Custo (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="h-8 text-sm"
                        value={entry?.addPrice || ""}
                        onChange={(e) => updateEntry(item, "addPrice", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isPending || activeEntries.length === 0}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reabastecer {activeEntries.length > 0 ? `(${activeEntries.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
