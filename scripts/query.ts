import prisma from "../src/lib/prisma";

const PARTY_ID = "9be2deff-0c5a-4183-a4f2-b44c30d247db";
const CASA_CAT_ID = "c28b3755-877d-4c9e-80fc-86f25fad1649";

// Items from the receipt photo - all go to "CASA" category
const items = [
  // MERCEARIA + PET FOOD
  { name: "Cápsulas Prestígio 10un", unit: "packs", qty: 3, price: 6.27 },
  { name: "Mostarda TD 200ml", unit: "frasco", qty: 1, price: 0.95 },
  { name: "Tremoço 1300/800g", unit: "pacote", qty: 1, price: 2.99 },
  { name: "Polpa Tomate Manjericão", unit: "pacote", qty: 1, price: 1.39 },
  { name: "Maionese Calvé 753g", unit: "frasco", qty: 1, price: 1.90 },  // com poupança
  { name: "Massa Esparguete", unit: "pacotes", qty: 2, price: 1.38 },
  { name: "Bif. Mel&Mostarda 150g", unit: "pacotes", qty: 4, price: 5.96 },
  { name: "Bif. Lisboa Azeite 150g", unit: "pacotes", qty: 4, price: 5.80 },
  { name: "Bif. Presunto 185g", unit: "pacotes", qty: 5, price: 6.45 },
  { name: "Bif. Onde Ketchup 150g", unit: "pacotes", qty: 3, price: 3.87 },
  { name: "Bif. Mac&Cheese 150g", unit: "pacotes", qty: 3, price: 4.47 },
  { name: "Bif. Onduladas Sal 200g", unit: "pacotes", qty: 2, price: 2.50 },
  { name: "Bif. Rústica 150g", unit: "pacotes", qty: 2, price: 2.38 },
  { name: "Bif. Camponesa 170g", unit: "pacotes", qty: 4, price: 4.76 },
  { name: "Bif. Lisa Sal 200g", unit: "pacotes", qty: 2, price: 2.58 },
  { name: "Amendoim C.C 500g", unit: "pacote", qty: 1, price: 1.99 },
  // TALHO
  { name: "Porco Bifanas Familiar", unit: "kg", qty: 1.076, price: 5.37 },
  { name: "Porco Bifanas/Assar", unit: "kg", qty: 5.258, price: 26.24 },
  { name: "Porco Entremeada", unit: "kg", qty: 4.496, price: 21.99 },
  // BEBIDAS
  { name: "Vodka Rodanov 70cl", unit: "garrafas", qty: 5, price: 39.95 },
  { name: "Limonada Light 1L", unit: "garrafas", qty: 5, price: 5.95 },
  { name: "Schweppes Zero Pink 1L", unit: "garrafas", qty: 2, price: 3.38 },  // 4.30 - 0.92 poupança
  { name: "Cerveja Super Bock 30x25cl", unit: "packs", qty: 3, price: 44.85 },
  { name: "Lima Limão PD 2L", unit: "garrafas", qty: 2, price: 2.08 },
  { name: "Ref. s/gás Lima-Mar 1L", unit: "garrafas", qty: 3, price: 4.17 },
];

async function main() {
  let count = 0;
  for (const item of items) {
    const unitPrice = item.qty > 0 ? item.price / item.qty : 0;
    await prisma.inventoryItem.create({
      data: {
        name: item.name,
        categoryId: CASA_CAT_ID,
        unit: item.unit,
        initialQuantity: item.qty,
        remainingQuantity: item.qty,
        totalPrice: item.price,
        unitPrice: Math.round(unitPrice * 100) / 100,
        partyId: PARTY_ID,
        notes: "Fatura supermercado - 211.81€"
      }
    });
    count++;
    console.log(`✓ ${item.name} (${item.qty} ${item.unit} = ${item.price}€)`);
  }
  console.log(`\n🎉 ${count} produtos adicionados ao inventário na categoria CASA!`);
  console.log(`Total da fatura: ${items.reduce((s, i) => s + i.price, 0).toFixed(2)}€`);
}

main().catch(console.error);
