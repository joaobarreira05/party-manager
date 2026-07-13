"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";

const participantSchema = z.object({
  partyId: z.string(),
  name: z.string().min(1, "Nome é obrigatório"),
  notes: z.string().optional(),
  color: z.string().optional(),
});

export async function addParticipant(prevState: any, formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const parsed = participantSchema.safeParse(data);
  
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.participant.create({
    data: parsed.data,
  });

  revalidatePath(`/parties/${parsed.data.partyId}/participants`);
  return { success: true, timestamp: Date.now() };
}

export async function removeParticipant(participantId: string, partyId: string) {
  await prisma.participant.delete({
    where: { id: participantId }
  });
  
  revalidatePath(`/parties/${partyId}/participants`);
}
