"use client";

import { useState, useTransition } from "react";
import { Loader2, Search, ShoppingCart, Sparkles, Plus, TextQuote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { restockItems, importInventoryItems } from "./actions";

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

  // AI Text tab state
  const [aiText, setAiText] = useState("");
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [parsedAiItems, setParsedAiItems] = useState<any[]>([]);

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

  const handleSaveManual = () => {
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

  const handleAiParse = async () => {
    if (!aiText.trim()) {
      toast.error("Escreve ou cola o texto das tuas compras");
      return;
    }

    setIsAiParsing(true);
    try {
      const res = await fetch("/api/ai/parse-text-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });
      const data = await res.json();

      if (data?.items && data.items.length > 0) {
        setParsedAiItems(data.items);
        toast.success(`${data.items.length} produto(s) detetado(s) pela IA!`);
      } else {
        toast.error("Não foi possível extrair produtos do texto.");
      }
    } catch {
      toast.error("Erro ao analisar texto com IA");
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleSaveAiItems = () => {
    if (parsedAiItems.length === 0) {
      toast.error("Nenhum produto analisado para guardar");
      return;
    }

    startTransition(async () => {
      await importInventoryItems(parsedAiItems, partyId);
      toast.success(`${parsedAiItems.length} produto(s) adicionados ao inventário! 🤖`);
      onOpenChange(false);
      setAiText("");
      setParsedAiItems([]);
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
            Escolha entre selecionar produtos manualmente ou colar texto de compras para a IA interpretar automaticamente.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ai" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-2 grid grid-cols-2">
            <TabsTrigger value="ai" className="gap-1.5 font-bold">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Com IA 🤖 (Texto)
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-1.5">
              <ShoppingCart className="h-4 w-4" />
              Manual por Lista
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: AI Text Input */}
          <TabsContent value="ai" className="flex-1 flex flex-col p-6 space-y-4 overflow-auto">
            <div className="space-y-2">
              <Label className="font-bold flex items-center gap-1.5">
                <TextQuote className="w-4 h-4 text-amber-500" /> Cola ou escreve o que compraste
              </Label>
              <Textarea
                placeholder="Exemplo: comprei 7 caixas de minis a 15€ cada, 15 vodkas a 7€ cada, 5 gins a 7.5€..."
                rows={4}
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                className="text-sm font-medium"
              />
            </div>

            <Button
              onClick={handleAiParse}
              disabled={isAiParsing || !aiText.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 w-full"
            >
              {isAiParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Analisar Compras com Gemini IA 🤖
            </Button>

            {parsedAiItems.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs text-emerald-600 uppercase tracking-wider">
                  Produtos Detetados ({parsedAiItems.length}):
                </h4>
                <div className="border rounded-lg divide-y bg-card text-xs">
                  {parsedAiItems.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold">{item.name}</span>
                        <span className="text-muted-foreground ml-2">
                          ({item.quantity} {item.unit})
                        </span>
                      </div>
                      <div className="font-bold text-emerald-600">
                        {item.totalPrice > 0 ? `${item.totalPrice.toFixed(2)} €` : `${item.unitPrice || 0} €/un`}
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleSaveAiItems}
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 w-full shadow-lg"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar & Adicionar {parsedAiItems.length} Produtos ao Inventário 🎉
                </Button>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: Manual Item Selection */}
          <TabsContent value="manual" className="flex-1 flex flex-col overflow-hidden">
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
              <Button onClick={handleSaveManual} disabled={isPending || activeEntries.length === 0}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reabastecer {activeEntries.length > 0 ? `(${activeEntries.length})` : ""}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
