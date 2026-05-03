import React, { useState } from "react";
import { PlusCircle, Building2, Trash2, Pencil, Users, Home, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { businessService } from "@/services/businessService";
import type { Business, Owner, Property, BusinessType, TaxContext, Currency } from "@/types";

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  llc: "LLC", corporation: "Corporation", sole_proprietorship: "Sole Proprietorship",
  partnership: "Partnership", rental: "Rental Property", other: "Other",
};
const TAX_CONTEXT_LABELS: Record<TaxContext, string> = {
  us: "United States", canada: "Canada", cross_border: "Cross-Border (US & CA)",
};
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function OwnerRow({ owner, onChange, onRemove }: {
  owner: Owner;
  onChange: (id: string, field: keyof Owner, value: string | number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <tr className="border-b border-border/40">
      <td className="py-1 pr-1.5">
        <Input value={owner.name} onChange={e => onChange(owner.id, "name", e.target.value)}
          placeholder="Name" className="h-7 text-xs" data-testid={`input-owner-name-${owner.id}`} />
      </td>
      <td className="py-1 pr-1.5">
        <Input value={owner.email ?? ""} onChange={e => onChange(owner.id, "email", e.target.value)}
          placeholder="email@..." type="email" className="h-7 text-xs" data-testid={`input-owner-email-${owner.id}`} />
      </td>
      <td className="py-1 pr-1.5 w-20">
        <div className="relative">
          <Input value={owner.ownershipPercentage} type="number" min={0} max={100}
            onChange={e => onChange(owner.id, "ownershipPercentage", Number(e.target.value))}
            className="h-7 text-xs pr-5" data-testid={`input-owner-pct-${owner.id}`} />
          <span className="absolute right-2 top-1.5 text-[10px] text-muted-foreground">%</span>
        </div>
      </td>
      <td className="py-1 pr-1.5 w-28">
        <Input value={owner.openingCapitalBalance ?? ""} type="number"
          onChange={e => onChange(owner.id, "openingCapitalBalance", Number(e.target.value))}
          placeholder="$0" className="h-7 text-xs" data-testid={`input-owner-capital-${owner.id}`} />
      </td>
      <td className="py-1 text-right">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
          onClick={() => onRemove(owner.id)} data-testid={`button-remove-owner-${owner.id}`}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </td>
    </tr>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-1.5 bg-muted/40 hover:bg-muted/60 text-xs font-semibold text-left transition-colors"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {title}
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}

function BusinessModal({ open, onClose, existing }: {
  open: boolean; onClose: () => void; existing?: Business;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState<BusinessType>(existing?.businessType ?? "llc");
  const [taxCtx, setTaxCtx] = useState<TaxContext>(existing?.taxContext ?? "us");
  const [currency, setCurrency] = useState<Currency>(existing?.defaultCurrency ?? "USD");
  const [ein, setEin] = useState(existing?.ein ?? "");
  const [bn, setBn] = useState(existing?.businessNumber ?? "");
  const [docNum, setDocNum] = useState(existing?.documentNumber ?? "");
  const [stateIncorp, setStateIncorp] = useState(existing?.stateOfIncorporation ?? "");
  const [hqStreet, setHqStreet] = useState(existing?.hqStreet ?? "");
  const [hqCity, setHqCity] = useState(existing?.hqCity ?? "");
  const [hqState, setHqState] = useState(existing?.hqStateProvince ?? "");
  const [hqCountry, setHqCountry] = useState(existing?.hqCountry ?? "US");
  const [hqZip, setHqZip] = useState(existing?.hqPostalCode ?? "");
  const [yearFounded, setYearFounded] = useState(existing?.yearFounded ?? "");
  const [fyEnd, setFyEnd] = useState(existing?.fiscalYearEnd ?? "12");
  const [website, setWebsite] = useState(existing?.website ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [owners, setOwners] = useState<Owner[]>(existing?.owners ?? [
    { id: genId(), name: "", ownershipPercentage: 100, openingCapitalBalance: 0 }
  ]);
  const [properties, setProperties] = useState<Property[]>(existing?.properties ?? []);

  const totalPct = owners.reduce((s, o) => s + o.ownershipPercentage, 0);

  function addOwner() {
    setOwners(prev => [...prev, { id: genId(), name: "", ownershipPercentage: 0, openingCapitalBalance: 0 }]);
  }
  function changeOwner(id: string, field: keyof Owner, value: string | number) {
    setOwners(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
  }
  function removeOwner(id: string) { setOwners(prev => prev.filter(o => o.id !== id)); }
  function addProp() {
    const bizId = existing?.id ?? genId();
    setProperties(prev => [...prev, { id: genId(), businessId: bizId, propertyName: "", address: "", shortCode: "" }]);
  }
  function changeProp(id: string, field: keyof Property, value: string) {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  }
  function removeProp(id: string) { setProperties(prev => prev.filter(p => p.id !== id)); }

  function handleSave() {
    if (!name.trim()) { toast({ title: "Business name is required", variant: "destructive" }); return; }
    if (owners.length === 0) { toast({ title: "Add at least one owner", variant: "destructive" }); return; }
    if (Math.abs(totalPct - 100) > 0.01) {
      toast({ title: `Ownership must total 100% (currently ${totalPct}%)`, variant: "destructive" });
      return;
    }
    const bizId = existing?.id ?? `biz-${genId()}`;
    const biz: Business = {
      id: bizId, name: name.trim(), businessType: type, taxContext: taxCtx,
      defaultCurrency: currency, owners,
      properties: properties.map(p => ({ ...p, businessId: bizId })),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      ein: ein || undefined, businessNumber: bn || undefined,
      documentNumber: docNum || undefined,
      stateOfIncorporation: stateIncorp || undefined,
      hqStreet: hqStreet || undefined, hqCity: hqCity || undefined,
      hqStateProvince: hqState || undefined, hqCountry: hqCountry || undefined,
      hqPostalCode: hqZip || undefined, yearFounded: yearFounded || undefined,
      fiscalYearEnd: fyEnd || undefined, website: website || undefined,
      phone: phone || undefined, description: description || undefined,
    };
    if (existing) { businessService.update(bizId, biz); toast({ title: "Business updated" }); }
    else { businessService.create(biz); toast({ title: "Business created" }); }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">{existing ? "Edit Business" : "Add Business"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2.5 py-1">
          {/* Core Info */}
          <Section title="Business Identity">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Business Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Legal business name"
                  className="mt-0.5 h-7 text-xs" data-testid="input-business-name" />
              </div>
              <div>
                <Label className="text-xs">Business Type</Label>
                <Select value={type} onValueChange={v => setType(v as BusinessType)}>
                  <SelectTrigger className="mt-0.5 h-7 text-xs" data-testid="select-business-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BUSINESS_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tax Context</Label>
                <Select value={taxCtx} onValueChange={v => setTaxCtx(v as TaxContext)}>
                  <SelectTrigger className="mt-0.5 h-7 text-xs" data-testid="select-tax-context"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TAX_CONTEXT_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Default Currency</Label>
                <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
                  <SelectTrigger className="mt-0.5 h-7 text-xs" data-testid="select-default-currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD" className="text-xs">USD — US Dollar</SelectItem>
                    <SelectItem value="CAD" className="text-xs">CAD — Canadian Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Fiscal Year End (Month)</Label>
                <Select value={fyEnd} onValueChange={setFyEnd}>
                  <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1).padStart(2, "0")} className="text-xs">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          {/* Tax IDs */}
          <Section title="Tax & Legal IDs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">US EIN <span className="text-muted-foreground font-normal">XX-XXXXXXX</span></Label>
                <Input value={ein} onChange={e => setEin(e.target.value)} placeholder="12-3456789"
                  className="mt-0.5 h-7 text-xs font-mono" data-testid="input-ein" />
              </div>
              <div>
                <Label className="text-xs">CA Business Number <span className="text-muted-foreground font-normal">9-digit BN</span></Label>
                <Input value={bn} onChange={e => setBn(e.target.value)} placeholder="123456789"
                  className="mt-0.5 h-7 text-xs font-mono" data-testid="input-bn" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Document Number <span className="text-muted-foreground font-normal">Registration / filing / doc #</span></Label>
                <Input value={docNum} onChange={e => setDocNum(e.target.value)} placeholder="e.g. 202500012345"
                  className="mt-0.5 h-7 text-xs font-mono" data-testid="input-doc-number" />
              </div>
              <div>
                <Label className="text-xs">State of Incorporation</Label>
                <Input value={stateIncorp} onChange={e => setStateIncorp(e.target.value)} placeholder="e.g. Delaware"
                  className="mt-0.5 h-7 text-xs" data-testid="input-state-incorp" />
              </div>
              <div>
                <Label className="text-xs">Year Founded</Label>
                <Input value={yearFounded} onChange={e => setYearFounded(e.target.value)} placeholder="e.g. 2018" type="number"
                  className="mt-0.5 h-7 text-xs" data-testid="input-year-founded" />
              </div>
            </div>
          </Section>

          {/* HQ */}
          <Section title="HQ Location" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Street Address</Label>
                <Input value={hqStreet} onChange={e => setHqStreet(e.target.value)} placeholder="123 Main St"
                  className="mt-0.5 h-7 text-xs" data-testid="input-hq-street" />
              </div>
              <div>
                <Label className="text-xs">City</Label>
                <Input value={hqCity} onChange={e => setHqCity(e.target.value)} placeholder="City"
                  className="mt-0.5 h-7 text-xs" data-testid="input-hq-city" />
              </div>
              <div>
                <Label className="text-xs">State / Province</Label>
                <Input value={hqState} onChange={e => setHqState(e.target.value)} placeholder="CA"
                  className="mt-0.5 h-7 text-xs" data-testid="input-hq-state" />
              </div>
              <div>
                <Label className="text-xs">Country</Label>
                <Select value={hqCountry} onValueChange={setHqCountry}>
                  <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US" className="text-xs">United States</SelectItem>
                    <SelectItem value="CA" className="text-xs">Canada</SelectItem>
                    <SelectItem value="Other" className="text-xs">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">ZIP / Postal Code</Label>
                <Input value={hqZip} onChange={e => setHqZip(e.target.value)} placeholder="90210"
                  className="mt-0.5 h-7 text-xs" data-testid="input-hq-zip" />
              </div>
            </div>
          </Section>

          {/* Contact */}
          <Section title="Contact & Web" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Website</Label>
                <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..."
                  className="mt-0.5 h-7 text-xs" data-testid="input-website" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555-000-0000"
                  className="mt-0.5 h-7 text-xs" data-testid="input-phone" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Description / Notes</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description"
                  className="mt-0.5 h-7 text-xs" data-testid="input-description" />
              </div>
            </div>
          </Section>

          {/* Owners */}
          <Section title={`Owners · Total: ${totalPct}%`}>
            <div className="flex justify-between items-center mb-2">
              <span className={`text-[10px] font-medium ${Math.abs(totalPct - 100) < 0.01 ? "text-green-600" : "text-orange-500"}`}>
                {Math.abs(totalPct - 100) < 0.01 ? "Ownership totals 100%" : `${totalPct}% — must equal 100%`}
              </span>
              <Button variant="outline" size="sm" onClick={addOwner} className="h-6 text-xs"
                data-testid="button-add-owner">
                <PlusCircle className="w-3 h-3 mr-1" /> Add Owner
              </Button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 text-[10px] text-muted-foreground font-medium">Name</th>
                  <th className="text-left py-1 text-[10px] text-muted-foreground font-medium">Email</th>
                  <th className="text-left py-1 text-[10px] text-muted-foreground font-medium w-20">Share</th>
                  <th className="text-left py-1 text-[10px] text-muted-foreground font-medium w-28">Capital ($)</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {owners.map(o => (
                  <OwnerRow key={o.id} owner={o} onChange={changeOwner} onRemove={removeOwner} />
                ))}
                {owners.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-muted-foreground text-xs">No owners. Click Add Owner.</td></tr>
                )}
              </tbody>
            </table>
          </Section>

          {/* Properties */}
          <Section title="Properties / Projects" defaultOpen>
            <div className="flex justify-end mb-2">
              <Button variant="outline" size="sm" onClick={addProp} className="h-6 text-xs"
                data-testid="button-add-property">
                <PlusCircle className="w-3 h-3 mr-1" /> Add Property
              </Button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 text-[10px] text-muted-foreground font-medium">Name</th>
                  <th className="text-left py-1 text-[10px] text-muted-foreground font-medium">Address</th>
                  <th className="text-left py-1 text-[10px] text-muted-foreground font-medium w-20">Short Code</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {properties.map(p => (
                  <tr key={p.id} className="border-b border-border/40">
                    <td className="py-1 pr-1.5">
                      <Input value={p.propertyName} onChange={e => changeProp(p.id, "propertyName", e.target.value)}
                        placeholder="Property name" className="h-7 text-xs" data-testid={`input-prop-name-${p.id}`} />
                    </td>
                    <td className="py-1 pr-1.5">
                      <Input value={p.address ?? ""} onChange={e => changeProp(p.id, "address", e.target.value)}
                        placeholder="Address" className="h-7 text-xs" data-testid={`input-prop-address-${p.id}`} />
                    </td>
                    <td className="py-1 pr-1.5">
                      <Input value={p.shortCode} onChange={e => changeProp(p.id, "shortCode", e.target.value)}
                        placeholder="RIV317" className="h-7 text-xs font-mono" data-testid={`input-prop-code-${p.id}`} />
                    </td>
                    <td className="py-1 text-right">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                        onClick={() => removeProp(p.id)} data-testid={`button-remove-prop-${p.id}`}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {properties.length === 0 && (
                  <tr><td colSpan={4} className="py-3 text-center text-muted-foreground text-xs">No properties. Click Add Property.</td></tr>
                )}
              </tbody>
            </table>
          </Section>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} data-testid="button-save-business">
            {existing ? "Save Changes" : "Create Business"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Businesses() {
  const [businesses, setBusinesses] = useState(() => businessService.getAll());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Business | undefined>();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  function refresh() { setBusinesses(businessService.getAll()); }
  function handleClose() { setShowModal(false); setEditing(undefined); refresh(); }
  function handleDelete(id: string) { businessService.remove(id); toast({ title: "Business removed" }); refresh(); }
  function toggleExpand(id: string) { setExpanded(e => ({ ...e, [id]: !e[id] })); }

  return (
    <div className="p-3 space-y-3 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">Businesses</h1>
          <p className="text-[11px] text-muted-foreground">{businesses.length} businesses</p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)} className="h-7 text-xs" data-testid="button-add-business">
          <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add Business
        </Button>
      </div>

      {businesses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded bg-card">
          <Building2 className="w-10 h-10 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">No businesses yet. Add your first one.</p>
        </div>
      ) : (
        <div className="border rounded overflow-hidden bg-card">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Business</th>
                <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] hidden sm:table-cell">Type</th>
                <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] hidden md:table-cell">EIN / BN</th>
                <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] hidden lg:table-cell">HQ</th>
                <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Owners</th>
                <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] hidden md:table-cell">Properties</th>
                <th className="px-3 py-1.5 text-[10px]"></th>
              </tr>
            </thead>
            <tbody>
              {businesses.map(biz => (
                <React.Fragment key={biz.id}>
                  <tr className="border-b border-border/40 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(biz.id)}
                    data-testid={`row-business-${biz.id}`}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {expanded[biz.id] ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                        <div>
                          <div className="font-semibold">{biz.name}</div>
                          {biz.description && <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">{biz.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 hidden sm:table-cell">
                      <div>{BUSINESS_TYPE_LABELS[biz.businessType]}</div>
                      <div className="text-[10px] text-muted-foreground">{TAX_CONTEXT_LABELS[biz.taxContext]}</div>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell font-mono">
                      {biz.ein ? <div>US: {biz.ein}</div> : null}
                      {biz.businessNumber ? <div className="text-muted-foreground">CA: {biz.businessNumber}</div> : null}
                      {!biz.ein && !biz.businessNumber && <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell text-muted-foreground">
                      {biz.hqCity ? `${biz.hqCity}${biz.hqStateProvince ? `, ${biz.hqStateProvince}` : ""} ${biz.hqCountry ?? ""}` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {biz.owners.map(o => (
                          <Badge key={o.id} variant="secondary" className="text-[9px] px-1.5 py-0">{o.name} {o.ownershipPercentage}%</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {biz.properties.map(p => (
                          <Badge key={p.id} variant="outline" className="text-[9px] px-1.5 py-0 font-mono">{p.shortCode}</Badge>
                        ))}
                        {biz.properties.length === 0 && <span className="text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => { setEditing(biz); setShowModal(true); }}
                          data-testid={`button-edit-business-${biz.id}`}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                          onClick={() => handleDelete(biz.id)}
                          data-testid={`button-delete-business-${biz.id}`}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expanded[biz.id] && (
                    <tr key={`${biz.id}-detail`} className="bg-muted/20 border-b border-border/40">
                      <td colSpan={7} className="px-4 py-2.5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Owners</p>
                            {biz.owners.map(o => (
                              <div key={o.id} className="flex justify-between">
                                <span>{o.name}</span>
                                <span className="text-muted-foreground">{o.ownershipPercentage}% · ${(o.openingCapitalBalance ?? 0).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Properties</p>
                            {biz.properties.length === 0 ? <p className="text-muted-foreground">None</p> : biz.properties.map(p => (
                              <div key={p.id}><span className="font-mono mr-1.5">{p.shortCode}</span>{p.propertyName}</div>
                            ))}
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Tax IDs</p>
                            {biz.ein && <div>EIN: <span className="font-mono">{biz.ein}</span></div>}
                            {biz.businessNumber && <div>BN: <span className="font-mono">{biz.businessNumber}</span></div>}
                            {biz.documentNumber && <div>Doc #: <span className="font-mono">{biz.documentNumber}</span></div>}
                            {biz.stateOfIncorporation && <div>Inc: {biz.stateOfIncorporation}</div>}
                            {biz.yearFounded && <div>Founded: {biz.yearFounded}</div>}
                            {!biz.ein && !biz.businessNumber && !biz.documentNumber && <p className="text-muted-foreground">Not set</p>}
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Contact & HQ</p>
                            {biz.hqStreet && <div>{biz.hqStreet}</div>}
                            {biz.hqCity && <div>{biz.hqCity}{biz.hqStateProvince ? `, ${biz.hqStateProvince}` : ""} {biz.hqPostalCode}</div>}
                            {biz.phone && <div>{biz.phone}</div>}
                            {biz.website && <a href={biz.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{biz.website}</a>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <BusinessModal open={showModal} onClose={handleClose} existing={editing} />}
    </div>
  );
}
