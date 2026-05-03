export type BusinessType = "llc" | "corporation" | "sole_proprietorship" | "partnership" | "rental" | "other";
export type TaxContext = "us" | "canada" | "cross_border";
export type Currency = "USD" | "CAD";

export interface Owner {
  id: string;
  name: string;
  email?: string;
  ownershipPercentage: number;
  openingCapitalBalance?: number;
}

export interface Property {
  id: string;
  businessId: string;
  propertyName: string;
  address?: string;
  shortCode: string;
}

export interface Business {
  id: string;
  name: string;
  businessType: BusinessType;
  taxContext: TaxContext;
  defaultCurrency: Currency;
  owners: Owner[];
  properties: Property[];
  createdAt: string;
  // Legal & Tax IDs
  ein?: string;           // US Employer Identification Number XX-XXXXXXX
  businessNumber?: string; // Canadian Business Number (BN) 9-digit
  documentNumber?: string; // General registration / document number
  stateOfIncorporation?: string;
  // HQ Location
  hqStreet?: string;
  hqCity?: string;
  hqStateProvince?: string;
  hqCountry?: string;
  hqPostalCode?: string;
  // Additional Info
  yearFounded?: string;
  fiscalYearEnd?: string; // month "01"–"12"
  website?: string;
  phone?: string;
  description?: string;
}

export type TransactionType =
  | "expense"
  | "income"
  | "owner_contribution"
  | "owner_withdrawal"
  | "reimbursement_owed"
  | "reimbursement_paid"
  | "reimbursement_received"  // business collected reimbursement on an expense
  | "transfer"
  | "rental_deposit_received"
  | "rental_deposit_returned";

export type ReimbursementStatus = "not_applicable" | "owed" | "partially_paid" | "paid" | "waived";

export type PaymentMethod = "credit_card" | "bank_transfer" | "cash" | "check" | "zelle" | "ach" | "wire" | "other";

export interface Transaction {
  id: string;
  businessId: string;
  propertyId?: string;
  transactionType: TransactionType;
  date: string;
  vendorOrPayee: string;
  description: string;
  amountOriginal: number;
  currencyOriginal: Currency;
  exchangeRateToUSD: number;
  amountUSD: number;
  amountCAD: number;
  paymentMethod: PaymentMethod;
  usTaxCategoryId?: string;
  canadaTaxCategoryId?: string;
  isReimbursableToOwner: boolean;
  reimbursementOwnerId?: string;
  reimbursementStatus?: ReimbursementStatus;
  linkedTransactionId?: string; // links reimbursement_received to original expense
  notes?: string;
  receiptUrl?: string;
  internalReferenceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxCategory {
  id: string;
  name: string;
  system: "us" | "canada";
  subcategory?: "general" | "rental";
  keywords: string[];
}

export interface ExchangeRate {
  id: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
  date: string;
  isManual: boolean;
}

export type DocumentType =
  | "tax_return"
  | "bank_statement"
  | "receipt"
  | "contract"
  | "corporate_filing"
  | "financial_statement"
  | "insurance"
  | "property_deed"
  | "lease_agreement"
  | "invoice"
  | "permit_license"
  | "other";

export type DocumentStatus = "draft" | "filed" | "pending" | "signed" | "expired" | "archived";

export interface BusinessDocument {
  id: string;
  businessId: string;
  propertyId?: string;
  documentType: DocumentType;
  title: string;
  description?: string;
  year?: string;
  status: DocumentStatus;
  fileName?: string;
  fileSizeKb?: number;
  uploadedAt: string;
  tags?: string[];
  notes?: string;
  linkedTransactionId?: string;
}
