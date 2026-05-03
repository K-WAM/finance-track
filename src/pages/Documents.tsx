import { useState, useMemo } from "react";
import { PlusCircle, Upload, Trash2, Pencil, FolderOpen, Search, Filter, FileText, FileCheck, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { businessService } from "@/services/businessService";
import { documentService } from "@/services/documentService";
import type { BusinessDocument, DocumentType, DocumentStatus } from "@/types";

function genId() { return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  tax_return: "Tax Return",
  bank_statement: "Bank Statement",
  receipt: "Receipt / Invoice",
  contract: "Contract",
  corporate_filing: "Corporate Filing",
  financial_statement: "Financial Statement",
  insurance: "Insurance Policy",
  property_deed: "Property Deed",
  lease_agreement: "Lease Agreement",
  invoice: "Invoice",
  permit_license: "Permit / License",
  other: "Other",
};

const DOC_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Draft",
  filed: "Filed",
  pending: "Pending",
  signed: "Signed",
  expired: "Expired",
  archived: "Archived",
};

const STATUS_CLASSES: Record<DocumentStatus, string> = {
  draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
  filed: "bg-green-50 text-green-700 border-green-200",
  pending: "bg-blue-50 text-blue-700 border-blue-200",
  signed: "bg-teal-50 text-teal-700 border-teal-200",
  expired: "bg-red-50 text-red-700 border-red-200",
  archived: "bg-gray-50 text-gray-600 border-gray-200",
};

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  tax_return: FileCheck,
  bank_statement: FileText,
  financial_statement: FileText,
  corporate_filing: FileCheck,
};

function DocIcon({ type }: { type: DocumentType }) {
  const Icon = TYPE_ICON[type] ?? File;
  return <Icon className="w-3.5 h-3.5" />;
}

interface DocFormState {
  businessId: string;
  propertyId: string;
  documentType: DocumentType;
  title: string;
  description: string;
  year: string;
  status: DocumentStatus;
  fileName: string;
  tags: string;
  notes: string;
  linkedTransactionId: string;
}

const DEFAULT_FORM: DocFormState = {
  businessId: "",
  propertyId: "",
  documentType: "receipt",
  title: "",
  description: "",
  year: String(new Date().getFullYear()),
  status: "pending",
  fileName: "",
  tags: "",
  notes: "",
  linkedTransactionId: "",
};

function DocModal({
  open, onClose, existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: BusinessDocument;
}) {
  const { toast } = useToast();
  const businesses = businessService.getAll();
  const [form, setForm] = useState<DocFormState>(
    existing
      ? {
          businessId: existing.businessId,
          propertyId: existing.propertyId ?? "",
          documentType: existing.documentType,
          title: existing.title,
          description: existing.description ?? "",
          year: existing.year ?? String(new Date().getFullYear()),
          status: existing.status,
          fileName: existing.fileName ?? "",
          tags: (existing.tags ?? []).join(", "),
          notes: existing.notes ?? "",
          linkedTransactionId: existing.linkedTransactionId ?? "",
        }
      : DEFAULT_FORM
  );
  const [fileSelected, setFileSelected] = useState(false);

  const activeBiz = businesses.find(b => b.id === form.businessId);

  function set<K extends keyof DocFormState>(key: K, val: DocFormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    if (!form.businessId) { toast({ title: "Select a business", variant: "destructive" }); return; }
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }

    const doc: BusinessDocument = {
      id: existing?.id ?? genId(),
      businessId: form.businessId,
      propertyId: form.propertyId || undefined,
      documentType: form.documentType,
      title: form.title.trim(),
      description: form.description || undefined,
      year: form.year || undefined,
      status: form.status,
      fileName: form.fileName || undefined,
      uploadedAt: existing?.uploadedAt ?? new Date().toISOString(),
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
      notes: form.notes || undefined,
      linkedTransactionId: form.linkedTransactionId || undefined,
    };

    if (existing) {
      documentService.update(existing.id, doc);
      toast({ title: "Document updated" });
    } else {
      documentService.create(doc);
      toast({ title: "Document record created" });
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">{existing ? "Edit Document" : "Add Document"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Business — required first */}
          <div>
            <Label className="text-xs">Business *</Label>
            <Select value={form.businessId} onValueChange={v => { set("businessId", v); set("propertyId", ""); }}>
              <SelectTrigger className="mt-1 h-8 text-xs" data-testid="select-doc-business">
                <SelectValue placeholder="Select business" />
              </SelectTrigger>
              <SelectContent>
                {businesses.map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Document Type</Label>
              <Select value={form.documentType} onValueChange={v => set("documentType", v as DocumentType)}>
                <SelectTrigger className="mt-1 h-8 text-xs" data-testid="select-doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v as DocumentStatus)}>
                <SelectTrigger className="mt-1 h-8 text-xs" data-testid="select-doc-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Title *</Label>
            <Input className="mt-1 h-8 text-xs" placeholder="e.g. 2024 Federal Tax Return" value={form.title}
              onChange={e => set("title", e.target.value)} data-testid="input-doc-title" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tax / Fiscal Year</Label>
              <Input className="mt-1 h-8 text-xs" placeholder="e.g. 2024" value={form.year}
                onChange={e => set("year", e.target.value)} data-testid="input-doc-year" />
            </div>
            {activeBiz && activeBiz.properties.length > 0 && (
              <div>
                <Label className="text-xs">Property (optional)</Label>
                <Select value={form.propertyId} onValueChange={v => set("propertyId", v)}>
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue placeholder="No property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" className="text-xs">No property</SelectItem>
                    {activeBiz.properties.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">{p.shortCode} — {p.propertyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Input className="mt-1 h-8 text-xs" placeholder="Brief description" value={form.description}
              onChange={e => set("description", e.target.value)} data-testid="input-doc-description" />
          </div>

          {/* File upload placeholder */}
          <div>
            <Label className="text-xs">File Upload</Label>
            <div className="mt-1 border-2 border-dashed border-border rounded-md p-3 text-center">
              {fileSelected ? (
                <p className="text-xs text-green-700 font-medium">File selected (stored locally — Firebase Storage required for persistence)</p>
              ) : (
                <>
                  <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground mb-1">Select file to attach</p>
                </>
              )}
              <input
                type="file"
                className="hidden"
                id="doc-file-input"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { set("fileName", f.name); setFileSelected(true); }
                }}
              />
              {/* TODO: Firebase Storage - upload file bytes here */}
              <Button variant="outline" size="sm" className="h-6 text-xs"
                onClick={() => document.getElementById("doc-file-input")?.click()}
                data-testid="button-select-file">
                {fileSelected ? "Change File" : "Browse"}
              </Button>
              {form.fileName && <p className="text-[10px] text-muted-foreground mt-1">{form.fileName}</p>}
            </div>
            {!fileSelected && (
              <div>
                <p className="text-[10px] text-muted-foreground mt-1 mb-1">Or enter filename manually:</p>
                <Input className="h-7 text-xs" placeholder="filename.pdf" value={form.fileName}
                  onChange={e => set("fileName", e.target.value)} />
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
            <Input className="mt-1 h-8 text-xs" placeholder="e.g. tax, 2024, federal" value={form.tags}
              onChange={e => set("tags", e.target.value)} data-testid="input-doc-tags" />
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea className="mt-1 text-xs resize-none" rows={2} placeholder="Additional notes..."
              value={form.notes} onChange={e => set("notes", e.target.value)} data-testid="textarea-doc-notes" />
          </div>

          <div>
            <Label className="text-xs">Linked Transaction ID <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input className="mt-1 h-8 text-xs font-mono" placeholder="txn-..." value={form.linkedTransactionId}
              onChange={e => set("linkedTransactionId", e.target.value)} />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} data-testid="button-save-document">
            {existing ? "Save Changes" : "Add Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Documents() {
  const { toast } = useToast();
  const businesses = businessService.getAll();
  const [docs, setDocs] = useState(() => documentService.getAll());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BusinessDocument | undefined>();
  const [bizFilter, setBizFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  function refresh() { setDocs(documentService.getAll()); }
  function handleClose() { setShowModal(false); setEditing(undefined); refresh(); }

  function handleDelete(id: string) {
    documentService.remove(id);
    toast({ title: "Document removed" });
    refresh();
  }

  const filtered = useMemo(() => {
    let list = [...docs];
    if (bizFilter !== "all") list = list.filter(d => d.businessId === bizFilter);
    if (typeFilter !== "all") list = list.filter(d => d.documentType === typeFilter);
    if (statusFilter !== "all") list = list.filter(d => d.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.title.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q) ||
        (d.fileName ?? "").toLowerCase().includes(q) ||
        (d.tags ?? []).some(t => t.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }, [docs, bizFilter, typeFilter, statusFilter, search]);

  const getBizName = (id: string) => businesses.find(b => b.id === id)?.name ?? id;
  const getPropCode = (bizId: string, propId?: string) => {
    if (!propId) return null;
    return businesses.find(b => b.id === bizId)?.properties.find(p => p.id === propId)?.shortCode ?? null;
  };

  return (
    <div className="p-3 space-y-3 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">Documents</h1>
          <p className="text-[11px] text-muted-foreground">{filtered.length} of {docs.length} records</p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)} data-testid="button-add-document" className="h-7 text-xs">
          <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 p-2.5 bg-muted/30 rounded border">
        <div className="relative">
          <Search className="absolute left-2 top-1.5 w-3 h-3 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-6 h-7 text-xs w-44" data-testid="input-search-docs" />
        </div>
        <Select value={bizFilter} onValueChange={setBizFilter}>
          <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="All Businesses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Businesses</SelectItem>
            {businesses.map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Types</SelectItem>
            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
            {Object.entries(DOC_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded overflow-hidden bg-card">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Title</th>
              <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Type</th>
              <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] hidden md:table-cell">Business</th>
              <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] hidden sm:table-cell">Year</th>
              <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Status</th>
              <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] hidden lg:table-cell">File</th>
              <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] hidden lg:table-cell">Tags</th>
              <th className="px-3 py-1.5 text-[10px]"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                  {docs.length === 0 ? (
                    <div>
                      <FolderOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                      <p>No documents yet. Add your first document record.</p>
                    </div>
                  ) : "No documents match your filters."}
                </td>
              </tr>
            )}
            {filtered.map(doc => (
              <tr key={doc.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                data-testid={`row-doc-${doc.id}`}>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <DocIcon type={doc.documentType} />
                    <div>
                      <div className="font-medium">{doc.title}</div>
                      {doc.description && <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">{doc.description}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">{DOC_TYPE_LABELS[doc.documentType]}</td>
                <td className="px-3 py-1.5 hidden md:table-cell">
                  <div>{getBizName(doc.businessId)}</div>
                  {getPropCode(doc.businessId, doc.propertyId) && (
                    <div className="text-[10px] text-muted-foreground font-mono">{getPropCode(doc.businessId, doc.propertyId)}</div>
                  )}
                </td>
                <td className="px-3 py-1.5 hidden sm:table-cell text-muted-foreground font-mono">{doc.year ?? "—"}</td>
                <td className="px-3 py-1.5">
                  <Badge className={`text-[10px] border ${STATUS_CLASSES[doc.status]}`}>
                    {DOC_STATUS_LABELS[doc.status]}
                  </Badge>
                </td>
                <td className="px-3 py-1.5 hidden lg:table-cell text-muted-foreground font-mono text-[10px] max-w-[120px] truncate">
                  {doc.fileName ?? "—"}
                </td>
                <td className="px-3 py-1.5 hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(doc.tags ?? []).slice(0, 3).map(t => (
                      <Badge key={t} variant="secondary" className="text-[9px] px-1 py-0">{t}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => { setEditing(doc); setShowModal(true); }}
                      data-testid={`button-edit-doc-${doc.id}`}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(doc.id)}
                      data-testid={`button-delete-doc-${doc.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground text-center pb-1">
        Document storage is metadata only. File upload requires Firebase Storage integration.
        {/* TODO: Firebase Storage */}
      </p>

      {showModal && (
        <DocModal open={showModal} onClose={handleClose} existing={editing} />
      )}
    </div>
  );
}
