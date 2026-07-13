"use server";

import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function exportDatabaseToJson() {
  try {
    const parties = await prisma.party.findMany({
      include: {
        participants: true,
        categories: true,
        inventory: true,
        events: {
          include: {
            participants: true,
            itemsUsed: true
          }
        },
        expenses: {
          include: {
            participants: true
          }
        }
      }
    });

    const exportDir = path.join(process.cwd(), "export");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }

    const filePath = path.join(exportDir, "db-export.json");
    fs.writeFileSync(filePath, JSON.stringify(parties, null, 2));

    return { success: true, path: "export/db-export.json" };
  } catch (error: any) {
    return { error: error.message || "Erro ao exportar base de dados" };
  }
}
