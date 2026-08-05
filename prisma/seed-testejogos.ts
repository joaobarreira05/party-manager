import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  let party = await prisma.party.findFirst({
    where: { name: { contains: "testejogos" } },
  });

  if (!party) {
    party = await prisma.party.create({
      data: {
        name: "testejogos",
      },
    });
    console.log("Party created:", party.id);
  } else {
    console.log("Found party:", party.id);
  }

  // Pre-populate 4 requested items
  const items = [
    {
      name: "7 Caixas de Minis 🍺",
      unit: "Caixas",
      initialQuantity: 7,
      remainingQuantity: 7,
      unitPrice: 15.0,
      totalPrice: 105.0,
      notes: "7 caixas de minis a 15€ cada",
    },
    {
      name: "Insecticida Mata Putas 🪰",
      unit: "un",
      initialQuantity: 1,
      remainingQuantity: 1,
      unitPrice: 6.0,
      totalPrice: 6.0,
      notes: "Insecticida especial",
    },
    {
      name: "15 Vodkas 🍾",
      unit: "Garrafas",
      initialQuantity: 15,
      remainingQuantity: 15,
      unitPrice: 7.0,
      totalPrice: 105.0,
      notes: "15 vodkas a 7€ cada",
    },
    {
      name: "5 Gins 🍸",
      unit: "Garrafas",
      initialQuantity: 5,
      remainingQuantity: 5,
      unitPrice: 7.5,
      totalPrice: 37.5,
      notes: "5 gins a 7.5€ cada",
    },
  ];

  for (const item of items) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { partyId: party.id, name: item.name },
    });

    if (!existing) {
      await prisma.inventoryItem.create({
        data: {
          ...item,
          partyId: party.id,
        },
      });
      console.log(`Created inventory item: ${item.name}`);
    } else {
      console.log(`Item already exists: ${item.name}`);
    }
  }

  console.log("Done seeding items for testejogos!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
