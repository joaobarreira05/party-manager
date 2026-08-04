import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: partyId } = await params;
    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Nenhum item fornecido" }, { status: 400 });
    }

    // Get default category if exists or create general category
    let defaultCat = await prisma.category.findFirst({
      where: { partyId, name: "Geral" },
    });

    if (!defaultCat) {
      defaultCat = await prisma.category.create({
        data: { name: "Geral", partyId },
      });
    }

    let alcoholCat = await prisma.category.findFirst({
      where: { partyId, isAlcohol: true },
    });

    if (!alcoholCat) {
      alcoholCat = await prisma.category.create({
        data: { name: "Bebidas Alcoólicas", isAlcohol: true, partyId },
      });
    }

    const createdItems = [];

    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const total = Number(item.totalPrice) || 0;
      const uPrice = qty > 0 ? Math.round((total / qty) * 100) / 100 : total;
      const catId = item.isAlcohol ? alcoholCat.id : item.categoryId || defaultCat.id;

      const created = await prisma.inventoryItem.create({
        data: {
          name: item.name,
          unit: item.unit || "un",
          initialQuantity: qty,
          remainingQuantity: qty,
          totalPrice: total,
          unitPrice: uPrice,
          categoryId: catId,
          partyId,
          notes: "Adicionado via Leitura IA",
        },
      });

      createdItems.push(created);
    }

    return NextResponse.json({ success: true, count: createdItems.length });
  } catch (error: any) {
    console.error("Bulk inventory error:", error);
    return NextResponse.json({ error: error.message || "Erro ao adicionar inventário em lote" }, { status: 500 });
  }
}
