import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { PlusCircle, Search, Download, Filter, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { businessService } from "@/services/businessService";
import { transactionService } from "@/services/transactionService";
import { getCurrentRate, refreshRate } from "@/services/exchangeRateService";
import { ALL_TAX_CATEGORIES, US_GENERAL_CATEGORIES, US_RENTAL_CATEGORIES, CA_CATEGORIES } from "@/data/taxCategories";
import { formatCurrency } from "@/utils/calculations";
import type { Transaction, TransactionType, PaymentMethod, Currency, ReimbursementStatus } from "@/types";

export const TXN_TYPE_LABELS: Record<string, string> = {
  expense: "Expense",
  income: "Income",
  owner_contribution: "Owner Contribution",
  owner_withdrawal: "Owner Withdrawal",
  reimbursement_owed: "Reimbursement Owed",
  reimbursement_paid: "Reimbursement Paid",
  reimbursement_received: "Reimbursement Received",
  transfer: "Transfer",
  rental_deposit_received: "Deposit Received",
  rental_deposit_returned: "Deposit Returned",
};

export const TXN_BADGE_CLASSES: Record<string, string> = {
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

const REIMB_STATUS_LABELS: Record<string, string> = {
  not_applicable: "N/A", owed: "Owed", partially_paid: "Partial", paid: "Paid", waived: "Waived",
};
const REIMB_STATUS_CLASSES: Record<string, string> = {
  owed: "bg-orange-50 text-orange-700",
  partially_paid: "bg-yellow-50 text-yellow-700",
  paid: "bg-green-50 text-green-700",
  waived: "bg-gray-50 text-gray-600",
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "credit_card", label: "Credit Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "zelle", label: "Zelle" },
  { value: "ach", label: "ACH" },
  { value: "wire", label: "Wire Transfer" },
  { value: "other", label: "Other" },
];

export function exportCSV(transactions: Transaction[]) {
  const businesses = businessService.getAll();
  const getBizName = (id: string) => businesses.find(b => b.id === id)?.name ?? id;
  const getPropCode = (bizId: string, propId?: string) => {
    if (!propId) return "";
    return businesses.find(b => b.id === bizId)?.properties.find(p => p.id === propId)?.shortCode ?? propId;
  };
  const getCatName = (id?: string) => id ? ALL_TAX_CATEGORIES.find(c => c.id === id)?.name ?? id : "";

  const header = ["Date","Type","Business","Property","Vendor/Payee","Description",
    "Amount","Currency","Amount USD","Amount CAD","Exchange Rate",
    "Payment Method","US Category","CA Category",
    "Reimbursable","Reimb Status","Notes","Ref ID"].join(",");

  const rows = transactions.map(t => [
    t.date, TXN_TYPE_LABELS[t.transactionType] ?? t.transactionType,
    getBizName(t.businessId), getPropCode(t.businessId, t.propertyId),
    `"${t.vendorOrPayee}"`, `"${t.description}"`,
    t.amountOriginal, t.currencyOriginal, t.amountUSD, t.amountCAD, t.exchangeRateToUSD,
    t.paymentMethod, getCatName(t.usTaxCategoryId), getCatName(t.canadaTaxCategoryId),
    t.isReimbursableToOwner ? "Yes" : "No",
    t.reimbursementStatus ?? "", `"${t.notes ?? ""}"`, t.internalReferenceId ?? "",
  ].join(","));

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finance-track-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Inline Edit Modal ────────────────────────────────────────────────────────
interface EditState {
  date: string;
  vendorOrPayee: string;
  description: string;
  amountOriginal: number;
  currencyOriginal: Currency;
  exchangeRateToUSD: number;
  transactionType: TransactionType;
  paymentMethod: PaymentMethod;
  usTaxCategoryId: string;
  canadaTaxCategoryId: string;
  propertyId: string;
  isReimbursableToOwner: boolean;
  reimbursementOwnerId: string;
  reimbursementStatus: ReimbursementStatus;
  notes: string;
  internalReferenceId: string;
}

function EditModal({ txn, onClose }: { txn: Transaction; onClose: () => void }) {
  const { toast } = useToast();
  const businesses = businessService.getAll();
  const biz = businesses.find(b => b.id === txn.businessId);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<EditState>({
    date: txn.date,
    vendorOrPayee: txn.vendorOrPayee,
    description: txn.description,
    amountOriginal: txn.amountOriginal,
    currencyOriginal: txn.currencyOriginal,
    exchangeRateToUSD: txn.exchangeRateToUSD,
    transactionType: txn.transactionType,
    paymentMethod: txn.paymentMethod,
    usTaxCategoryId: txn.usTaxCategoryId ?? "",
    canadaTaxCategoryId: txn.canadaTaxCategoryId ?? "",
    propertyId: txn.propertyId ?? "",
    isReimbursableToOwner: txn.isReimbursableToOwner,
    reimbursementOwnerId: txn.reimbursementOwnerId ?? "",
    reimbursementStatus: txn.reimbursementStatus ?? "not_applicable",
    notes: txn.notes ?? "",
    internalReferenceId: txn.internalReferenceId ?? "",
  });

  function set<K extends keyof EditState>(key: K, val: EditState[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  const amountUSD = form.currencyOriginal === "USD" ? form.amountOriginal : form.amountOriginal * form.exchangeRateToUSD;
  const amountCAD = form.currencyOriginal === "CAD" ? form.amountOriginal : form.amountOriginal / form.exchangeRateToUSD * (getCurrentRate().usdToCad);

  async function handleRefreshFx() {
    setRefreshing(true);
    const r = await refreshRate();
    if (form.currencyOriginal === "CAD") set("exchangeRateToUSD", r.cadToUsd);
    setRefreshing(false);
  }

  function handleSave() {
    transactionService.update(txn.id, {
      date: form.date,
      vendorOrPayee: form.vendorOrPayee,
      description: form.description,
      amountOriginal: form.amountOriginal,
      currencyOriginal: form.currencyOriginal,
      exchangeRateToUSD: form.exchangeRateToUSD,
      amountUSD,
      amountCAD,
      transactionType: form.transactionType,
      paymentMethod: form.paymentMethod,
      usTaxCategoryId: form.usTaxCategoryId || undefined,
      canadaTaxCategoryId: form.canadaTaxCategoryId || undefined,
      propertyId: form.propertyId || undefined,
      isReimbursableToOwner: form.isReimbursableToOwner,
      reimbursementOwnerId: form.isReimbursableToOwner ? form.reimbursementOwnerId || undefined : undefined,
      reimbursementStatus: form.isReimbursableToOwner ? form.reimbursementStatus : "not_applicable",
      notes: form.notes || undefined,
      internalReferenceId: form.internalReferenceId || undefined,
    });
    toast({ title: "Transaction updated" });
    onClose();
  }

  const G = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</Label>
      <div className="mt-0.5">{children}</div>
    </div>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Edit Transaction <span className="font-mono text-muted-foreground text-xs ml-2">{txn.id}</span></DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2.5 py-1">
          <G label="Date">
            <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} className="h-7 text-xs" />
          </G>
          <G label="Transaction Type">
            <Select value={form.transactionType} onValueChange={v => set("transactionType", v as TransactionType)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TXN_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </G>
          <G label="Vendor / Payee">
            <Input value={form.vendorOrPayee} onChange={e => set("vendorOrPayee", e.target.value)} className="h-7 text-xs" />
          </G>
          <G label="Description">
            <Input value={form.description} onChange={e => set("description", e.target.value)} className="h-7 text-xs" />
          </G>
          <G label="Amount">
            <div className="flex border rounded overflow-hidden">
              <Input type="number" min={0} step="0.01" value={form.amountOriginal || ""}
                onChange={e => set("amountOriginal", parseFloat(e.target.value) || 0)}
                className="border-0 rounded-none h-7 text-xs flex-1" />
              {(["USD","CAD"] as Currency[]).map(c => (
                <button key={c} onClick={() => set("currencyOriginal", c)}
                  className={`px-2 text-xs font-medium transition-colors ${form.currencyOriginal === c ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>
                  {c}
                </button>
              ))}
            </div>
          </G>
          <G label="Payment Method">
            <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v as PaymentMethod)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </G>

          {/* FX */}
          {form.currencyOriginal === "CAD" && (
            <div className="col-span-2 grid grid-cols-3 gap-2 p-2 bg-blue-50 rounded border border-blue-200 text-xs">
              <G label="Rate (CAD→USD)">
                <div className="flex gap-1">
                  <Input type="number" step="0.0001" value={form.exchangeRateToUSD}
                    onChange={e => set("exchangeRateToUSD", parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs w-24" />
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={handleRefreshFx} disabled={refreshing}>
                    {refreshing ? "…" : "↻"}
                  </Button>
                </div>
              </G>
              <G label="USD Equiv."><p className="text-sm font-semibold mt-1">{formatCurrency(amountUSD)}</p></G>
              <G label="CAD Equiv."><p className="text-sm font-semibold mt-1">{formatCurrency(amountCAD, "CAD")}</p></G>
            </div>
          )}

          <G label="US Tax Category">
            <Select value={form.usTaxCategoryId} onValueChange={v => set("usTaxCategoryId", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-xs">— None —</SelectItem>
                {US_GENERAL_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                {US_RENTAL_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </G>
          <G label="Canadian Tax Category">
            <Select value={form.canadaTaxCategoryId} onValueChange={v => set("canadaTaxCategoryId", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-xs">— None —</SelectItem>
                {CA_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </G>

          {biz && biz.properties.length > 0 && (
            <G label="Property">
              <Select value={form.propertyId} onValueChange={v => set("propertyId", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="No property" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">No property</SelectItem>
                  {biz.properties.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.shortCode} — {p.propertyName}</SelectItem>)}
                </SelectContent>
              </Select>
            </G>
          )}

          <G label="Internal Ref ID">
            <Input value={form.internalReferenceId} onChange={e => set("internalReferenceId", e.target.value)}
              className="h-7 text-xs font-mono" placeholder="ref-..." />
          </G>

          {/* Reimbursement */}
          <div className="col-span-2 flex items-center gap-2 p-2 rounded border bg-muted/30">
            <Checkbox id="edit-reimb" checked={form.isReimbursableToOwner}
              onCheckedChange={v => set("isReimbursableToOwner", !!v)} />
            <Label htmlFor="edit-reimb" className="text-xs cursor-pointer">Reimbursable to owner</Label>
            {form.isReimbursableToOwner && biz && (
              <div className="flex gap-2 ml-2">
                <Select value={form.reimbursementOwnerId} onValueChange={v => set("reimbursementOwnerId", v)}>
                  <SelectTrigger className="h-6 text-xs w-32"><SelectValue placeholder="Owner" /></SelectTrigger>
                  <SelectContent>
                    {biz.owners.map(o => <SelectItem key={o.id} value={o.id} className="text-xs">{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.reimbursementStatus} onValueChange={v => set("reimbursementStatus", v as ReimbursementStatus)}>
                  <SelectTrigger className="h-6 text-xs w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owed" className="text-xs">Owed</SelectItem>
                    <SelectItem value="partially_paid" className="text-xs">Partial</SelectItem>
                    <SelectItem value="paid" className="text-xs">Paid</SelectItem>
                    <SelectItem value="waived" className="text-xs">Waived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="col-span-2">
            <G label="Notes">
              <Textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                className="text-xs resize-none" rows={2} />
            </G>
          </div>
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} data-testid="button-save-edit">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Transactions() {
  const { toast } = useToast();
  const businesses = businessService.getAll();
  const [allTransactions, setAllTransactions] = useState(() => transactionService.getAll());
  const [editingTxn, setEditingTxn] = useState<Transaction | undefined>();

  const [bizFilter, setBizFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [reimbFilter, setReimbFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);

  function refresh() { setAllTransactions(transactionService.getAll()); }

  function handleDelete(id: string) {
    transactionService.remove(id);
    toast({ title: "Transaction deleted" });
    refresh();
  }

  function handleEditClose() { setEditingTxn(undefined); refresh(); }

  const filtered = useMemo(() => {
    let txns = [...allTransactions];
    if (bizFilter !== "all") txns = txns.filter(t => t.businessId === bizFilter);
    if (typeFilter !== "all") txns = txns.filter(t => t.transactionType === typeFilter);
    if (reimbFilter === "yes") txns = txns.filter(t => t.isReimbursableToOwner);
    if (reimbFilter === "no") txns = txns.filter(t => !t.isReimbursableToOwner);
    if (statusFilter !== "all") txns = txns.filter(t => t.reimbursementStatus === statusFilter);
    if (currencyFilter !== "all") txns = txns.filter(t => t.currencyOriginal === currencyFilter);
    if (dateFrom) txns = txns.filter(t => t.date >= dateFrom);
    if (dateTo) txns = txns.filter(t => t.date <= dateTo);
    if (search) {
      const q = search.toLowerCase();
      txns = txns.filter(t =>
        t.vendorOrPayee.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.notes ?? "").toLowerCase().includes(q) ||
        (t.internalReferenceId ?? "").toLowerCase().includes(q)
      );
    }
    return txns.sort((a, b) => b.date.localeCompare(a.date));
  }, [allTransactions, bizFilter, typeFilter, reimbFilter, statusFilter, currencyFilter, search, dateFrom, dateTo]);

  const getBizName = (id: string) => {
    const b = businesses.find(b => b.id === id);
    return b?.name ?? id;
  };
  const getPropCode = (bizId: string, propId?: string) => {
    if (!propId) return null;
    const b = businesses.find(b => b.id === bizId);
    return b?.properties.find(p => p.id === propId)?.shortCode ?? null;
  };
  const getCatName = (id?: string) => {
    if (!id) return "";
    return ALL_TAX_CATEGORIES.find(c => c.id === id)?.name ?? id;
  };

  const totalIncome = filtered.filter(t => t.transactionType === "income" || t.transactionType === "reimbursement_received").reduce((s, t) => s + t.amountUSD, 0);
  const totalExpenses = filtered.filter(t => t.transactionType === "expense").reduce((s, t) => s + t.amountUSD, 0);

  return (
    <div className="p-3 space-y-2 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">Transactions</h1>
          <p className="text-[11px] text-muted-foreground">{filtered.length} / {allTransactions.length} rows</p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setFiltersOpen(f => !f)}>
            <Filter className="w-3 h-3 mr-1" /> Filters
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => exportCSV(filtered)} data-testid="button-export-csv">
            <Download className="w-3 h-3 mr-1" /> CSV
          </Button>
          <Link href="/transactions/new">
            <Button size="sm" className="h-7 text-xs" data-testid="button-add-transaction">
              <PlusCircle className="w-3 h-3 mr-1" /> Add
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      {filtersOpen && (
        <div className="p-2 bg-muted/30 rounded border space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <div className="relative">
              <Search className="absolute left-2 top-1.5 w-3 h-3 text-muted-foreground" />
              <Input placeholder="Search vendor, description, ref…" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-6 h-7 text-xs w-52" data-testid="input-search-transactions" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1.5">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>
            <Select value={bizFilter} onValueChange={setBizFilter}>
              <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="All Businesses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Businesses</SelectItem>
                {businesses.map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-7 text-xs w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Types</SelectItem>
                {Object.entries(TXN_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={reimbFilter} onValueChange={setReimbFilter}>
              <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="Reimbursable" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All</SelectItem>
                <SelectItem value="yes" className="text-xs">Reimbursable</SelectItem>
                <SelectItem value="no" className="text-xs">Not Reimbursable</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                {Object.entries(REIMB_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="h-7 text-xs w-24"><SelectValue placeholder="Currency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All</SelectItem>
                <SelectItem value="USD" className="text-xs">USD</SelectItem>
                <SelectItem value="CAD" className="text-xs">CAD</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="h-7 text-xs w-32" data-testid="input-date-from" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="h-7 text-xs w-32" data-testid="input-date-to" />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded overflow-hidden bg-card">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-2.5 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Date</th>
              <th className="text-left px-2.5 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Type</th>
              <th className="text-left px-2.5 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Vendor / Payee</th>
              <th className="text-left px-2.5 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] hidden md:table-cell">Business · Prop</th>
              <th className="text-left px-2.5 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] hidden xl:table-cell">Category</th>
              <th className="text-right px-2.5 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Amount</th>
              <th className="text-right px-2.5 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] hidden sm:table-cell">USD</th>
              <th className="text-center px-2.5 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] hidden lg:table-cell">Reimb.</th>
              <th className="text-left px-2.5 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] hidden xl:table-cell">Notes</th>
              <th className="px-2.5 py-1.5 text-[10px]"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground text-xs">
                  No transactions match filters.{" "}
                  <Link href="/transactions/new" className="text-primary hover:underline">Add one</Link>
                </td>
              </tr>
            )}
            {filtered.map(t => (
              <tr key={t.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                data-testid={`row-transaction-${t.id}`}>
                <td className="px-2.5 py-1 font-mono text-[10px] text-muted-foreground whitespace-nowrap">{t.date}</td>
                <td className="px-2.5 py-1 whitespace-nowrap">
                  <Badge className={`text-[9px] border px-1 py-0 ${TXN_BADGE_CLASSES[t.transactionType] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
                    {TXN_TYPE_LABELS[t.transactionType] ?? t.transactionType}
                  </Badge>
                </td>
                <td className="px-2.5 py-1">
                  <div className="font-medium truncate max-w-[140px]">{t.vendorOrPayee}</div>
                  <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{t.description}</div>
                </td>
                <td className="px-2.5 py-1 hidden md:table-cell">
                  <div className="text-[10px] truncate max-w-[120px]">{getBizName(t.businessId)}</div>
                  {getPropCode(t.businessId, t.propertyId) && (
                    <Badge variant="outline" className="text-[9px] font-mono px-1 py-0">{getPropCode(t.businessId, t.propertyId)}</Badge>
                  )}
                </td>
                <td className="px-2.5 py-1 hidden xl:table-cell text-[10px] text-muted-foreground max-w-[120px] truncate">
                  {getCatName(t.usTaxCategoryId) || getCatName(t.canadaTaxCategoryId) || "—"}
                </td>
                <td className="px-2.5 py-1 text-right whitespace-nowrap font-mono">
                  {formatCurrency(t.amountOriginal, t.currencyOriginal)}
                  {t.currencyOriginal === "CAD" && <span className="text-[9px] text-muted-foreground ml-0.5">C</span>}
                </td>
                <td className="px-2.5 py-1 text-right hidden sm:table-cell whitespace-nowrap text-[10px] text-muted-foreground font-mono">
                  {t.currencyOriginal === "CAD" ? formatCurrency(t.amountUSD) : "—"}
                </td>
                <td className="px-2.5 py-1 text-center hidden lg:table-cell">
                  {t.isReimbursableToOwner && t.reimbursementStatus && t.reimbursementStatus !== "not_applicable" ? (
                    <Badge className={`text-[9px] px-1 py-0 ${REIMB_STATUS_CLASSES[t.reimbursementStatus] ?? ""}`}>
                      {REIMB_STATUS_LABELS[t.reimbursementStatus]}
                    </Badge>
                  ) : <span className="text-muted-foreground/30">—</span>}
                </td>
                <td className="px-2.5 py-1 hidden xl:table-cell text-[10px] text-muted-foreground max-w-[100px] truncate">
                  {t.notes ?? "—"}
                </td>
                <td className="px-2.5 py-1">
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => setEditingTxn(t)}
                      data-testid={`button-edit-${t.id}`}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                      onClick={() => handleDelete(t.id)}
                      data-testid={`button-delete-${t.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer totals */}
        {filtered.length > 0 && (
          <div className="px-3 py-1.5 border-t bg-muted/30 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{filtered.length} rows</span>
            <div className="flex gap-4 font-mono">
              <span className="text-green-600">In: {formatCurrency(totalIncome)}</span>
              <span className="text-red-500">Out: {formatCurrency(totalExpenses)}</span>
              <span className={totalIncome - totalExpenses >= 0 ? "text-primary font-semibold" : "text-red-500 font-semibold"}>
                Net: {formatCurrency(totalIncome - totalExpenses)}
              </span>
            </div>
          </div>
        )}
      </div>

      {editingTxn && <EditModal txn={editingTxn} onClose={handleEditClose} />}
    </div>
  );
}
