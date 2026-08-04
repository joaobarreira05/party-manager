"use client";

import { useState } from "react";
import { Sparkles, FileText, Image as ImageIcon, CheckCircle2, Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  totalPrice: number;
  unitPrice: number;
  categoryId?: string;
  isAlcohol?: boolean;
}

export function SmartUploadDialog({ partyId }: { partyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "image">("text");
  const [textInput, setTextInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleParse = async () => {
    if (activeTab === "text" && !textInput.trim()) {
      toast.error("Insere o texto das tuas compras");
      return;
    }
    if (activeTab === "image" && !file) {
      toast.error("Seleciona a foto do recibo");
      return;
    }

    setParsing(true);
    const formData = new FormData();
    formData.append("partyId", partyId);
    if (activeTab === "text") formData.append("text", textInput);
    if (activeTab === "image" && file) formData.append("file", file);

    try {
      const res = await fetch("/api/ai/parse-receipt", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao analisar com IA");
        setParsing(false);
        return;
      }

      setItems(data.items || []);
      setCategories(data.categories || []);
      toast.success(`${data.items?.length || 0} produtos identificados! Verifica os valores abaixo.`);
    } catch (e) {
      toast.error("Erro ao comunicar com a IA");
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmItems = async () => {
    if (items.length === 0) {
      toast.error("Não há itens para adicionar");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/parties/${partyId}/inventory/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao guardar inventário");
        setSubmitting(false);
        return;
      }

      toast.success(`${items.length} produtos adicionados ao inventário com sucesso! 🎉`);
      setOpen(false);
      setItems([]);
      setTextInput("");
      setFile(null);
      router.refresh();
    } catch (e) {
      toast.error("Erro ao guardar inventário");
    } finally {
      setSubmitting(false);
    }
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ParsedItem, val: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      if (field === "quantity" || field === "totalPrice") {
        const qty = updated[index].quantity || 1;
        const total = updated[index].totalPrice || 0;
        updated[index].unitPrice = Math.round((total / qty) * 100) / 100;
      }
      return updated;
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold gap-2 shadow-md">
            <Sparkles className="w-4 h-4" /> Importar com IA (Texto / Foto)
          </Button>
        }
      />
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" /> Leitura Inteligente com IA
          </DialogTitle>
          <DialogDescription>
            Envia o texto com a lista de compras ou a foto do recibo. A IA analisa os produtos e podes rever antes de adicionar ao inventário.
          </DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="space-y-4 pt-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "text" | "image")}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="text" className="gap-2">
                  <FileText className="w-4 h-4" /> Colar Texto de Compras
                </TabsTrigger>
                <TabsTrigger value="image" className="gap-2">
                  <ImageIcon className="w-4 h-4" /> Enviar Foto do Recibo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-3 pt-3">
                <Textarea
                  placeholder={`Exemplo:\n3x Cápsulas de Café 6.27\n5x Vodka 39.95\n2kg Bifanas 10.50`}
                  rows={6}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
              </TabsContent>

              <TabsContent value="image" className="space-y-3 pt-3">
                <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <div className="text-xs text-muted-foreground">Suporta fotos em JPG ou PNG de recibos e faturas.</div>
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleParse}
              disabled={parsing}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-11 gap-2"
            >
              {parsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> A Analisar com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Analisar Produtos
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Verification List */
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between bg-purple-500/10 p-3 rounded-lg border border-purple-500/20 text-purple-700 text-sm font-semibold">
              <span>Verificação de Produtos Extraídos ({items.length})</span>
              <Button size="sm" variant="ghost" onClick={() => setItems([])}>
                Refazer Leitura
              </Button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 border rounded-lg bg-card text-xs">
                  <div className="col-span-4">
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(idx, "name", e.target.value)}
                      className="h-8 text-xs font-semibold"
                    />
                  </div>

                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 1)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="col-span-2">
                    <Input
                      value={item.unit}
                      onChange={(e) => updateItem(idx, "unit", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="col-span-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={item.totalPrice}
                      onChange={(e) => updateItem(idx, "totalPrice", parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-bold"
                    />
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => removeItem(idx)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t font-bold text-sm">
              <span>Total Estimado:</span>
              <span className="text-purple-600 text-base">
                {items.reduce((s, i) => s + (Number(i.totalPrice) || 0), 0).toFixed(2)} €
              </span>
            </div>

            <Button
              onClick={handleConfirmItems}
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> A Guardar...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Confirmar e Adicionar Todos ao Inventário! 🎉
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
