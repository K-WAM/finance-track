import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  ChevronRight, ChevronLeft, RefreshCw, AlertTriangle,
  Check, Upload, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { businessService } from "@/services/businessService";
import { transactionService } from "@/services/transactionService";
import { getCurrentRate, refreshRate } from "@/services/exchangeRateService";
import { US_GENERAL_CATEGORIES, US_RENTAL_CATEGORIES, CA_CATEGORIES, suggestCategories } from "@/data/taxCategories";
import { formatCurrency } from "@/utils/calculations";
import type { Transaction, TransactionType, PaymentMethod, Currency, ReimbursementStatus } from "@/types";

function genId() { return `txn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

const TXN_TYPES: { value: TransactionType; label: string; description: string; warning?: string }[] = [
  { value: "expense", label: "Expense", description: "A business cost or payment" },
  { value: "income", label: "Income", description: "Revenue received by the business" },
  { value: "reimbursement_received", label: "Reimbursement Received", description: "Business collected reimbursement on an expense paid on its behalf" },
  { value: "owner_contribution", label: "Owner Contribution", description: "Capital put in by an owner", warning: "Owner contributions are not business income." },
  { value: "owner_withdrawal", label: "Owner Withdrawal / Distribution", description: "Distribution taken by an owner", warning: "Owner withdrawals are not business expenses." },
  { value: "reimbursement_owed", label: "Reimbursement Owed", description: "Amount owed to an owner for expenses they paid personally" },
  { value: "reimbursement_paid", label: "Reimbursement Paid", description: "Reimbursement paid out to an owner" },
  { value: "rental_deposit_received", label: "Rental Deposit Received", description: "Security deposit received from tenant", warning: "Security deposits are tracked separately as a liability, not income." },
  { value: "rental_deposit_returned", label: "Rental Deposit Returned", description: "Security deposit returned to tenant" },
  { value: "transfer", label: "Transfer", description: "Movement of funds between accounts" },
];

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

const STEPS = ["Business & Type", "Amount & Date", "Category & Tax", "Notes & Save"];

interface FormState {
  businessId: string;
  transactionType: TransactionType;
  date: string;
  vendorOrPayee: string;
  description: string;
  amountOriginal: number;
  currencyOriginal: Currency;
  exchangeRateToUSD: number;
  paymentMethod: PaymentMethod;
  propertyId: string;
  taxMode: "us" | "canada" | "both";
  usTaxCategoryId: string;
  canadaTaxCategoryId: string;
  isReimbursableToOwner: boolean;
  reimbursementOwnerId: string;
  reimbursementStatus: ReimbursementStatus;
  linkedTransactionId: string;
  notes: string;
  internalReferenceId: string;
}

const DEFAULT_STATE: FormState = {
  businessId: "", transactionType: "expense",
  date: new Date().toISOString().split("T")[0],
  vendorOrPayee: "", description: "", amountOriginal: 0, currencyOriginal: "USD",
  exchangeRateToUSD: 1, paymentMethod: "credit_card", propertyId: "",
  taxMode: "us", usTaxCategoryId: "", canadaTaxCategoryId: "",
  isReimbursableToOwner: false, reimbursementOwnerId: "", reimbursementStatus: "owed",
  linkedTransactionId: "", notes: "", internalReferenceId: "",
};

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className={`flex items-center gap-1 ${i <= step ? "text-primary" : "text-muted-foreground/50"}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all ${
              i < step ? "bg-primary border-primary text-white" :
              i === step ? "border-primary text-primary bg-primary/10" :
              "border-muted-foreground/30 text-muted-foreground/40"
            }`}>
              {i < step ? <Check className="w-2.5 h-2.5" /> : i + 1}
            </div>
            <span className="hidden sm:block text-[10px] font-medium">{label}</span>
          </div>
          {i < total - 1 && <div className={`w-6 h-px ${i < step ? "bg-primary" : "bg-muted-foreground/20"}`} />}
        </div>
      ))}
    </div>
  );
}

export default function AddTransaction() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(DEFAULT_STATE);
  const [refreshing, setRefreshing] = useState(false);
  const [fxRate, setFxRate] = useState(getCurrentRate());

  const businesses = businessService.getAll();
  const activeBiz = businesses.find(b => b.id === form.businessId);
  const txnTypeInfo = TXN_TYPES.find(t => t.value === form.transactionType);

  const amountUSD = form.currencyOriginal === "USD" ? form.amountOriginal : form.amountOriginal * form.exchangeRateToUSD;
  const amountCAD = form.currencyOriginal === "CAD" ? form.amountOriginal : form.amountOriginal * (1 / form.exchangeRateToUSD) * fxRate.usdToCad;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    if (form.currencyOriginal === "USD") set("exchangeRateToUSD", 1);
    else set("exchangeRateToUSD", fxRate.cadToUsd);
  }, [form.currencyOriginal, fxRate]);

  const suggestions = useMemo(
    () => suggestCategories(`${form.vendorOrPayee} ${form.description}`),
    [form.vendorOrPayee, form.description]
  );

  async function handleRefreshFx() {
    setRefreshing(true);
    const r = await refreshRate();
    setFxRate(r);
    if (form.currencyOriginal === "CAD") set("exchangeRateToUSD", r.cadToUsd);
    setRefreshing(false);
    toast({ title: `FX: 1 CAD = ${r.cadToUsd.toFixed(4)} USD (mock)` });
  }

  function canNext(): boolean {
    if (step === 0) return !!form.businessId && !!form.transactionType;
    if (step === 1) return !!form.date && !!form.vendorOrPayee && form.amountOriginal > 0;
    return true;
  }

  function handleSave() {
    const txn: Transaction = {
      id: genId(),
      businessId: form.businessId,
      propertyId: form.propertyId || undefined,
      transactionType: form.transactionType,
      date: form.date,
      vendorOrPayee: form.vendorOrPayee,
      description: form.description,
      amountOriginal: form.amountOriginal,
      currencyOriginal: form.currencyOriginal,
      exchangeRateToUSD: form.exchangeRateToUSD,
      amountUSD,
      amountCAD,
      paymentMethod: form.paymentMethod,
      usTaxCategoryId: form.usTaxCategoryId || undefined,
      canadaTaxCategoryId: form.canadaTaxCategoryId || undefined,
      isReimbursableToOwner: form.isReimbursableToOwner,
      reimbursementOwnerId: form.isReimbursableToOwner ? form.reimbursementOwnerId || undefined : undefined,
      reimbursementStatus: form.isReimbursableToOwner ? form.reimbursementStatus : "not_applicable",
      linkedTransactionId: form.linkedTransactionId || undefined,
      notes: form.notes || undefined,
      internalReferenceId: form.internalReferenceId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    transactionService.create(txn);
    toast({ title: "Transaction saved" });
    setLocation("/transactions");
  }

  return (
    <div className="p-3 max-w-xl mx-auto space-y-3">
      <div>
        <h1 className="text-base font-bold">Add Transaction</h1>
        <p className="text-[11px] text-muted-foreground">Record a new financial transaction</p>
      </div>

      <StepDots step={step} total={STEPS.length} />

      <Card className="shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step {step + 1} — {STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">

          {/* STEP 0 */}
          {step === 0 && (
            <>
              <div>
                <Label className="text-xs">Business *</Label>
                <Select value={form.businessId} onValueChange={v => set("businessId", v)}>
                  <SelectTrigger className="mt-1 h-7 text-xs" data-testid="select-txn-business">
                    <SelectValue placeholder="Select business" />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Transaction Type *</Label>
                <div className="mt-1 border rounded overflow-hidden divide-y">
                  {TXN_TYPES.map(t => (
                    <button key={t.value} onClick={() => set("transactionType", t.value)}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        form.transactionType === t.value
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/50 text-foreground"
                      }`}
                      data-testid={`button-txn-type-${t.value}`}>
                      <span className="font-medium">{t.label}</span>
                      <span className="text-muted-foreground ml-2 text-[10px]">{t.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              {txnTypeInfo?.warning && (
                <div className="flex items-start gap-2 p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{txnTypeInfo.warning}</span>
                </div>
              )}
            </>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Date *</Label>
                  <Input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                    className="mt-1 h-7 text-xs" data-testid="input-date" />
                </div>
                <div>
                  <Label className="text-xs">Vendor / Payee *</Label>
                  <Input placeholder="e.g. County Tax Collector" value={form.vendorOrPayee}
                    onChange={e => set("vendorOrPayee", e.target.value)} className="mt-1 h-7 text-xs" data-testid="input-vendor" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Input placeholder="Brief description" value={form.description}
                  onChange={e => set("description", e.target.value)} className="mt-1 h-7 text-xs" data-testid="input-description" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Amount *</Label>
                  <div className="flex border rounded overflow-hidden mt-1">
                    <Input type="number" min={0} step="0.01" placeholder="0.00" value={form.amountOriginal || ""}
                      onChange={e => set("amountOriginal", parseFloat(e.target.value) || 0)}
                      className="border-0 rounded-none h-7 text-xs flex-1" data-testid="input-amount" />
                    {(["USD","CAD"] as Currency[]).map(c => (
                      <button key={c} onClick={() => set("currencyOriginal", c)}
                        className={`px-2 text-[10px] font-semibold transition-colors ${form.currencyOriginal === c ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}
                        data-testid={`button-currency-${c}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Payment Method</Label>
                  <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v as PaymentMethod)}>
                    <SelectTrigger className="mt-1 h-7 text-xs" data-testid="select-payment-method"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.currencyOriginal === "CAD" && (
                <div className="p-2 rounded bg-blue-50 border border-blue-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-800 text-[10px] uppercase tracking-wide">FX Rate (CAD → USD)</span>
                    <Button variant="outline" size="sm" onClick={handleRefreshFx} disabled={refreshing}
                      className="h-6 text-[10px]" data-testid="button-refresh-fx">
                      <RefreshCw className={`w-2.5 h-2.5 mr-1 ${refreshing ? "animate-spin" : ""}`} />
                      {refreshing ? "…" : "Refresh"}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" step="0.0001" value={form.exchangeRateToUSD}
                      onChange={e => set("exchangeRateToUSD", parseFloat(e.target.value) || 0)}
                      className="w-28 h-6 text-xs bg-white" data-testid="input-exchange-rate" />
                    <span className="text-[10px] text-blue-700">= {form.exchangeRateToUSD.toFixed(4)} USD per CAD (mock)</span>
                  </div>
                  <div className="flex gap-4 text-[10px] text-blue-700">
                    <span>USD: <strong>{formatCurrency(amountUSD)}</strong></span>
                    <span>CAD: <strong>{formatCurrency(amountCAD, "CAD")}</strong></span>
                  </div>
                </div>
              )}
              {form.amountOriginal > 0 && form.currencyOriginal === "USD" && (
                <p className="text-[10px] text-muted-foreground">
                  CAD equiv: {formatCurrency(amountCAD, "CAD")} @ {fxRate.usdToCad.toFixed(4)}
                </p>
              )}
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              {(suggestions.us.length > 0 || suggestions.ca.length > 0) && (
                <div className="p-2 rounded bg-green-50 border border-green-200">
                  <p className="text-[10px] font-semibold text-green-800 mb-1.5">Smart suggestions</p>
                  <div className="flex flex-wrap gap-1">
                    {suggestions.us.map(s => (
                      <button key={s.id} onClick={() => set("usTaxCategoryId", s.id)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 hover:bg-green-200 text-green-800">
                        US: {s.name}
                      </button>
                    ))}
                    {suggestions.ca.map(s => (
                      <button key={s.id} onClick={() => set("canadaTaxCategoryId", s.id)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 hover:bg-teal-200 text-teal-800">
                        CA: {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs">Tax Mode</Label>
                <div className="flex border rounded overflow-hidden mt-1 w-fit">
                  {(["us","canada","both"] as const).map(m => (
                    <button key={m} onClick={() => set("taxMode", m)}
                      className={`px-3 py-1 text-xs font-medium transition-colors capitalize ${form.taxMode === m ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}
                      data-testid={`button-tax-mode-${m}`}>
                      {m === "us" ? "US" : m === "canada" ? "Canada" : "Both"}
                    </button>
                  ))}
                </div>
              </div>

              {(form.taxMode === "us" || form.taxMode === "both") && (
                <div>
                  <Label className="text-xs">US Tax Category</Label>
                  <Select value={form.usTaxCategoryId} onValueChange={v => set("usTaxCategoryId", v)}>
                    <SelectTrigger className="mt-1 h-7 text-xs" data-testid="select-us-category"><SelectValue placeholder="Select US category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">— None —</SelectItem>
                      {US_GENERAL_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                      {US_RENTAL_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(form.taxMode === "canada" || form.taxMode === "both") && (
                <div>
                  <Label className="text-xs">Canadian Tax Category</Label>
                  <Select value={form.canadaTaxCategoryId} onValueChange={v => set("canadaTaxCategoryId", v)}>
                    <SelectTrigger className="mt-1 h-7 text-xs" data-testid="select-ca-category"><SelectValue placeholder="Select Canadian category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">— None —</SelectItem>
                      {CA_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {activeBiz && activeBiz.properties.length > 0 && (
                <div>
                  <Label className="text-xs">Property / Project</Label>
                  <Select value={form.propertyId} onValueChange={v => set("propertyId", v)}>
                    <SelectTrigger className="mt-1 h-7 text-xs" data-testid="select-property"><SelectValue placeholder="No property" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">No property</SelectItem>
                      {activeBiz.properties.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.shortCode} — {p.propertyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/40 border">
                <Checkbox id="reimbursable" checked={form.isReimbursableToOwner}
                  onCheckedChange={v => set("isReimbursableToOwner", !!v)} data-testid="checkbox-reimbursable" />
                <Label htmlFor="reimbursable" className="text-xs cursor-pointer">Reimbursable to an owner</Label>
              </div>

              {form.isReimbursableToOwner && activeBiz && (
                <div className="grid grid-cols-2 gap-2 p-2 rounded bg-purple-50 border border-purple-200">
                  <div>
                    <Label className="text-xs">Owner</Label>
                    <Select value={form.reimbursementOwnerId} onValueChange={v => set("reimbursementOwnerId", v)}>
                      <SelectTrigger className="mt-1 h-7 text-xs bg-white" data-testid="select-reimbursement-owner"><SelectValue placeholder="Owner" /></SelectTrigger>
                      <SelectContent>
                        {activeBiz.owners.map(o => <SelectItem key={o.id} value={o.id} className="text-xs">{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={form.reimbursementStatus} onValueChange={v => set("reimbursementStatus", v as ReimbursementStatus)}>
                      <SelectTrigger className="mt-1 h-7 text-xs bg-white" data-testid="select-reimbursement-status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owed" className="text-xs">Owed</SelectItem>
                        <SelectItem value="partially_paid" className="text-xs">Partially Paid</SelectItem>
                        <SelectItem value="paid" className="text-xs">Paid</SelectItem>
                        <SelectItem value="waived" className="text-xs">Waived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {form.transactionType === "reimbursement_received" && (
                <div>
                  <Label className="text-xs">Linked Original Transaction ID <span className="text-muted-foreground">(optional)</span></Label>
                  <Input className="mt-1 h-7 text-xs font-mono" placeholder="txn-..."
                    value={form.linkedTransactionId} onChange={e => set("linkedTransactionId", e.target.value)} />
                </div>
              )}

              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea rows={2} className="mt-1 text-xs resize-none" placeholder="Additional context..."
                  value={form.notes} onChange={e => set("notes", e.target.value)} data-testid="textarea-notes" />
              </div>
              <div>
                <Label className="text-xs">Internal Reference ID</Label>
                <Input className="mt-1 h-7 text-xs font-mono" placeholder="ref-..." value={form.internalReferenceId}
                  onChange={e => set("internalReferenceId", e.target.value)} data-testid="input-reference" />
              </div>

              <div className="border-2 border-dashed border-border rounded p-2 text-center">
                <Upload className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-[10px] text-muted-foreground">Receipt upload requires Firebase Storage {/* TODO: Firebase Storage */}</p>
              </div>

              {/* Summary */}
              <div className="rounded border bg-muted/20 p-3 text-xs space-y-1">
                <p className="font-semibold text-[11px] mb-2 uppercase tracking-wide text-muted-foreground">Summary</p>
                {[
                  ["Business", businesses.find(b => b.id === form.businessId)?.name],
                  ["Type", TXN_TYPES.find(t => t.value === form.transactionType)?.label],
                  ["Date", form.date],
                  ["Vendor", form.vendorOrPayee],
                  ["Amount", `${formatCurrency(form.amountOriginal, form.currencyOriginal)}${form.currencyOriginal === "CAD" ? ` (${formatCurrency(amountUSD)} USD)` : ""}`],
                  ["Payment", PAYMENT_METHODS.find(m => m.value === form.paymentMethod)?.label],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{val ?? "—"}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" size="sm" className="h-7 text-xs"
          onClick={() => step === 0 ? setLocation("/transactions") : setStep(s => s - 1)}
          data-testid="button-step-back">
          <ChevronLeft className="w-3.5 h-3.5 mr-1" /> {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button size="sm" className="h-7 text-xs" onClick={() => setStep(s => s + 1)} disabled={!canNext()}
            data-testid="button-step-next">
            Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        ) : (
          <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={handleSave}
            data-testid="button-save-transaction">
            <Check className="w-3.5 h-3.5 mr-1" /> Save Transaction
          </Button>
        )}
      </div>
    </div>
  );
}
