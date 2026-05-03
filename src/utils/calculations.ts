import type { Transaction, Owner } from "@/types";

export interface DateRange {
  start: string;
  end: string;
}

export interface OwnerPosition {
  ownerId: string;
  ownerName: string;
  ownershipPercentage: number;
  profitShare: number;
  withdrawn: number;
  contributed: number;
  reimbursementsOwed: number;
  reimbursementsPaid: number;
  netPosition: number;
}

function inRange(date: string, range?: DateRange): boolean {
  if (!range) return true;
  return date >= range.start && date <= range.end;
}

// Operating income = income type transactions
export function calcTotalIncome(transactions: Transaction[], businessId: string, range?: DateRange): number {
  return transactions
    .filter(t => t.businessId === businessId && t.transactionType === "income" && inRange(t.date, range))
    .reduce((sum, t) => sum + t.amountUSD, 0);
}

// Operating expenses = expense type only (not withdrawals, contributions, deposits)
export function calcTotalExpenses(transactions: Transaction[], businessId: string, range?: DateRange): number {
  return transactions
    .filter(t => t.businessId === businessId && t.transactionType === "expense" && inRange(t.date, range))
    .reduce((sum, t) => sum + t.amountUSD, 0);
}

// Net profit = income - expenses (owner operations not included)
export function calcNetProfit(transactions: Transaction[], businessId: string, range?: DateRange): number {
  return calcTotalIncome(transactions, businessId, range) - calcTotalExpenses(transactions, businessId, range);
}

export function calcOwnerProfitShare(netProfit: number, ownershipPercentage: number): number {
  return netProfit * (ownershipPercentage / 100);
}

export function calcOwnerWithdrawals(transactions: Transaction[], ownerId: string, businessId: string, range?: DateRange): number {
  return transactions
    .filter(t =>
      t.businessId === businessId &&
      t.transactionType === "owner_withdrawal" &&
      t.reimbursementOwnerId === ownerId &&
      inRange(t.date, range)
    )
    .reduce((sum, t) => sum + t.amountUSD, 0);
}

export function calcOwnerContributions(transactions: Transaction[], ownerId: string, businessId: string, range?: DateRange): number {
  return transactions
    .filter(t =>
      t.businessId === businessId &&
      t.transactionType === "owner_contribution" &&
      t.reimbursementOwnerId === ownerId &&
      inRange(t.date, range)
    )
    .reduce((sum, t) => sum + t.amountUSD, 0);
}

export function calcReimbursementsOwed(transactions: Transaction[], ownerId: string, businessId: string): number {
  return transactions
    .filter(t =>
      t.businessId === businessId &&
      t.isReimbursableToOwner &&
      t.reimbursementOwnerId === ownerId &&
      (t.reimbursementStatus === "owed" || t.reimbursementStatus === "partially_paid")
    )
    .reduce((sum, t) => sum + t.amountUSD, 0);
}

export function calcReimbursementsPaid(transactions: Transaction[], ownerId: string, businessId: string): number {
  return transactions
    .filter(t =>
      t.businessId === businessId &&
      t.isReimbursableToOwner &&
      t.reimbursementOwnerId === ownerId &&
      t.reimbursementStatus === "paid"
    )
    .reduce((sum, t) => sum + t.amountUSD, 0);
}

export function calcOwnerPosition(
  owner: Owner,
  transactions: Transaction[],
  businessId: string,
  netProfit: number,
  range?: DateRange
): OwnerPosition {
  const profitShare = calcOwnerProfitShare(netProfit, owner.ownershipPercentage);
  const withdrawn = calcOwnerWithdrawals(transactions, owner.id, businessId, range);
  const contributed = calcOwnerContributions(transactions, owner.id, businessId, range);
  const reimbursementsOwed = calcReimbursementsOwed(transactions, owner.id, businessId);
  const reimbursementsPaid = calcReimbursementsPaid(transactions, owner.id, businessId);
  const netPosition = profitShare - withdrawn + contributed + reimbursementsOwed;

  return {
    ownerId: owner.id,
    ownerName: owner.name,
    ownershipPercentage: owner.ownershipPercentage,
    profitShare,
    withdrawn,
    contributed,
    reimbursementsOwed,
    reimbursementsPaid,
    netPosition,
  };
}

export function calcTaxDeductibleExpenses(transactions: Transaction[], businessId: string, range?: DateRange): number {
  // All regular expenses are tax-deductible (capital improvements excluded)
  return transactions
    .filter(t =>
      t.businessId === businessId &&
      t.transactionType === "expense" &&
      t.usTaxCategoryId !== "us-r-capimpr" &&
      inRange(t.date, range)
    )
    .reduce((sum, t) => sum + t.amountUSD, 0);
}

export function calcTotalReimbursementsOwed(transactions: Transaction[], businessId: string): number {
  return transactions
    .filter(t =>
      t.businessId === businessId &&
      t.isReimbursableToOwner &&
      (t.reimbursementStatus === "owed" || t.reimbursementStatus === "partially_paid")
    )
    .reduce((sum, t) => sum + t.amountUSD, 0);
}

export function calcTotalOwnerWithdrawals(transactions: Transaction[], businessId: string, range?: DateRange): number {
  return transactions
    .filter(t => t.businessId === businessId && t.transactionType === "owner_withdrawal" && inRange(t.date, range))
    .reduce((sum, t) => sum + t.amountUSD, 0);
}

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  totalUSD: number;
  totalCAD: number;
  count: number;
}

export function calcExpensesByCategory(
  transactions: Transaction[],
  businessId: string,
  categories: { id: string; name: string }[],
  range?: DateRange
): CategoryTotal[] {
  const expenses = transactions.filter(t =>
    t.businessId === businessId && t.transactionType === "expense" && inRange(t.date, range)
  );
  const map: Record<string, CategoryTotal> = {};
  for (const t of expenses) {
    const catId = t.usTaxCategoryId ?? "uncategorized";
    const cat = categories.find(c => c.id === catId);
    const catName = cat?.name ?? "Uncategorized";
    if (!map[catId]) {
      map[catId] = { categoryId: catId, categoryName: catName, totalUSD: 0, totalCAD: 0, count: 0 };
    }
    map[catId].totalUSD += t.amountUSD;
    map[catId].totalCAD += t.amountCAD;
    map[catId].count++;
  }
  return Object.values(map).sort((a, b) => b.totalUSD - a.totalUSD);
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export function calcMonthlyIncomeVsExpenses(
  transactions: Transaction[],
  businessId: string,
  year: number
): MonthlyData[] {
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0");
    const label = new Date(year, i, 1).toLocaleString("default", { month: "short" });
    return { key: `${year}-${m}`, label };
  });

  return months.map(({ key, label }) => {
    const monthTxns = transactions.filter(t =>
      t.businessId === businessId && t.date.startsWith(key)
    );
    const income = monthTxns.filter(t => t.transactionType === "income").reduce((s, t) => s + t.amountUSD, 0);
    const expenses = monthTxns.filter(t => t.transactionType === "expense").reduce((s, t) => s + t.amountUSD, 0);
    return { month: label, income, expenses, net: income - expenses };
  });
}

export function formatCurrency(amount: number, currency: "USD" | "CAD" = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
