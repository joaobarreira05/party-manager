"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import prisma from "@/lib/prisma";

const partySchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  accessPassword: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function createParty(prevState: any, formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  
  const parsed = partySchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, accessPassword, startDate, endDate } = parsed.data;

  // Default categories
  const defaultCategories = [
    { name: "Álcool", isAlcohol: true },
    { name: "Comida", isAlcohol: false },
    { name: "Bebidas sem álcool", isAlcohol: false },
    { name: "Gelo", isAlcohol: false },
    { name: "Limpeza", isAlcohol: false },
    { name: "Outros", isAlcohol: false },
  ];

  const party = await prisma.party.create({
    data: {
      name,
      accessPassword: accessPassword || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      categories: {
        create: defaultCategories,
      },
    },
  });

  revalidatePath("/");
  redirect(`/parties/${party.id}`);
}
