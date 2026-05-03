import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  TrendingUp, TrendingDown, DollarSign, ArrowUpRight,
  ArrowDownRight, Users, AlertCircle, PlusCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { businessService } from "@/services/businessService";
import { transactionService } from "@/services/transactionService";
import { ALL_TAX_CATEGORIES } from "@/data/taxCategories";
import {
  calcNetProfit, calcTotalIncome, calcTotalExpenses,
  calcTaxDeductibleExpenses, calcTotalReimbursementsOwed, calcTotalOwnerWithdrawals,
  calcOwnerPosition, calcExpensesByCategory, calcMonthlyIncomeVsExpenses,
  formatCurrency, DateRange
} from "@/utils/calculations";
import type { Business } from "@/types";

const CHART_COLORS = ["#3b6fd4", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#f97316"];

type DatePreset = "this_month" | "this_quarter" | "this_year" | "all";

function getDateRange(preset: DatePreset): DateRange | undefined {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (preset === "this_month") {
    return {
      start: `${y}-${String(m + 1).padStart(2, "0")}-01`,
      end: `${y}-${String(m + 1).padStart(2, "0")}-31`,
    };
  }
  if (preset === "this_quarter") {
    const q = Math.floor(m / 3);
    const qStart = q * 3;
    return {
      start: `${y}-${String(qStart + 1).padStart(2, "0")}-01`,
      end: `${y}-${String(qStart + 3).padStart(2, "0")}-31`,
    };
  }
  if (preset === "this_year") return { start: `${y}-01-01`, end: `${y}-12-31` };
  return undefined;
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="p-2.5 border rounded bg-card hover:bg-muted/20 transition-colors">
      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold mt-0.5 leading-none ${color ?? "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [selectedBizId, setSelectedBizId] = useState<string>("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [currency, setCurrency] = useState<"USD" | "CAD">("USD");

  const businesses = businessService.getAll();
  const transactions = transactionService.getAll();

  const activeBiz: Business | undefined = useMemo(() => {
    if (selectedBizId) return businesses.find(b => b.id === selectedBizId);
    return businesses[0];
  }, [selectedBizId, businesses]);

  const range = getDateRange(datePreset);
  const bizId = activeBiz?.id ?? "";

  const totalIncome = calcTotalIncome(transactions, bizId, range);
  const totalExpenses = calcTotalExpenses(transactions, bizId, range);
  const netProfit = calcNetProfit(transactions, bizId, range);
  const taxDeductible = calcTaxDeductibleExpenses(transactions, bizId, range);
  const reimbOwed = calcTotalReimbursementsOwed(transactions, bizId);
  const ownerWithdrawals = calcTotalOwnerWithdrawals(transactions, bizId, range);

  const ownerPositions = useMemo(() => {
    if (!activeBiz) return [];
    return activeBiz.owners.map(o => calcOwnerPosition(o, transactions, bizId, netProfit, range));
  }, [activeBiz, transactions, bizId, netProfit, range]);

  const expensesByCategory = useMemo(
    () => calcExpensesByCategory(transactions, bizId, ALL_TAX_CATEGORIES, range).slice(0, 6),
    [transactions, bizId, range]
  );

  const monthlyData = useMemo(
    () => calcMonthlyIncomeVsExpenses(transactions, bizId, new Date().getFullYear()),
    [transactions, bizId]
  );

  const recentTxns = useMemo(
    () =>
      transactions
        .filter(t => t.businessId === bizId)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 12),
    [transactions, bizId]
  );

  const multiplier = currency === "CAD" ? 1.36 : 1;

  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-96 gap-3">
        <TrendingUp className="w-8 h-8 text-primary" />
        <h2 className="text-base font-semibold">Welcome to Finance Track</h2>
        <p className="text-xs text-muted-foreground text-center max-w-xs">Add a business to start tracking finances.</p>
        <Link href="/businesses">
          <Button size="sm" data-testid="button-add-first-business">
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Add Business
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-bold leading-none">Dashboard</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">{activeBiz?.name}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Select value={activeBiz?.id ?? ""} onValueChange={setSelectedBizId}>
            <SelectTrigger className="h-7 text-xs w-44" data-testid="select-business"><SelectValue placeholder="Business" /></SelectTrigger>
            <SelectContent>
              {businesses.map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={datePreset} onValueChange={v => setDatePreset(v as DatePreset)}>
            <SelectTrigger className="h-7 text-xs w-32" data-testid="select-date-range"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month" className="text-xs">This Month</SelectItem>
              <SelectItem value="this_quarter" className="text-xs">This Quarter</SelectItem>
              <SelectItem value="this_year" className="text-xs">This Year</SelectItem>
              <SelectItem value="all" className="text-xs">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={currency} onValueChange={v => setCurrency(v as "USD" | "CAD")}>
            <SelectTrigger className="h-7 text-xs w-20" data-testid="select-currency"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="USD" className="text-xs">USD</SelectItem>
              <SelectItem value="CAD" className="text-xs">CAD</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/transactions/new?type=expense">
            <Button variant="destructive" size="sm" className="h-7 text-xs" data-testid="button-add-expense">
              <ArrowDownRight className="w-3 h-3 mr-1" /> Expense
            </Button>
          </Link>
          <Link href="/transactions/new?type=income">
            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" data-testid="button-add-income">
              <ArrowUpRight className="w-3 h-3 mr-1" /> Income
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards — compact grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        <Stat label="Income" value={formatCurrency(totalIncome * multiplier, currency)} color="text-green-600" />
        <Stat label="Expenses" value={formatCurrency(totalExpenses * multiplier, currency)} color="text-red-500" />
        <Stat label="Net Profit" value={formatCurrency(netProfit * multiplier, currency)} color={netProfit >= 0 ? "text-primary" : "text-red-500"} />
        <Stat label="Tax Deductible" value={formatCurrency(taxDeductible * multiplier, currency)} sub="Est. deductible" />
        <Stat label="Reimb. Owed" value={formatCurrency(reimbOwed * multiplier, currency)} color="text-amber-600" sub="To owners" />
        <Stat label="Withdrawals" value={formatCurrency(ownerWithdrawals * multiplier, currency)} />
      </div>

      {/* Owner table + Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {/* Owner positions table */}
        {ownerPositions.length > 0 && (
          <div className="xl:col-span-1 border rounded bg-card overflow-hidden">
            <div className="px-3 py-1.5 border-b bg-muted/30 flex items-center justify-between">
              <span className="text-[11px] font-semibold">Owner Balances</span>
              <Link href="/owners">
                <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5">Details</Button>
              </Link>
            </div>
            <table className="w-full text-xs">
              <thead className="border-b">
                <tr>
                  <th className="text-left px-3 py-1 text-[10px] text-muted-foreground">Owner</th>
                  <th className="text-right px-3 py-1 text-[10px] text-muted-foreground">Share</th>
                  <th className="text-right px-3 py-1 text-[10px] text-muted-foreground">Drawn</th>
                  <th className="text-right px-3 py-1 text-[10px] text-muted-foreground">Net</th>
                </tr>
              </thead>
              <tbody>
                {ownerPositions.map(op => (
                  <tr key={op.ownerId} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="px-3 py-1.5 font-medium">{op.ownerName}<span className="ml-1 text-[10px] text-muted-foreground">{op.ownershipPercentage}%</span></td>
                    <td className="px-3 py-1.5 text-right text-green-600">{formatCurrency(op.profitShare * multiplier, currency)}</td>
                    <td className="px-3 py-1.5 text-right text-amber-600">{formatCurrency(op.withdrawn * multiplier, currency)}</td>
                    <td className={`px-3 py-1.5 text-right font-semibold ${op.netPosition >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {formatCurrency(op.netPosition * multiplier, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Monthly chart */}
        <div className={`border rounded bg-card ${ownerPositions.length > 0 ? "xl:col-span-2" : "xl:col-span-3"}`}>
          <div className="px-3 py-1.5 border-b bg-muted/30">
            <span className="text-[11px] font-semibold">Monthly Income vs Expenses ({new Date().getFullYear()})</span>
          </div>
          <div className="p-2">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyData} barSize={10} margin={{ top: 2, right: 4, left: -10, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="Income" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Expenses by category + Recent Txns */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {/* Expenses pie */}
        <div className="border rounded bg-card overflow-hidden">
          <div className="px-3 py-1.5 border-b bg-muted/30">
            <span className="text-[11px] font-semibold">Expenses by Category</span>
          </div>
          <div className="p-2">
            {expensesByCategory.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">No expense data</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={expensesByCategory} dataKey="totalUSD" nameKey="categoryName"
                    cx="50%" cy="50%" outerRadius={60} innerRadius={30} labelLine={false}>
                    {expensesByCategory.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 10 }} />
                  <Legend iconSize={8} formatter={(v: string) => (
                    <span style={{ fontSize: 9 }}>{v.length > 18 ? v.slice(0, 18) + "…" : v}</span>
                  )} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent transactions — excel style */}
        <div className="xl:col-span-2 border rounded bg-card overflow-hidden">
          <div className="px-3 py-1.5 border-b bg-muted/30 flex items-center justify-between">
            <span className="text-[11px] font-semibold">Recent Transactions</span>
            <Link href="/transactions">
              <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5">View All</Button>
            </Link>
          </div>
          {recentTxns.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No transactions. <Link href="/transactions/new" className="text-primary hover:underline">Add first</Link>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b">
                <tr>
                  <th className="text-left px-3 py-1 text-[10px] text-muted-foreground">Date</th>
                  <th className="text-left px-3 py-1 text-[10px] text-muted-foreground">Type</th>
                  <th className="text-left px-3 py-1 text-[10px] text-muted-foreground">Vendor</th>
                  <th className="text-right px-3 py-1 text-[10px] text-muted-foreground">USD</th>
                  <th className="text-left px-3 py-1 text-[10px] text-muted-foreground hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {recentTxns.map(t => (
                  <tr key={t.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-1 font-mono text-[10px] text-muted-foreground whitespace-nowrap">{t.date}</td>
                    <td className="px-3 py-1">
                      <Badge className={`text-[9px] px-1 py-0 border ${TXN_BADGE[t.transactionType] ?? "bg-gray-100 text-gray-700"}`}>
                        {TXN_SHORT[t.transactionType] ?? t.transactionType}
                      </Badge>
                    </td>
                    <td className="px-3 py-1 max-w-[120px] truncate font-medium">{t.vendorOrPayee}</td>
                    <td className={`px-3 py-1 text-right font-mono whitespace-nowrap ${t.transactionType === "income" || t.transactionType === "reimbursement_received" ? "text-green-600" : t.transactionType === "owner_contribution" ? "text-blue-600" : ""}`}>
                      {t.transactionType === "income" || t.transactionType === "owner_contribution" || t.transactionType === "reimbursement_received" ? "+" : ""}
                      {formatCurrency(t.amountUSD * multiplier, currency)}
                    </td>
                    <td className="px-3 py-1 hidden sm:table-cell text-[10px] text-muted-foreground max-w-[100px] truncate">{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const TXN_BADGE: Record<string, string> = {
  expense: "bg-red-50 text-red-700 border-red-200",
  income: "bg-green-50 text-green-700 border-green-200",
  owner_contribution: "bg-blue-50 text-blue-700 border-blue-200",
  owner_withdrawal: "bg-amber-50 text-amber-700 border-amber-200",
  reimbursement_owed: "bg-purple-50 text-purple-700 border-purple-200",
  reimbursement_paid: "bg-violet-50 text-violet-700 border-violet-200",
  reimbursement_received: "bg-teal-50 text-teal-700 border-teal-200",
  rental_deposit_received: "bg-cyan-50 text-cyan-700 border-cyan-200",
  rental_deposit_returned: "bg-orange-50 text-orange-700 border-orange-200",
  transfer: "bg-gray-50 text-gray-700 border-gray-200",
};
const TXN_SHORT: Record<string, string> = {
  expense: "Expense",
  income: "Income",
  owner_contribution: "Contribution",
  owner_withdrawal: "Withdrawal",
  reimbursement_owed: "Reimb. Owed",
  reimbursement_paid: "Reimb. Paid",
  reimbursement_received: "Reimb. Recv'd",
  rental_deposit_received: "Deposit In",
  rental_deposit_returned: "Deposit Out",
  transfer: "Transfer",
};
