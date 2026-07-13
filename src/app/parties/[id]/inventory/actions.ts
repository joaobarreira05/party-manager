"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";

const itemSchema = z.object({
  partyId: z.string(),
  id: z.string().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  categoryId: z.string().optional(),
  unit: z.string().min(1, "Unidade é obrigatória"),
  initialQuantity: z.coerce.number().min(0, "Quantidade não pode ser negativa"),
  totalPrice: z.coerce.number().min(0, "Preço total deve ser positivo"),
  notes: z.string().optional(),
});

export async function saveInventoryItem(prevState: any, formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const parsed = itemSchema.safeParse(data);
  
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  
  const { id, partyId, initialQuantity, totalPrice, categoryId, ...rest } = parsed.data;
  const unitPrice = initialQuantity > 0 ? totalPrice / initialQuantity : 0;
  const finalCategoryId = categoryId && categoryId.length > 0 ? categoryId : null;
  
  if (id) {
    // Edit
    const item = await prisma.inventoryItem.findUnique({ where: { id }});
    if(!item) return { error: "Item not found" };
    
    // Adjust remainingQuantity relative to the initialQuantity change
    const diff = initialQuantity - item.initialQuantity;
    let newRemaining = item.remainingQuantity + diff;
    if (newRemaining < 0) newRemaining = 0; // prevent negative
    
    await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...rest,
        categoryId: finalCategoryId,
        initialQuantity,
        remainingQuantity: newRemaining,
        totalPrice,
        unitPrice
      }
    });
  } else {
    // Create
    await prisma.inventoryItem.create({
      data: {
        ...rest,
        categoryId: finalCategoryId,
        partyId,
        initialQuantity,
        remainingQuantity: initialQuantity,
        totalPrice,
        unitPrice
      }
    });
  }
  
  revalidatePath(`/parties/${partyId}/inventory`);
  return { success: true, timestamp: Date.now() };
}

export async function deleteInventoryItem(id: string, partyId: string) {
  await prisma.inventoryItem.delete({ where: { id }});
  revalidatePath(`/parties/${partyId}/inventory`);
}

export async function duplicateInventoryItem(id: string, partyId: string) {
  const item = await prisma.inventoryItem.findUnique({ where: { id }});
  if (item) {
    await prisma.inventoryItem.create({
      data: {
        name: `${item.name} (Cópia)`,
        categoryId: item.categoryId,
        unit: item.unit,
        initialQuantity: item.initialQuantity,
        remainingQuantity: item.initialQuantity, // Reset usage for copy
        totalPrice: item.totalPrice,
        unitPrice: item.unitPrice,
        notes: item.notes,
        partyId
      }
    });
    revalidatePath(`/parties/${partyId}/inventory`);
  }
}

function parsePtFloat(val: any, fallback: number = 0) {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/[^0-9.,-]/g, '').replace(',', '.');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? fallback : parsed;
}

export async function importInventoryItems(items: any[], partyId: string) {
  for (const item of items) {
    const catName = item.Categoria || item.categoria || item.Category || null;
    let catId: string | null = null;
    
    if (catName) {
      let cat = await prisma.category.findFirst({
        where: { partyId, name: { equals: catName } }
      });
      
      if (!cat) {
        const isAlcohol = catName.toLowerCase().includes("alcool") || catName.toLowerCase().includes("álcool");
        cat = await prisma.category.create({
          data: { name: catName, isAlcohol, partyId }
        });
      }
      catId = cat.id;
    }

    const initialRaw = item['Quantidade Inicial'] || item.quantidade_inicial || item['Qtd. Inicial'] || item.qtd_inicial || item['Qtd Inicial'];
    const initialQuantity = parsePtFloat(initialRaw, 0);
    
    const remainingVal = item.Restante || item['Quantidade Restante'] || item.quantidade_restante || item['Qtd. Restante'] || item.qtd_restante || item['Qtd Restante'];
    const remainingQuantity = parsePtFloat(remainingVal, initialQuantity);
    
    const totalPrice = parsePtFloat(item['Preço Total'] || item.preco_total || item['Preco Total'], 0);
    const unitPrice = initialQuantity > 0 ? totalPrice / initialQuantity : 0;

    let unit = item.Unidade || item.unidade || item.Unit;
    if (!unit && initialRaw && typeof initialRaw === 'string') {
        const textPart = initialRaw.replace(/[0-9.,-]/g, '').trim();
        if (textPart) unit = textPart;
    }
    if (!unit) unit = "un";

    await prisma.inventoryItem.create({
      data: {
        name: item.Produto || item.produto || item.Product || "Sem Nome",
        categoryId: catId,
        unit: unit,
        initialQuantity,
        remainingQuantity,
        totalPrice,
        unitPrice,
        partyId
      }
    });
  }
  revalidatePath(`/parties/${partyId}/inventory`);
  return { success: true };
}

export async function deleteAllInventoryItems(partyId: string) {
  await prisma.inventoryItem.deleteMany({
    where: { partyId }
  });
  revalidatePath(`/parties/${partyId}/inventory`);
}

export async function createCategory(partyId: string, name: string) {
  const cat = await prisma.category.create({
    data: { name, partyId, isAlcohol: false }
  });
  revalidatePath(`/parties/${partyId}/inventory`);
  return { id: cat.id, name: cat.name };
}

export async function restockItems(partyId: string, items: { id: string; addQuantity: number; addPrice: number }[]) {
  for (const item of items) {
    if (item.addQuantity <= 0) continue;
    
    const existing = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
    if (!existing) continue;
    
    const newInitial = existing.initialQuantity + item.addQuantity;
    const newRemaining = existing.remainingQuantity + item.addQuantity;
    const newTotalPrice = existing.totalPrice + item.addPrice;
    const newUnitPrice = newInitial > 0 ? newTotalPrice / newInitial : 0;
    
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        initialQuantity: newInitial,
        remainingQuantity: newRemaining,
        totalPrice: newTotalPrice,
        unitPrice: newUnitPrice,
      }
    });
  }
  
  revalidatePath(`/parties/${partyId}/inventory`);
  return { success: true };
}

export async function addReceiptItems(
  partyId: string, 
  receiptId: string, 
  items: { name: string; quantity: number; unit: string; totalPrice: number; categoryId?: string }[]
) {
  for (const item of items) {
    if (!item.name || item.quantity <= 0) continue;
    
    const unitPrice = item.quantity > 0 ? item.totalPrice / item.quantity : 0;
    const finalCategoryId = item.categoryId && item.categoryId.length > 0 ? item.categoryId : null;
    
    // Check if product with same name already exists
    const existing = await prisma.inventoryItem.findFirst({
      where: { partyId, name: { equals: item.name } }
    });
    
    if (existing) {
      // Restock existing item
      const newInitial = existing.initialQuantity + item.quantity;
      const newRemaining = existing.remainingQuantity + item.quantity;
      const newTotalPrice = existing.totalPrice + item.totalPrice;
      const newUnitPrice = newInitial > 0 ? newTotalPrice / newInitial : 0;
      
      await prisma.inventoryItem.update({
        where: { id: existing.id },
        data: {
          initialQuantity: newInitial,
          remainingQuantity: newRemaining,
          totalPrice: newTotalPrice,
          unitPrice: newUnitPrice,
          receiptId,
        }
      });
    } else {
      // Create new item
      await prisma.inventoryItem.create({
        data: {
          name: item.name,
          categoryId: finalCategoryId,
          unit: item.unit,
          initialQuantity: item.quantity,
          remainingQuantity: item.quantity,
          totalPrice: item.totalPrice,
          unitPrice,
          partyId,
          receiptId,
        }
      });
    }
  }
  
  revalidatePath(`/parties/${partyId}/inventory`);
  revalidatePath(`/parties/${partyId}/receipts`);
  return { success: true };
}
