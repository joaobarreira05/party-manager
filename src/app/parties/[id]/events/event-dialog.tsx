"use client";

import React, { useState, useTransition, useMemo } from "react";
import { Plus, Loader2, Trash2, Users, PackageOpen, Check, ChevronsUpDown, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveEvent } from "./actions";
import { useActiveParticipant } from "@/lib/use-active-participant";

export function EventDialog({ 
  partyId, 
  participants,
  inventory,
  open,
  onOpenChange,
  existingEvent
}: any) {
  const { currentParticipant } = useActiveParticipant(partyId);
  const isManager = currentParticipant?.role === "manager";

  const [isPending, startTransition] = useTransition();
  const isEditing = !!existingEvent;

  const [name, setName] = useState(existingEvent?.name || "");
  const [date, setDate] = useState(
    existingEvent?.date ? new Date(existingEvent.date).toISOString().split('T')[0] : ""
  );
  const [description, setDescription] = useState(existingEvent?.description || "");
  const [profitMargin, setProfitMargin] = useState<number>(existingEvent?.profitMargin ?? 5);
  const [itemSearch, setItemSearch] = useState("");

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    existingEvent?.participants?.map((ep: any) => ep.participantId) || []
  );
  const [selectedItems, setSelectedItems] = useState<{inventoryItemId: string, quantityUsed: number}[]>(
    existingEvent?.itemsUsed?.map((ei: any) => ({
      inventoryItemId: ei.inventoryItemId,
      quantityUsed: ei.quantityUsed
    })) || []
  );

  const inventoryByCategory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const item of inventory) {
      const catName = item.category?.name || "Sem Categoria";
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    if (!itemSearch) return inventoryByCategory;
    const q = itemSearch.toLowerCase();
    return inventoryByCategory
      .map(([cat, items]) => [cat, items.filter((i: any) => i.name.toLowerCase().includes(q))] as [string, any[]])
      .filter(([, items]) => items.length > 0);
  }, [inventoryByCategory, itemSearch]);

  const handleSave = () => {
    if (!name) {
      toast.error("O nome é obrigatório");
      return;
    }
    if (selectedParticipants.length === 0) {
      toast.error("Selecione pelo menos um participante");
      return;
    }

    const itemsToSave = selectedItems.filter(i => i.quantityUsed > 0);

    startTransition(async () => {
      const res = await saveEvent({
        partyId,
        eventId: existingEvent?.id,
        name,
        date,
        description,
        profitMargin: Number(profitMargin),
        participants: selectedParticipants.map(id => ({ participantId: id })),
        items: itemsToSave
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(isEditing ? "Evento atualizado!" : "Evento guardado!");
        onOpenChange(false);
        setName(""); setDate(""); setDescription("");
        setSelectedParticipants([]); setSelectedItems([]);
      }
    });
  };

  const allSelected = participants.length > 0 && selectedParticipants.length === participants.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(participants.map((p: any) => p.id));
    }
  };

  const toggleParticipant = (pId: string) => {
    if (selectedParticipants.includes(pId)) {
      setSelectedParticipants(prev => prev.filter(id => id !== pId));
    } else {
      setSelectedParticipants(prev => [...prev, pId]);
    }
  };

  const getOriginalUsed = (itemId: string) => {
    if (!existingEvent) return 0;
    const found = existingEvent.itemsUsed?.find((ei: any) => ei.inventoryItemId === itemId);
    return found ? found.quantityUsed : 0;
  };

  const getAvailableQuantity = (itemId: string) => {
    const inv = inventory.find((i: any) => i.id === itemId);
    if (!inv) return 0;
    return inv.remainingQuantity + getOriginalUsed(itemId);
  };

  const getItemQuantity = (itemId: string) => {
    const found = selectedItems.find(i => i.inventoryItemId === itemId);
    return found ? found.quantityUsed : 0;
  };

  const setItemQuantity = (itemId: string, qty: number) => {
    const existing = selectedItems.find(i => i.inventoryItemId === itemId);
    if (existing) {
      if (qty <= 0) {
        setSelectedItems(prev => prev.filter(i => i.inventoryItemId !== itemId));
      } else {
        setSelectedItems(prev => prev.map(i => i.inventoryItemId === itemId ? { ...i, quantityUsed: qty } : i));
      }
    } else if (qty > 0) {
      setSelectedItems(prev => [...prev, { inventoryItemId: itemId, quantityUsed: qty }]);
    }
  };

  const incrementItem = (itemId: string) => {
    const current = getItemQuantity(itemId);
    const available = getAvailableQuantity(itemId);
    if (current < available) {
      setItemQuantity(itemId, current + 1);
    }
  };

  const decrementItem = (itemId: string) => {
    const current = getItemQuantity(itemId);
    if (current > 0) {
      setItemQuantity(itemId, current - 1);
    }
  };

  const selectedItemsCount = selectedItems.filter(i => i.quantityUsed > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{isEditing ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          <DialogDescription>
            Registe um evento (ex: Jantar, Almoço, Churrasqueira) e selecione quem esteve presente e o que foi consumido.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-2 grid grid-cols-3">
            <TabsTrigger value="info">
              📝 Info
            </TabsTrigger>
            <TabsTrigger value="participants">
              <Users className="mr-1.5 h-4 w-4" />
              Participantes
              {selectedParticipants.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{selectedParticipants.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="products">
              <PackageOpen className="mr-1.5 h-4 w-4" />
              Consumos
              {selectedItemsCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{selectedItemsCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Info */}
          <TabsContent value="info" className="flex-1 overflow-auto">
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Evento *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Primeiro Jantar" required />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Bifanas e cerveja no primeiro dia..." />
              </div>

              {isManager && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                  <Label className="flex items-center gap-1.5 font-bold text-amber-600 text-xs">
                    <ShieldAlert className="w-4 h-4" /> Margem de Lucro Oculta (%)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={profitMargin}
                      onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0)}
                      className="w-32 font-bold text-sm"
                    />
                    <span className="text-xs text-muted-foreground">
                      Aplica um acrescento de {profitMargin}% aos custos de consumo desta noite no calculador de saldos (visível apenas para o Gestor).
                    </span>
                  </div>
                </div>
              )}

              <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
                <h4 className="font-semibold text-sm">Resumo rápido:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedParticipants.length} participantes selecionados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PackageOpen className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedItemsCount} produtos consumidos</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Participants */}
          <TabsContent value="participants" className="flex-1 overflow-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  {allSelected ? "Desselecionar Todos" : "Selecionar Todos"}
                </Button>
                <Badge variant="outline">{selectedParticipants.length}/{participants.length}</Badge>
              </div>
              
              <div className="border rounded-md divide-y">
                {participants.map((p: any) => {
                  const isSelected = selectedParticipants.includes(p.id);
                  return (
                    <div key={p.id} className={`flex items-center justify-between p-3 hover:bg-muted/50 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          id={`p-${p.id}`} 
                          checked={isSelected} 
                          onCheckedChange={() => toggleParticipant(p.id)} 
                        />
                        <Label htmlFor={`p-${p.id}`} className="font-normal cursor-pointer">{p.name}</Label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: Products / Consumos */}
          <TabsContent value="products" className="flex-1 overflow-auto">
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar produto..."
                  className="pl-8"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
              </div>
              
              <p className="text-sm text-muted-foreground">
                Use os botões <strong>-</strong> e <strong>+</strong> para definir a quantidade consumida de cada produto. Só os produtos com quantidade &gt; 0 serão registados.
              </p>

              <div className="space-y-4">
                {filteredInventory.map(([categoryName, items]) => (
                  <div key={categoryName}>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2 uppercase tracking-wider">{categoryName}</h4>
                    <div className="border rounded-md divide-y">
                      {items.map((inv: any) => {
                        const qty = getItemQuantity(inv.id);
                        const available = getAvailableQuantity(inv.id);
                        const isUsed = qty > 0;

                        return (
                          <div key={inv.id} className={`flex items-center justify-between p-3 hover:bg-muted/50 transition-colors ${isUsed ? 'bg-primary/5' : ''}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium text-sm ${available === 0 && !isUsed ? 'text-muted-foreground line-through' : ''}`}>
                                  {inv.name}
                                </span>
                                {isUsed && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">A usar</Badge>}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                Disponível: {available} {inv.unit}
                                {inv.unitPrice > 0 && ` • ${inv.unitPrice.toFixed(2)} €/un`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 ml-4">
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => decrementItem(inv.id)}
                                disabled={qty === 0}
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={available}
                                className="w-16 h-8 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={qty || ""}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setItemQuantity(inv.id, Math.min(val, available));
                                }}
                              />
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => incrementItem(inv.id)}
                                disabled={available === 0 || qty >= available}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {filteredInventory.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8 border rounded-md border-dashed">
                    Nenhum produto encontrado.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Evento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
