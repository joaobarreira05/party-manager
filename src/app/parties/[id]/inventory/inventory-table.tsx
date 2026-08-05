"use client";

import React, { useState, useTransition } from "react";
import { Plus, Edit, Trash2, Copy, Loader2, Upload, ShoppingCart, Lock } from "lucide-react";
import * as XLSX from "xlsx";
import { Search } from "lucide-react";
import { toast } from "sonner";
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
  TableFooter,
} from "@/components/ui/table";
import { InventoryDialog } from "./inventory-dialog";
import { RestockDialog } from "./restock-dialog";
import { deleteInventoryItem, duplicateInventoryItem, importInventoryItems, deleteAllInventoryItems } from "./actions";
import { useActiveParticipant } from "@/lib/use-active-participant";

export function InventoryTable({ partyId, items, categories }: any) {
  const { currentParticipant } = useActiveParticipant(partyId);
  const isManager = currentParticipant?.role === "manager";

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredItems = items.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" 
      || (selectedCategory === "none" && !item.categoryId)
      || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedItems = [...filteredItems].sort((a: any, b: any) => {
    const catA = a.category?.name || "zzz_Sem Categoria";
    const catB = b.category?.name || "zzz_Sem Categoria";
    const catCompare = catA.localeCompare(catB);
    if (catCompare !== 0) return catCompare;
    return a.name.localeCompare(b.name);
  });

  const totalGasto = sortedItems.reduce((acc: number, item: any) => acc + item.totalPrice, 0);

  const handleEdit = (item: any) => {
    if (!isManager) {
      toast.error("Apenas o Gestor pode editar produtos!");
      return;
    }
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    if (!isManager) {
      toast.error("Apenas o Gestor pode adicionar novos produtos!");
      return;
    }
    setSelectedItem(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!isManager) {
      toast.error("Apenas o Gestor pode apagar produtos!");
      return;
    }
    if (confirm("Tem a certeza que deseja apagar este produto?")) {
      startTransition(() => {
        deleteInventoryItem(id, partyId);
      });
    }
  };

  const handleDuplicate = (id: string) => {
    if (!isManager) {
      toast.error("Apenas o Gestor pode duplicar produtos!");
      return;
    }
    startTransition(() => {
      duplicateInventoryItem(id, partyId);
    });
  };

  const handleDeleteAll = () => {
    if (!isManager) {
      toast.error("Apenas o Gestor pode apagar o inventário!");
      return;
    }
    if (confirm("Tens a certeza que queres eliminar tudo?")) {
      startTransition(() => {
        deleteAllInventoryItems(partyId);
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isManager) {
      toast.error("Apenas o Gestor pode importar ficheiros!");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames.length > 1 ? wb.SheetNames[1] : wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length > 0) {
          startTransition(async () => {
            await importInventoryItems(data, partyId);
            toast.success(`${data.length} produtos importados!`);
          });
        }
      } catch (err) {
        toast.error("Erro ao ler o ficheiro Excel.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventário</h2>
          <p className="text-muted-foreground">Gerir produtos, comidas e bebidas da festa.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isManager ? (
            <>
              {items.length > 0 && (
                <>
                  <Button variant="destructive" onClick={handleDeleteAll} disabled={isPending}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Apagar Tudo
                  </Button>
                  <Button variant="outline" onClick={() => setIsRestockOpen(true)} disabled={isPending}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Adicionar Compras
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => document.getElementById('excel-upload')?.click()} disabled={isPending}>
                <Upload className="mr-2 h-4 w-4" />
                Importar Excel
              </Button>
              <input 
                type="file" 
                id="excel-upload" 
                className="hidden" 
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
              />
              <Button onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
            </>
          ) : (
            <div className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg flex items-center gap-1.5 border">
              <Lock className="w-3.5 h-3.5" /> Apenas o Gestor pode editar o inventário
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar produto..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v ?? "all")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            <SelectItem value="none">Sem Categoria</SelectItem>
            {categories.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Qtd. Inicial</TableHead>
              <TableHead className="text-right">Qtd. Restante</TableHead>
              <TableHead className="text-right">Preço Total</TableHead>
              <TableHead className="text-right">Preço Unit.</TableHead>
              {isManager && <TableHead className="w-[150px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={isManager ? 7 : 6} className="text-center h-24 text-muted-foreground">
                  Sem produtos encontrados.
                </TableCell>
              </TableRow>
            )}
            {sortedItems.map((item: any, index: number) => {
              const prevItem = index > 0 ? sortedItems[index - 1] : null;
              const currentCatName = item.category?.name || "Sem Categoria";
              const prevCatName = prevItem ? (prevItem.category?.name || "Sem Categoria") : null;
              const showCategoryHeader = !prevCatName || prevCatName !== currentCatName;

              return (
                <React.Fragment key={item.id}>
                  {showCategoryHeader && (
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={isManager ? 7 : 6} className="font-semibold text-muted-foreground py-2">
                        {currentCatName}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="font-medium">
                      {item.name}
                      {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                    </TableCell>
                    <TableCell>{item.category?.name || <span className="text-muted-foreground italic">—</span>}</TableCell>
                    <TableCell className="text-right">{item.initialQuantity} {item.unit}</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {item.remainingQuantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">{item.totalPrice.toFixed(2)} €</TableCell>
                    <TableCell className="text-right">{item.unitPrice.toFixed(2)} €</TableCell>
                    {isManager && (
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleDuplicate(item.id)} disabled={isPending}>
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={isPending}>
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} disabled={isPending} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
          {sortedItems.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="text-right font-bold">Total do Inventário:</TableCell>
                <TableCell className="text-right font-bold">{totalGasto.toFixed(2)} €</TableCell>
                <TableCell colSpan={isManager ? 2 : 1}></TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {isDialogOpen && isManager && (
        <InventoryDialog 
          partyId={partyId}
          categories={categories}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          item={selectedItem}
        />
      )}

      {isRestockOpen && isManager && (
        <RestockDialog
          partyId={partyId}
          items={items}
          open={isRestockOpen}
          onOpenChange={setIsRestockOpen}
        />
      )}
    </div>
  );
}
