import { useState, useMemo } from "react";
import { Download, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { businessService } from "@/services/businessService";
import { transactionService } from "@/services/transactionService";
import { ALL_TAX_CATEGORIES, US_GENERAL_CATEGORIES, US_RENTAL_CATEGORIES, CA_CATEGORIES } from "@/data/taxCategories";
import {
  calcNetProfit, calcTotalIncome, calcTotalExpenses,
  calcExpensesByCategory, calcOwnerPosition, formatCurrency
} from "@/utils/calculations";
import { exportCSV } from "./Transactions";
import type { DateRange } from "@/utils/calculations";

function useDateRange(from: string, to: string): DateRange | undefined {
  if (!from && !to) return undefined;
  return { start: from || "0000-01-01", end: to || "9999-12-31" };
}

export default function Reports() {
  const businesses = businessService.getAll();
  const allTransactions = transactionService.getAll();
  const [bizId, setBizId] = useState(businesses[0]?.id ?? "");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [taxMode, setTaxMode] = useState<"us" | "canada" | "both">("us");
  const [propId, setPropId] = useState("all");

  const activeBiz = businesses.find(b => b.id === bizId);
  const range = useDateRange(dateFrom, dateTo);
  const bizTxns = allTransactions.filter(t => t.businessId === bizId);

  const income = calcTotalIncome(allTransactions, bizId, range);
  const expenses = calcTotalExpenses(allTransactions, bizId, range);
  const netProfit = income - expenses;

  // Tax Summary
  const expensesByUsCategory = useMemo(() =>
    calcExpensesByCategory(allTransactions, bizId, ALL_TAX_CATEGORIES, range),
    [allTransactions, bizId, range]
  );

  const expensesByCaCategory = useMemo(() => {
    const caExpenses = bizTxns.filter(t => t.transactionType === "expense" && (!range || (t.date >= range.start && t.date <= range.end)));
    const map: Record<string, { name: string; usd: number; cad: number; count: number }> = {};
    for (const t of caExpenses) {
      const catId = t.canadaTaxCategoryId ?? "uncategorized";
      const cat = CA_CATEGORIES.find(c => c.id === catId);
      if (!map[catId]) map[catId] = { name: cat?.name ?? "Uncategorized", usd: 0, cad: 0, count: 0 };
      map[catId].usd += t.amountUSD;
      map[catId].cad += t.amountCAD;
      map[catId].count++;
    }
    return Object.values(map).sort((a, b) => b.usd - a.usd);
  }, [bizTxns, range]);

  // Rental summary
  const rentalProps = activeBiz?.properties ?? [];
  const filterPropTxns = propId === "all" ? bizTxns : bizTxns.filter(t => t.propertyId === propId);
  const propInRange = (t: { date: string }) => !range || (t.date >= range.start && t.date <= range.end);

  const rentalIncome = filterPropTxns.filter(t => t.transactionType === "income" && propInRange(t)).reduce((s, t) => s + t.amountUSD, 0);
  const depositIn = filterPropTxns.filter(t => t.transactionType === "rental_deposit_received" && propInRange(t)).reduce((s, t) => s + t.amountUSD, 0);
  const depositOut = filterPropTxns.filter(t => t.transactionType === "rental_deposit_returned" && propInRange(t)).reduce((s, t) => s + t.amountUSD, 0);

  function getTotal(catIds: string[]) {
    return filterPropTxns
      .filter(t => t.transactionType === "expense" && catIds.includes(t.usTaxCategoryId ?? "") && propInRange(t))
      .reduce((s, t) => s + t.amountUSD, 0);
  }

  const repairsTotal = getTotal(["us-r-repair", "us-r-maint", "us-repair"]);
  const propTaxTotal = getTotal(["us-r-ptax", "us-tax"]);
  const insTotal = getTotal(["us-r-ins", "us-ins"]);
  const mortTotal = getTotal(["us-r-mort"]);
  const hoaTotal = getTotal(["us-r-hoa"]);
  const profTotal = getTotal(["us-legal", "us-r-legalf", "us-r-mgmt"]);
  const rentalExpenses = repairsTotal + propTaxTotal + insTotal + mortTotal + hoaTotal + profTotal;
  const netRentalIncome = rentalIncome - rentalExpenses;

  // Owner balances
  const ownerPositions = useMemo(() => {
    if (!activeBiz) return [];
    return activeBiz.owners.map(o => calcOwnerPosition(o, allTransactions, bizId, netProfit, range));
  }, [activeBiz, allTransactions, bizId, netProfit, range]);

  // Filters
  const filterControls = (
    <div className="flex flex-wrap gap-3 mb-5 p-4 bg-muted/30 rounded-lg border">
      <div>
        <Label className="text-xs">Business</Label>
        <Select value={bizId} onValueChange={setBizId}>
          <SelectTrigger className="w-44 mt-1 h-8 text-sm" data-testid="select-report-business">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">From</Label>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="w-36 mt-1 h-8 text-sm" data-testid="input-report-from" />
      </div>
      <div>
        <Label className="text-xs">To</Label>
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="w-36 mt-1 h-8 text-sm" data-testid="input-report-to" />
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Financial summaries and tax reports</p>
      </div>

      <Tabs defaultValue="tax">
        <TabsList className="mb-4">
          <TabsTrigger value="tax" data-testid="tab-tax-summary">Tax Summary</TabsTrigger>
          <TabsTrigger value="rental" data-testid="tab-rental">Rental Property</TabsTrigger>
          <TabsTrigger value="owner" data-testid="tab-owner">Owner Balances</TabsTrigger>
          <TabsTrigger value="ledger" data-testid="tab-ledger">Transaction Ledger</TabsTrigger>
        </TabsList>

        {/* TAX SUMMARY */}
        <TabsContent value="tax" className="space-y-4">
          <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg border">
            <div>
              <Label className="text-xs">Business</Label>
              <Select value={bizId} onValueChange={setBizId}>
                <SelectTrigger className="w-44 mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Tax System</Label>
              <div className="flex border rounded-lg overflow-hidden mt-1 h-8">
                {(["us", "canada", "both"] as const).map(m => (
                  <button key={m} onClick={() => setTaxMode(m)}
                    className={`px-3 text-xs font-medium transition-colors capitalize ${taxMode === m ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>
                    {m === "both" ? "Both" : m === "us" ? "US" : "Canada"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card className="shadow-sm"><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Income</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(income)}</p>
            </CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Expenses</p>
              <p className="text-xl font-bold text-red-500">{formatCurrency(expenses)}</p>
            </CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Net Profit</p>
              <p className={`text-xl font-bold ${netProfit >= 0 ? "text-primary" : "text-red-500"}`}>{formatCurrency(netProfit)}</p>
            </CardContent></Card>
          </div>

          {(taxMode === "us" || taxMode === "both") && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">US Expense Categories</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left py-2 text-xs text-muted-foreground">Category</th>
                    <th className="text-right py-2 text-xs text-muted-foreground">Transactions</th>
                    <th className="text-right py-2 text-xs text-muted-foreground">Total (USD)</th>
                    <th className="text-right py-2 text-xs text-muted-foreground">Total (CAD)</th>
                  </tr></thead>
                  <tbody>
                    {expensesByUsCategory.map(row => (
                      <tr key={row.categoryId} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="py-2">{row.categoryName}</td>
                        <td className="py-2 text-right text-muted-foreground">{row.count}</td>
                        <td className="py-2 text-right font-mono">{formatCurrency(row.totalUSD)}</td>
                        <td className="py-2 text-right font-mono text-muted-foreground">{formatCurrency(row.totalCAD, "CAD")}</td>
                      </tr>
                    ))}
                    {expensesByUsCategory.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-sm">No expenses in this period</td></tr>}
                  </tbody>
                  {expensesByUsCategory.length > 0 && (
                    <tfoot><tr className="border-t-2">
                      <td className="py-2 font-semibold">Total</td>
                      <td className="py-2 text-right text-muted-foreground">{expensesByUsCategory.reduce((s, r) => s + r.count, 0)}</td>
                      <td className="py-2 text-right font-semibold font-mono">{formatCurrency(expensesByUsCategory.reduce((s, r) => s + r.totalUSD, 0))}</td>
                      <td className="py-2 text-right font-mono text-muted-foreground">{formatCurrency(expensesByUsCategory.reduce((s, r) => s + r.totalCAD, 0), "CAD")}</td>
                    </tr></tfoot>
                  )}
                </table>
              </CardContent>
            </Card>
          )}

          {(taxMode === "canada" || taxMode === "both") && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Canadian Expense Categories</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left py-2 text-xs text-muted-foreground">Category</th>
                    <th className="text-right py-2 text-xs text-muted-foreground">Count</th>
                    <th className="text-right py-2 text-xs text-muted-foreground">Total (USD)</th>
                    <th className="text-right py-2 text-xs text-muted-foreground">Total (CAD)</th>
                  </tr></thead>
                  <tbody>
                    {expensesByCaCategory.map(row => (
                      <tr key={row.name} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="py-2">{row.name}</td>
                        <td className="py-2 text-right text-muted-foreground">{row.count}</td>
                        <td className="py-2 text-right font-mono">{formatCurrency(row.usd)}</td>
                        <td className="py-2 text-right font-mono text-muted-foreground">{formatCurrency(row.cad, "CAD")}</td>
                      </tr>
                    ))}
                    {expensesByCaCategory.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-sm">No categorized Canadian expenses</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* RENTAL SUMMARY */}
        <TabsContent value="rental" className="space-y-4">
          <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg border">
            <div>
              <Label className="text-xs">Business</Label>
              <Select value={bizId} onValueChange={v => { setBizId(v); setPropId("all"); }}>
                <SelectTrigger className="w-44 mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Property</Label>
              <Select value={propId} onValueChange={setPropId}>
                <SelectTrigger className="w-48 mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {rentalProps.map(p => <SelectItem key={p.id} value={p.id}>{p.propertyName} ({p.shortCode})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Rental Property Summary</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    { label: "Rental Income", value: rentalIncome, positive: true },
                    { label: "Security Deposits Received (liability)", value: depositIn, note: "Not income" },
                    { label: "Security Deposits Returned", value: depositOut },
                    { label: "Repairs & Maintenance", value: repairsTotal },
                    { label: "Property Taxes", value: propTaxTotal },
                    { label: "Insurance", value: insTotal },
                    { label: "Mortgage Interest", value: mortTotal },
                    { label: "HOA / Condo / Strata Fees", value: hoaTotal },
                    { label: "Professional & Legal Fees", value: profTotal },
                  ].map(row => (
                    <tr key={row.label} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="py-2.5">
                        {row.label}
                        {row.note && <Badge variant="secondary" className="ml-2 text-[10px]">{row.note}</Badge>}
                      </td>
                      <td className={`py-2.5 text-right font-mono font-medium ${row.positive ? "text-green-600" : "text-foreground"}`}>
                        {row.value > 0 ? formatCurrency(row.value) : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2">
                    <td className="py-2.5 font-bold">Net Rental Income</td>
                    <td className={`py-2.5 text-right font-bold font-mono text-lg ${netRentalIncome >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {formatCurrency(netRentalIncome)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OWNER BALANCES */}
        <TabsContent value="owner" className="space-y-4">
          {filterControls}
          {ownerPositions.map(op => (
            <Card key={op.ownerId} className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{op.ownerName}</CardTitle>
                  <Badge variant="secondary" className="text-xs">{op.ownershipPercentage}%</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      { label: "Profit Share", value: op.profitShare, color: "text-green-600" },
                      { label: "Withdrawn / Distributed", value: -op.withdrawn, color: "text-amber-600" },
                      { label: "Contributed", value: op.contributed, color: "text-blue-600" },
                      { label: "Reimbursements Owed", value: op.reimbursementsOwed, color: "text-orange-600" },
                      { label: "Reimbursements Paid", value: -op.reimbursementsPaid, color: "text-purple-600" },
                    ].map(r => (
                      <tr key={r.label} className="border-b border-border/30">
                        <td className="py-2 text-muted-foreground">{r.label}</td>
                        <td className={`py-2 text-right font-mono ${r.color}`}>{formatCurrency(Math.abs(r.value))}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2">
                      <td className="py-2.5 font-bold">Net Position</td>
                      <td className={`py-2.5 text-right font-bold font-mono text-lg ${op.netPosition >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {formatCurrency(op.netPosition)}
                        <span className="text-xs font-normal ml-1">({op.netPosition >= 0 ? "due to owner" : "owner owes"})</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
          {ownerPositions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No owners found for this business.</div>
          )}
        </TabsContent>

        {/* TRANSACTION LEDGER */}
        <TabsContent value="ledger" className="space-y-4">
          <div className="flex items-center justify-between">
            {filterControls}
            <Button variant="outline" size="sm"
              onClick={() => exportCSV(bizTxns.filter(t => !range || (t.date >= range.start && t.date <= range.end)))}
              data-testid="button-report-export-csv">
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </Button>
          </div>
          <Card className="shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Vendor</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {bizTxns
                    .filter(t => !range || (t.date >= range.start && t.date <= range.end))
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map(t => (
                      <tr key={t.id} className="border-b border-border/40 hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{t.date}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="secondary" className="text-[10px] capitalize">{t.transactionType.replace(/_/g, " ")}</Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-medium truncate max-w-[180px]">{t.vendorOrPayee}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">{t.description}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(t.amountUSD)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground text-center pb-2">
        Finance Track supports recordkeeping and tax preparation but does not replace a CPA or tax advisor.
      </p>
    </div>
  );
}
