import { Party, Participant, Event, EventParticipant, EventItem, InventoryItem, Category, Expense, ExpenseParticipant } from "@prisma/client";

export type PartyWithDetails = Party & {
  participants: Participant[];
  events: (Event & {
    participants: EventParticipant[];
    itemsUsed: (EventItem & { inventoryItem: InventoryItem & { category: Category | null } })[];
  })[];
  expenses: (Expense & {
    participants: ExpenseParticipant[];
  })[];
  inventory: (InventoryItem & { category: Category | null })[];
};

export interface Balance {
  paid: number;
  owes: number;
  balance: number; // paid - owes. Positive means should receive money. Negative means should pay.
}

export interface Transfer {
  from: string; // participantId
  to: string; // participantId
  amount: number;
}

export function calculateBalances(party: PartyWithDetails) {
  const balances: Record<string, Balance> = {};

  // Initialize
  for (const p of party.participants) {
    balances[p.id] = { paid: 0, owes: 0, balance: 0 };
  }

  // 1. Direct Expenses
  for (const expense of party.expenses) {
    // Quem pagou?
    if (expense.paidById && balances[expense.paidById]) {
      balances[expense.paidById].paid += expense.amount;
    }

    // Quem deve pagar (split)
    const splitCount = expense.participants.length;
    if (splitCount > 0) {
      // For now, divide equally or use amountOwed if provided (simplification: divide equally)
      // Check if there are explicit amounts
      const totalExplicit = expense.participants.reduce((sum, p) => sum + (p.amountOwed || 0), 0);
      const remainingAmount = expense.amount - totalExplicit;
      
      const unassignedParticipants = expense.participants.filter(p => !p.amountOwed);
      const equalShare = unassignedParticipants.length > 0 ? remainingAmount / unassignedParticipants.length : 0;

      for (const ep of expense.participants) {
        if (balances[ep.participantId]) {
          const owes = ep.amountOwed !== null ? ep.amountOwed : equalShare;
          balances[ep.participantId].owes += owes;
        }
      }
    }
  }

  // 2. Events & Inventory Used — divide equally among all event participants
  for (const event of party.events) {
    for (const itemUsed of event.itemsUsed) {
      const cost = itemUsed.quantityUsed * itemUsed.inventoryItem.unitPrice;

      // Divide equally among ALL event participants
      const consumers = event.participants.map(p => p.participantId);

      if (consumers.length > 0) {
        const costPerPerson = cost / consumers.length;
        for (const consumerId of consumers) {
          if (balances[consumerId]) {
            balances[consumerId].owes += costPerPerson;
          }
        }
      }
    }
  }

  // Set final balance
  for (const id in balances) {
    balances[id].balance = balances[id].paid - balances[id].owes;
  }

  return balances;
}

export function calculateTransfers(balances: Record<string, Balance>, participants: Participant[]): Transfer[] {
  const debtors = [];
  const creditors = [];

  for (const p of participants) {
    const bal = balances[p.id]?.balance || 0;
    if (bal < -0.01) debtors.push({ id: p.id, amount: -bal });
    if (bal > 0.01) creditors.push({ id: p.id, amount: bal });
  }

  // Sort by amount descending
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let dIndex = 0;
  let cIndex = 0;

  while (dIndex < debtors.length && cIndex < creditors.length) {
    const debtor = debtors[dIndex];
    const creditor = creditors[cIndex];

    const amount = Math.min(debtor.amount, creditor.amount);
    
    // round to 2 decimals
    const roundedAmount = Math.round(amount * 100) / 100;

    if (roundedAmount > 0) {
      transfers.push({
        from: debtor.id,
        to: creditor.id,
        amount: roundedAmount,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.01) dIndex++;
    if (creditor.amount < 0.01) cIndex++;
  }

  return transfers;
}
