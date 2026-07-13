"use client";

import { useState, useTransition, useRef } from "react";
import { format } from "date-fns";
import { Plus, Trash2, Upload, X, ZoomIn, Store, StickyNote, Calendar, Loader2, Search, PackageOpen, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { deleteReceipt, processReceiptOCR } from "./actions";
import { addReceiptItems } from "../inventory/actions";

type ReceiptItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  totalPrice: number;
};

export function ReceiptsGallery({ partyId, receipts, inventory, categories }: { partyId: string; receipts: any[]; inventory?: any[]; categories?: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showItemsDialog, setShowItemsDialog] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentReceiptId, setCurrentReceiptId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>("");
  const [storeName, setStoreName] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [notes, setNotes] = useState("");

  // Items form state
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([
    { id: crypto.randomUUID(), name: "", quantity: 1, unit: "un", totalPrice: 0 }
  ]);
  const [isSavingItems, setIsSavingItems] = useState(false);

  const filteredReceipts = receipts.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      (r.storeName && r.storeName.toLowerCase().includes(q)) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    );
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setShowUploadDialog(true);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("partyId", partyId);
      if (storeName) formData.append("storeName", storeName);
      if (receiptDate) formData.append("date", receiptDate);
      if (notes) formData.append("notes", notes);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.info("Fatura guardada! A ler a fatura (OCR)...");
        
        let initialItems: ReceiptItem[] = [{ id: crypto.randomUUID(), name: "", quantity: 1, unit: "un", totalPrice: 0 }];
        
        // Process OCR
        if (uploadPreview) {
          try {
            const ocrRes = await processReceiptOCR(uploadPreview);
            if (ocrRes?.success && ocrRes.items && ocrRes.items.length > 0) {
              initialItems = ocrRes.items.map((item: any) => ({
                id: crypto.randomUUID(),
                name: item.name || "",
                quantity: item.quantity || 1,
                unit: item.unit || "un",
                totalPrice: item.totalPrice || 0
              }));
              toast.success(`${initialItems.length} produtos detetados! Reveja-os.`);
            } else if (ocrRes?.error) {
              toast.error(ocrRes.error);
            } else {
              toast.error("Não foi possível extrair produtos. Preencha manualmente.");
            }
          } catch (err) {
            toast.error("Erro no OCR. Pode preencher manualmente.");
          }
        }

        setShowUploadDialog(false);
        resetUploadForm();
        // Show items dialog to review products
        setCurrentReceiptId(data.receipt.id);
        setReceiptItems(initialItems);
        setShowItemsDialog(true);
      }
    } catch (err) {
      toast.error("Erro ao carregar a fatura.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadPreview("");
    setStoreName("");
    setReceiptDate("");
    setNotes("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = (id: string) => {
    if (confirm("Tens a certeza que queres apagar esta fatura?")) {
      startTransition(() => {
        deleteReceipt(id, partyId);
      });
    }
  };

  // --- Items form helpers ---
  const addItemRow = () => {
    setReceiptItems(prev => [...prev, { id: crypto.randomUUID(), name: "", quantity: 1, unit: "un", totalPrice: 0 }]);
  };

  const removeItemRow = (id: string) => {
    setReceiptItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItemRow = (id: string, field: keyof ReceiptItem, value: any) => {
    setReceiptItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSaveItems = async () => {
    const validItems = receiptItems.filter(item => item.name.trim() && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Adicione pelo menos um produto válido");
      return;
    }

    setIsSavingItems(true);
    try {
      const res = await addReceiptItems(
        partyId,
        currentReceiptId,
        validItems.map(item => ({
          name: item.name.trim(),
          quantity: item.quantity,
          unit: item.unit,
          totalPrice: item.totalPrice,
        }))
      );
      if (res?.success) {
        toast.success(`${validItems.length} produto(s) adicionado(s) ao inventário!`);
        setShowItemsDialog(false);
        window.location.reload();
      }
    } catch (err) {
      toast.error("Erro ao guardar produtos.");
    } finally {
      setIsSavingItems(false);
    }
  };

  const handleSkipItems = () => {
    setShowItemsDialog(false);
    window.location.reload();
  };

  // Autocomplete helper from existing inventory
  const existingProductNames = inventory?.map((i: any) => i.name) || [];

  const itemsTotal = receiptItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Faturas & Recibos</h2>
          <p className="text-muted-foreground">Tire uma foto da fatura e adicione os produtos ao inventário.</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Carregar Fatura
          </Button>
        </div>
      </div>

      {receipts.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por loja ou notas..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {filteredReceipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl border-dashed bg-muted/30">
          <Store className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">
            {receipts.length === 0 ? "Sem faturas" : "Nenhuma fatura encontrada"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm mt-2">
            {receipts.length === 0
              ? "Tire uma foto da fatura do supermercado e adicione os produtos diretamente ao inventário."
              : "Tente pesquisar com outros termos."}
          </p>
          {receipts.length === 0 && (
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Carregar Primeira Fatura
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredReceipts.map((receipt) => (
            <Card key={receipt.id} className="overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors">
              <div className="relative aspect-[3/4] bg-muted" onClick={() => setViewingReceipt(receipt)}>
                <img
                  src={receipt.imagePath}
                  alt={receipt.storeName || "Fatura"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {receipt.storeName || "Sem loja"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {receipt.date
                        ? format(new Date(receipt.date), "dd MMM yyyy")
                        : format(new Date(receipt.createdAt), "dd MMM yyyy")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(receipt.id);
                    }}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {receipt.notes && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{receipt.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => { if (!open) { setShowUploadDialog(false); resetUploadForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Carregar Fatura</DialogTitle>
            <DialogDescription>
              Adicione detalhes sobre esta fatura. No passo seguinte poderá adicionar os produtos ao inventário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {uploadPreview && (
              <div className="relative max-h-48 overflow-hidden rounded-md border bg-muted">
                <img src={uploadPreview} alt="Preview" className="w-full object-contain max-h-48" />
              </div>
            )}

            <div className="space-y-2">
              <Label>
                <Store className="inline h-3.5 w-3.5 mr-1.5" />
                Nome da Loja (opcional)
              </Label>
              <Input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ex: Continente, Pingo Doce, Lidl..."
              />
            </div>

            <div className="space-y-2">
              <Label>
                <Calendar className="inline h-3.5 w-3.5 mr-1.5" />
                Data da Compra (opcional)
              </Label>
              <Input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>
                <StickyNote className="inline h-3.5 w-3.5 mr-1.5" />
                Notas (opcional)
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Compras do primeiro dia, faltam as bebidas..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUploadDialog(false); resetUploadForm(); }}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={isUploading || !uploadFile}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Carregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Items Dialog — Add products from receipt */}
      <Dialog open={showItemsDialog} onOpenChange={(open) => { if (!open) handleSkipItems(); }}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Adicionar Produtos da Fatura
            </DialogTitle>
            <DialogDescription>
              Preencha os produtos desta fatura. Produtos com o mesmo nome serão somados ao inventário existente.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-3">
              {receiptItems.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Produto {index + 1}</span>
                    {receiptItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItemRow(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5 space-y-1">
                      <Label className="text-xs">Nome do Produto</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateItemRow(item.id, "name", e.target.value)}
                        placeholder="Ex: Cerveja Super Bock"
                        className="h-9"
                        list={`products-${item.id}`}
                      />
                      <datalist id={`products-${item.id}`}>
                        {existingProductNames.map((name: string) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.quantity || ""}
                        onChange={(e) => updateItemRow(item.id, "quantity", parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Unidade</Label>
                      <Select value={item.unit} onValueChange={(val) => updateItemRow(item.id, "unit", val)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="un">un</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="Garrafas">Garrafas</SelectItem>
                          <SelectItem value="Packs">Packs</SelectItem>
                          <SelectItem value="Caixas">Caixas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Preço Total (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.totalPrice || ""}
                        onChange={(e) => updateItemRow(item.id, "totalPrice", parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" className="w-full border-dashed" onClick={addItemRow}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Mais um Produto
              </Button>
            </div>
          </ScrollArea>

          <div className="px-6 py-3 border-t bg-muted/30">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {receiptItems.filter(i => i.name.trim()).length} produto(s)
              </span>
              <span className="font-semibold">Total: {itemsTotal.toFixed(2)} €</span>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="ghost" onClick={handleSkipItems}>Saltar (sem produtos)</Button>
            <Button onClick={handleSaveItems} disabled={isSavingItems}>
              {isSavingItems ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageOpen className="mr-2 h-4 w-4" />}
              Adicionar ao Inventário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full-size Viewer Dialog */}
      <Dialog open={!!viewingReceipt} onOpenChange={(open) => { if (!open) setViewingReceipt(null); }}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{viewingReceipt?.storeName || "Fatura"}</DialogTitle>
                <DialogDescription>
                  {viewingReceipt?.date
                    ? format(new Date(viewingReceipt.date), "dd MMMM yyyy")
                    : viewingReceipt?.createdAt
                      ? `Carregada em ${format(new Date(viewingReceipt.createdAt), "dd MMM yyyy")}`
                      : ""}
                  {viewingReceipt?.notes && ` — ${viewingReceipt.notes}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-muted/30">
            {viewingReceipt && (
              <img
                src={viewingReceipt.imagePath}
                alt={viewingReceipt.storeName || "Fatura"}
                className="max-w-full h-auto rounded-md shadow-lg"
                style={{ imageRendering: "auto" }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
