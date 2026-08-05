"use server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function saveEvent(data: any) {
  const { partyId, eventId, name, date, description, participants, items } = data;
  
  if (!name) return { error: "Nome do evento é obrigatório" };

  if (eventId) {
    // ===== EDIT MODE =====
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: { itemsUsed: true }
    });
    if (!existingEvent) return { error: "Evento não encontrado" };

    // Calculate the net inventory changes:
    // For each item in the NEW list, check if we have enough stock
    // considering the OLD items will be restored first.
    const oldItemsMap: Record<string, number> = {};
    for (const oi of existingEvent.itemsUsed) {
      oldItemsMap[oi.inventoryItemId] = (oldItemsMap[oi.inventoryItemId] || 0) + oi.quantityUsed;
    }

    for (const item of items) {
      const inv = await prisma.inventoryItem.findUnique({ where: { id: item.inventoryItemId }});
      if (!inv) return { error: "Produto não encontrado" };
      // Available = current remaining + what was previously used of this item
      const available = inv.remainingQuantity + (oldItemsMap[item.inventoryItemId] || 0);
      if (available < item.quantityUsed) {
        return { error: `Quantidade insuficiente em stock para ${inv.name}. Disponível: ${available} ${inv.unit}.` };
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Restore old inventory
      for (const item of existingEvent.itemsUsed) {
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { remainingQuantity: { increment: item.quantityUsed } }
        });
      }

      // 2. Delete old relations
      await tx.eventParticipant.deleteMany({ where: { eventId } });
      await tx.eventItem.deleteMany({ where: { eventId } });

      // 3. Update event + create new relations
      await tx.event.update({
        where: { id: eventId },
        data: {
          name,
          description,
          profitMargin: data.profitMargin !== undefined ? Number(data.profitMargin) : 5,
          date: date ? new Date(date) : null,
          participants: {
            create: participants.map((p: any) => ({
              participantId: p.participantId,
            }))
          },
          itemsUsed: {
            create: items.map((i: any) => ({
              inventoryItemId: i.inventoryItemId,
              quantityUsed: i.quantityUsed
            }))
          }
        }
      });

      // 4. Decrease inventory with new values
      for (const item of items) {
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { remainingQuantity: { decrement: item.quantityUsed } }
        });
      }
    });
  } else {
    // ===== CREATE MODE =====
    // Validation for items remaining quantity
    for (const item of items) {
      const inv = await prisma.inventoryItem.findUnique({ where: { id: item.inventoryItemId }});
      if (!inv) return { error: "Produto não encontrado" };
      if (inv.remainingQuantity < item.quantityUsed) {
        return { error: `Quantidade insuficiente em stock para ${inv.name}. Tem apenas ${inv.remainingQuantity} ${inv.unit}.` };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.event.create({
        data: {
          partyId,
          name,
          description,
          profitMargin: data.profitMargin !== undefined ? Number(data.profitMargin) : 5,
          date: date ? new Date(date) : null,
          participants: {
            create: participants.map((p: any) => ({
              participantId: p.participantId,
            }))
          },
          itemsUsed: {
            create: items.map((i: any) => ({
              inventoryItemId: i.inventoryItemId,
              quantityUsed: i.quantityUsed
            }))
          }
        }
      });

      // Decrease inventory
      for (const item of items) {
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { remainingQuantity: { decrement: item.quantityUsed } }
        });
      }
    });
  }

  revalidatePath(`/parties/${partyId}/events`);
  revalidatePath(`/parties/${partyId}/inventory`);
  revalidatePath(`/parties/${partyId}/participants`);
  revalidatePath(`/parties/${partyId}`);
  return { success: true };
}

export async function deleteEvent(eventId: string, partyId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { itemsUsed: true }
  });

  if (event) {
    await prisma.$transaction(async (tx) => {
      // Restore inventory
      for (const item of event.itemsUsed) {
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: {
            remainingQuantity: {
              increment: item.quantityUsed
            }
          }
        });
      }

      await tx.event.delete({ where: { id: eventId } });
    });
    
    revalidatePath(`/parties/${partyId}/events`);
    revalidatePath(`/parties/${partyId}/inventory`);
    revalidatePath(`/parties/${partyId}/participants`);
    revalidatePath(`/parties/${partyId}`);
  }
}
