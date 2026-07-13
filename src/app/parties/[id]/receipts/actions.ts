"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function deleteReceipt(id: string, partyId: string) {
  await prisma.receipt.delete({ where: { id } });
  revalidatePath(`/parties/${partyId}/receipts`);
}

export async function updateReceipt(id: string, partyId: string, data: { storeName?: string; notes?: string; date?: string }) {
  await prisma.receipt.update({
    where: { id },
    data: {
      storeName: data.storeName || null,
      notes: data.notes || null,
      date: data.date ? new Date(data.date) : null,
    },
  });
  revalidatePath(`/parties/${partyId}/receipts`);
}

import { createWorker } from 'tesseract.js';

export async function processReceiptOCR(base64Image: string) {
  try {
    const imageUrl = base64Image.startsWith("data:image") 
      ? base64Image 
      : `data:image/jpeg;base64,${base64Image}`;

    const worker = await createWorker('por');
    const ret = await worker.recognize(imageUrl);
    const text = ret.data.text;
    await worker.terminate();

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const items = [];
    
    // Regex para tentar encontrar preços no final da linha (ex: 1,20 ou 1.20)
    const priceRegex = /[\s]+(\d+[,.]\d{2})[\sA-Za-z]*$/;
    
    for (const line of lines) {
      const match = line.match(priceRegex);
      if (match) {
        const priceStr = match[1].replace(',', '.');
        const price = parseFloat(priceStr);
        let nameRaw = line.replace(match[0], '').trim();
        
        // Ignorar linhas comuns que não são produtos
        const lowerName = nameRaw.toLowerCase();
        if (
          lowerName.includes('total') || 
          lowerName.includes('subtotal') || 
          lowerName.includes('iva') || 
          lowerName.includes('troco') || 
          lowerName.includes('multibanco') || 
          lowerName.includes('dinheiro') || 
          lowerName.includes('desconto') ||
          lowerName.includes('pago')
        ) {
          continue;
        }
        
        if (nameRaw.length > 2 && price > 0) {
          // Tentar extrair quantidade se começar com "2x" ou "2 X "
          let qty = 1;
          const qtyMatch = nameRaw.match(/^(\d+)\s*[xX]\s+(.*)$/);
          if (qtyMatch) {
             qty = parseInt(qtyMatch[1], 10);
             nameRaw = qtyMatch[2];
          }

          items.push({
            name: nameRaw,
            quantity: qty,
            unit: 'un',
            totalPrice: price
          });
        }
      }
    }

    return { success: true, items };
  } catch (error: any) {
    console.error("OCR Error:", error);
    return { error: "Erro ao extrair texto do talão." };
  }
}
