"use server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function saveExpense(data: any) {
  const { partyId, name, categoryId, amount, paidById, participants } = data;
  
  if (!name || !amount) return { error: "Preencha a descrição e o valor." };

  await prisma.expense.create({
    data: {
      partyId,
      name,
      categoryId: categoryId || null,
      amount: parseFloat(amount),
      paidById: paidById || null,
      participants: {
        create: participants.map((pId: string) => ({
          participantId: pId,
        }))
      }
    }
  });

  revalidatePath(`/parties/${partyId}/expenses`);
  revalidatePath(`/parties/${partyId}/participants`);
  revalidatePath(`/parties/${partyId}`);
  return { success: true };
}

export async function deleteExpense(id: string, partyId: string) {
  await prisma.expense.delete({ where: { id }});
  revalidatePath(`/parties/${partyId}/expenses`);
  revalidatePath(`/parties/${partyId}/participants`);
  revalidatePath(`/parties/${partyId}`);
}
