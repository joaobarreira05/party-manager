"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveInventoryItem, createCategory } from "./actions";

type ItemType = {
  id?: string;
  name?: string;
  categoryId?: string | null;
  unit?: string;
  initialQuantity?: number;
  totalPrice?: number;
  notes?: string | null;
};

export function InventoryDialog({ 
  partyId, 
  categories,
  open,
  onOpenChange,
  item
}: { 
  partyId: string;
  categories: { id: string, name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ItemType | null;
}) {
  const [state, formAction, isPending] = useActionState(saveInventoryItem, null);
  const [selectedCategory, setSelectedCategory] = useState(item?.categoryId || "none");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [localCategories, setLocalCategories] = useState(categories);

  useEffect(() => {
    if (state?.success) {
      toast.success(item ? "Produto atualizado!" : "Produto adicionado!");
      onOpenChange(false);
    }
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange, item]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const result = await createCategory(partyId, newCategoryName.trim());
      if (result?.id) {
        setLocalCategories(prev => [...prev, { id: result.id, name: newCategoryName.trim() }]);
        setSelectedCategory(result.id);
        setShowNewCategory(false);
        setNewCategoryName("");
        toast.success("Categoria criada!");
      }
    } catch {
      toast.error("Erro ao criar categoria");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Editar Produto" : "Adicionar Produto"}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes do produto no inventário.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="partyId" value={partyId} />
          {item?.id && <input type="hidden" name="id" value={item.id} />}
          <input type="hidden" name="categoryId" value={selectedCategory === "none" ? "" : selectedCategory} />
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto</Label>
              <Input id="name" name="name" required defaultValue={item?.name} placeholder="Ex: Vodka Absolut" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria (opcional)</Label>
                {!showNewCategory ? (
                  <div className="space-y-2">
                    <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val ?? "none")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sem categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem categoria</SelectItem>
                        {localCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowNewCategory(true)}>
                      <Plus className="mr-1 h-3 w-3" /> Criar nova categoria
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nome da categoria"
                      className="flex-1"
                    />
                    <Button type="button" size="sm" onClick={handleCreateCategory} disabled={isCreatingCategory}>
                      {isCreatingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewCategory(false)}>
                      ✕
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unidade</Label>
                <Input id="unit" name="unit" required defaultValue={item?.unit} placeholder="Ex: Garrafas" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initialQuantity">Quantidade Inicial</Label>
                <Input id="initialQuantity" name="initialQuantity" type="number" step="0.01" required defaultValue={item?.initialQuantity} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalPrice">Preço Total (€)</Label>
                <Input id="totalPrice" name="totalPrice" type="number" step="0.01" required defaultValue={item?.totalPrice} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Input id="notes" name="notes" defaultValue={item?.notes || ""} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
