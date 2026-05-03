import { useState, useMemo } from "react";
import { Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { businessService } from "@/services/businessService";
import { transactionService } from "@/services/transactionService";
import { calcOwnerPosition, calcNetProfit, formatCurrency } from "@/utils/calculations";

const REIMB_STATUS_LABELS: Record<string, string> = {
  not_applicable: "N/A", owed: "Owed", partially_paid: "Partial", paid: "Paid", waived: "Waived",
};
const REIMB_STATUS_CLASSES: Record<string, string> = {
  owed: "bg-orange-50 text-orange-700 border-orange-200",
  partially_paid: "bg-yellow-50 text-yellow-700 border-yellow-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  waived: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function Owners() {
  const { toast } = useToast();
  const businesses = businessService.getAll();
  const [selectedBizId, setSelectedBizId] = useState(businesses[0]?.id ?? "");
  const [transactions, setTransactions] = useState(() => transactionService.getAll());

  const activeBiz = businesses.find(b => b.id === selectedBizId);
  const bizTransactions = transactions.filter(t => t.businessId === selectedBizId);
  const netProfit = calcNetProfit(transactions, selectedBizId);

  const ownerPositions = useMemo(() => {
    if (!activeBiz) return [];
    return activeBiz.owners.map(o => calcOwnerPosition(o, transactions, selectedBizId, netProfit));
  }, [activeBiz, transactions, selectedBizId, netProfit]);

  function markReimbPaid(txnId: string) {
    transactionService.update(txnId, { reimbursementStatus: "paid" });
    setTransactions(transactionService.getAll());
    toast({ title: "Reimbursement marked as paid" });
  }

  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <Users className="w-8 h-8 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">No businesses found.</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-base font-bold">Owners & Reimbursements</h1>
          <p className="text-[11px] text-muted-foreground">Balances, profit shares, and reimbursements</p>
        </div>
        <Select value={selectedBizId} onValueChange={setSelectedBizId}>
          <SelectTrigger className="h-7 text-xs w-48" data-testid="select-owners-business"><SelectValue /></SelectTrigger>
          <SelectContent>
            {businesses.map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Compact summary stats */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Net Profit", value: formatCurrency(netProfit), color: netProfit >= 0 ? "text-green-600" : "text-red-500" },
          { label: "Total Owners", value: String(activeBiz?.owners.length ?? 0), color: "text-foreground" },
          { label: "Reimb. Owed", value: formatCurrency(ownerPositions.reduce((s, o) => s + o.reimbursementsOwed, 0)), color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="border rounded p-2.5 bg-card">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Owner balances — compact table */}
      <div className="border rounded overflow-hidden bg-card">
        <div className="px-3 py-1.5 border-b bg-muted/40">
          <span className="text-[11px] font-semibold">Owner Positions</span>
        </div>
        <table className="w-full text-xs">
          <thead className="border-b bg-muted/20">
            <tr>
              <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">Owner</th>
              <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">Profit Share</th>
              <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-muted-foreground hidden sm:table-cell">Withdrawn</th>
              <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-muted-foreground hidden sm:table-cell">Contributed</th>
              <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">Reimb. Owed</th>
              <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-muted-foreground hidden md:table-cell">Reimb. Paid</th>
              <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">Net Position</th>
            </tr>
          </thead>
          <tbody>
            {ownerPositions.map(op => (
              <tr key={op.ownerId} className="border-b border-border/40 hover:bg-muted/20" data-testid={`row-owner-${op.ownerId}`}>
                <td className="px-3 py-2">
                  <div className="font-medium">{op.ownerName}</div>
                  <div className="text-[10px] text-muted-foreground">{op.ownershipPercentage}% ownership</div>
                </td>
                <td className="px-3 py-2 text-right text-green-600 font-mono">{formatCurrency(op.profitShare)}</td>
                <td className="px-3 py-2 text-right text-amber-600 font-mono hidden sm:table-cell">{formatCurrency(op.withdrawn)}</td>
                <td className="px-3 py-2 text-right text-blue-600 font-mono hidden sm:table-cell">{formatCurrency(op.contributed)}</td>
                <td className="px-3 py-2 text-right text-orange-600 font-mono">{formatCurrency(op.reimbursementsOwed)}</td>
                <td className="px-3 py-2 text-right text-purple-600 font-mono hidden md:table-cell">{formatCurrency(op.reimbursementsPaid)}</td>
                <td className={`px-3 py-2 text-right font-semibold font-mono ${op.netPosition >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {formatCurrency(op.netPosition)}
                  <div className="text-[9px] font-normal text-muted-foreground">{op.netPosition >= 0 ? "due to owner" : "owner owes"}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reimbursable transactions — compact per owner */}
      {ownerPositions.map(op => {
        const reimbTxns = bizTransactions.filter(t =>
          t.isReimbursableToOwner && t.reimbursementOwnerId === op.ownerId
        );
        if (reimbTxns.length === 0) return null;
        return (
          <div key={op.ownerId} className="border rounded overflow-hidden bg-card">
            <div className="px-3 py-1.5 border-b bg-muted/40 flex items-center justify-between">
              <span className="text-[11px] font-semibold">{op.ownerName} — Reimbursable Transactions</span>
              <Badge variant="secondary" className="text-[9px]">
                {reimbTxns.filter(t => t.reimbursementStatus === "owed" || t.reimbursementStatus === "partially_paid").length} outstanding
              </Badge>
            </div>
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/20">
                <tr>
                  <th className="text-left px-3 py-1 text-[10px] font-semibold text-muted-foreground">Date</th>
                  <th className="text-left px-3 py-1 text-[10px] font-semibold text-muted-foreground">Vendor</th>
                  <th className="text-left px-3 py-1 text-[10px] font-semibold text-muted-foreground hidden sm:table-cell">Description</th>
                  <th className="text-right px-3 py-1 text-[10px] font-semibold text-muted-foreground">Amount</th>
                  <th className="text-center px-3 py-1 text-[10px] font-semibold text-muted-foreground">Status</th>
                  <th className="px-3 py-1 text-[10px]"></th>
                </tr>
              </thead>
              <tbody>
                {reimbTxns.map(t => (
                  <tr key={t.id} className="border-b border-border/30 hover:bg-muted/20" data-testid={`row-reimb-${t.id}`}>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{t.date}</td>
                    <td className="px-3 py-1.5 font-medium">{t.vendorOrPayee}</td>
                    <td className="px-3 py-1.5 hidden sm:table-cell text-muted-foreground truncate max-w-[160px]">{t.description}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{formatCurrency(t.amountUSD)}</td>
                    <td className="px-3 py-1.5 text-center">
                      <Badge className={`text-[9px] border px-1 py-0 ${REIMB_STATUS_CLASSES[t.reimbursementStatus ?? "not_applicable"] ?? ""}`}>
                        {REIMB_STATUS_LABELS[t.reimbursementStatus ?? "not_applicable"]}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5">
                      {(t.reimbursementStatus === "owed" || t.reimbursementStatus === "partially_paid") && (
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                          onClick={() => markReimbPaid(t.id)}
                          data-testid={`button-mark-paid-${t.id}`}>
                          <Check className="w-2.5 h-2.5 mr-1" /> Paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/20">
                <tr>
                  <td colSpan={3} className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">Total</td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-xs">
                    {formatCurrency(reimbTxns.reduce((s, t) => s + t.amountUSD, 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}
    </div>
  );
}
