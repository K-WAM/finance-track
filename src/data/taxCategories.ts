import type { TaxCategory } from "@/types";

export const US_GENERAL_CATEGORIES: TaxCategory[] = [
  { id: "us-adv", name: "Advertising and Marketing", system: "us", subcategory: "general", keywords: ["advertising", "marketing", "ad", "promotion", "social media", "google ads"] },
  { id: "us-auto", name: "Auto and Travel", system: "us", subcategory: "general", keywords: ["auto", "car", "gas", "mileage", "travel", "uber", "lyft", "parking", "airline", "hotel"] },
  { id: "us-bank", name: "Bank Fees", system: "us", subcategory: "general", keywords: ["bank fee", "service charge", "wire fee", "nsf", "overdraft"] },
  { id: "us-comm", name: "Commissions and Fees", system: "us", subcategory: "general", keywords: ["commission", "referral fee", "finder fee", "broker"] },
  { id: "us-labor", name: "Contract Labor", system: "us", subcategory: "general", keywords: ["contractor", "freelancer", "1099", "subcontractor", "labor"] },
  { id: "us-depr", name: "Depreciation", system: "us", subcategory: "general", keywords: ["depreciation", "amortization"] },
  { id: "us-ins", name: "Insurance", system: "us", subcategory: "general", keywords: ["insurance", "premium", "liability", "coverage", "policy"] },
  { id: "us-int", name: "Interest Expense", system: "us", subcategory: "general", keywords: ["interest", "loan interest", "credit card interest"] },
  { id: "us-legal", name: "Legal and Professional Fees", system: "us", subcategory: "general", keywords: ["lawyer", "attorney", "legal", "accountant", "cpa", "consultant", "professional"] },
  { id: "us-lic", name: "Licenses and Permits", system: "us", subcategory: "general", keywords: ["license", "permit", "registration", "business license"] },
  { id: "us-meals", name: "Meals", system: "us", subcategory: "general", keywords: ["meals", "food", "restaurant", "lunch", "dinner", "breakfast", "entertainment"] },
  { id: "us-office", name: "Office Expenses", system: "us", subcategory: "general", keywords: ["office", "supplies", "stationery", "printer", "paper"] },
  { id: "us-rent", name: "Rent or Lease", system: "us", subcategory: "general", keywords: ["rent", "lease", "office rent"] },
  { id: "us-repair", name: "Repairs and Maintenance", system: "us", subcategory: "general", keywords: ["repair", "maintenance", "fix", "plumber", "plumbing", "electrician", "hvac"] },
  { id: "us-suppl", name: "Supplies", system: "us", subcategory: "general", keywords: ["supplies", "materials", "consumables"] },
  { id: "us-tax", name: "Taxes and Licenses", system: "us", subcategory: "general", keywords: ["tax", "taxes", "county tax", "city tax", "sales tax"] },
  { id: "us-util", name: "Utilities", system: "us", subcategory: "general", keywords: ["utilities", "electricity", "water", "gas", "sewage"] },
  { id: "us-wages", name: "Wages and Payroll", system: "us", subcategory: "general", keywords: ["wages", "payroll", "salary", "employee", "w-2"] },
  { id: "us-soft", name: "Software and Subscriptions", system: "us", subcategory: "general", keywords: ["software", "subscription", "saas", "app", "microsoft", "adobe", "quickbooks"] },
  { id: "us-edu", name: "Education and Training", system: "us", subcategory: "general", keywords: ["education", "training", "course", "seminar", "conference"] },
  { id: "us-dues", name: "Dues and Memberships", system: "us", subcategory: "general", keywords: ["dues", "membership", "association", "club", "organization"] },
  { id: "us-tel", name: "Telephone and Internet", system: "us", subcategory: "general", keywords: ["telephone", "phone", "internet", "cell", "wireless", "telecom"] },
  { id: "us-other", name: "Other Business Expense", system: "us", subcategory: "general", keywords: [] },
];

export const US_RENTAL_CATEGORIES: TaxCategory[] = [
  { id: "us-r-income", name: "Rental Income", system: "us", subcategory: "rental", keywords: ["rent payment", "rental income", "tenant payment", "lease payment"] },
  { id: "us-r-dep-in", name: "Security Deposit Received", system: "us", subcategory: "rental", keywords: ["security deposit", "deposit received", "tenant deposit"] },
  { id: "us-r-dep-out", name: "Security Deposit Returned", system: "us", subcategory: "rental", keywords: ["deposit returned", "deposit refund"] },
  { id: "us-r-repair", name: "Repairs", system: "us", subcategory: "rental", keywords: ["repair", "fix", "plumber", "plumbing", "electrician", "roofer", "contractor"] },
  { id: "us-r-maint", name: "Maintenance", system: "us", subcategory: "rental", keywords: ["maintenance", "upkeep", "service", "inspection"] },
  { id: "us-r-clean", name: "Cleaning", system: "us", subcategory: "rental", keywords: ["cleaning", "cleaner", "maid", "janitorial"] },
  { id: "us-r-land", name: "Landscaping", system: "us", subcategory: "rental", keywords: ["landscaping", "lawn", "gardening", "yard", "mowing", "snow removal"] },
  { id: "us-r-pest", name: "Pest Control", system: "us", subcategory: "rental", keywords: ["pest", "exterminator", "bug", "rodent", "termite"] },
  { id: "us-r-mgmt", name: "Property Management Fees", system: "us", subcategory: "rental", keywords: ["property management", "management fee", "property manager"] },
  { id: "us-r-hoa", name: "HOA or Condo Fees", system: "us", subcategory: "rental", keywords: ["hoa", "condo fee", "strata", "homeowners association", "condo association"] },
  { id: "us-r-mort", name: "Mortgage Interest", system: "us", subcategory: "rental", keywords: ["mortgage", "mortgage interest", "home loan interest"] },
  { id: "us-r-ptax", name: "Property Taxes", system: "us", subcategory: "rental", keywords: ["property tax", "real estate tax", "county tax", "tax collector", "ad valorem"] },
  { id: "us-r-ins", name: "Insurance", system: "us", subcategory: "rental", keywords: ["insurance", "landlord insurance", "property insurance", "hazard insurance"] },
  { id: "us-r-util", name: "Utilities Paid by Owner", system: "us", subcategory: "rental", keywords: ["utilities", "electricity", "water", "gas paid by owner"] },
  { id: "us-r-advtenant", name: "Advertising for Tenants", system: "us", subcategory: "rental", keywords: ["tenant advertising", "rental listing", "zillow", "craigslist", "vacancy"] },
  { id: "us-r-legalf", name: "Legal Fees", system: "us", subcategory: "rental", keywords: ["legal fee", "attorney", "eviction", "lease attorney"] },
  { id: "us-r-lease", name: "Leasing Fees", system: "us", subcategory: "rental", keywords: ["leasing fee", "agent commission", "realtor fee"] },
  { id: "us-r-insp", name: "Inspection Fees", system: "us", subcategory: "rental", keywords: ["inspection", "inspector", "home inspection"] },
  { id: "us-r-appl", name: "Appliance Replacement", system: "us", subcategory: "rental", keywords: ["appliance", "refrigerator", "stove", "washer", "dryer", "dishwasher"] },
  { id: "us-r-capimpr", name: "Capital Improvement", system: "us", subcategory: "rental", keywords: ["capital improvement", "renovation", "remodel", "addition", "upgrade"] },
  { id: "us-r-depr", name: "Depreciation", system: "us", subcategory: "rental", keywords: ["depreciation"] },
  { id: "us-r-ten-reimb", name: "Tenant Reimbursement", system: "us", subcategory: "rental", keywords: ["tenant reimbursement"] },
  { id: "us-r-own-reimb", name: "Owner Reimbursement", system: "us", subcategory: "rental", keywords: ["owner reimbursement", "reimburse owner"] },
  { id: "us-r-other", name: "Other Rental Expense", system: "us", subcategory: "rental", keywords: [] },
];

export const CA_CATEGORIES: TaxCategory[] = [
  { id: "ca-adv", name: "Advertising", system: "canada", keywords: ["advertising", "marketing", "ad", "promotion"] },
  { id: "ca-meals", name: "Meals and Entertainment", system: "canada", keywords: ["meals", "food", "restaurant", "entertainment", "lunch", "dinner"] },
  { id: "ca-ins", name: "Insurance", system: "canada", keywords: ["insurance", "premium", "coverage"] },
  { id: "ca-int", name: "Interest and Bank Charges", system: "canada", keywords: ["interest", "bank charge", "bank fee", "service charge", "wire fee"] },
  { id: "ca-tax", name: "Business Taxes, Fees, Licenses, Dues", system: "canada", keywords: ["business tax", "license", "permit", "dues", "registration"] },
  { id: "ca-office", name: "Office Expenses", system: "canada", keywords: ["office", "supplies", "stationery"] },
  { id: "ca-prof", name: "Professional Fees", system: "canada", keywords: ["accountant", "lawyer", "consultant", "cpa", "professional", "attorney"] },
  { id: "ca-mgmt", name: "Management and Administration Fees", system: "canada", keywords: ["management fee", "admin fee", "property management"] },
  { id: "ca-rent", name: "Rent", system: "canada", keywords: ["rent", "lease"] },
  { id: "ca-maint", name: "Maintenance and Repairs", system: "canada", keywords: ["maintenance", "repair", "fix", "plumber", "electrician"] },
  { id: "ca-wages", name: "Salaries, Wages, and Benefits", system: "canada", keywords: ["salary", "wages", "payroll", "employee", "benefits"] },
  { id: "ca-travel", name: "Travel", system: "canada", keywords: ["travel", "flight", "hotel", "accommodation"] },
  { id: "ca-tel", name: "Telephone and Utilities", system: "canada", keywords: ["telephone", "phone", "internet", "utilities", "electricity", "gas", "water"] },
  { id: "ca-motor", name: "Motor Vehicle Expenses", system: "canada", keywords: ["vehicle", "car", "auto", "gas", "parking", "mileage"] },
  { id: "ca-cca", name: "Capital Cost Allowance", system: "canada", keywords: ["capital cost allowance", "cca", "depreciation"] },
  { id: "ca-ptax", name: "Property Taxes", system: "canada", keywords: ["property tax", "municipal tax", "realty tax", "county tax"] },
  { id: "ca-mort", name: "Mortgage Interest", system: "canada", keywords: ["mortgage", "mortgage interest"] },
  { id: "ca-condo", name: "Condo/Strata Fees", system: "canada", keywords: ["condo fee", "strata", "hoa", "condo association"] },
  { id: "ca-util", name: "Utilities", system: "canada", keywords: ["utilities", "electricity", "water", "gas"] },
  { id: "ca-other", name: "Other Expenses", system: "canada", keywords: [] },
];

export const ALL_TAX_CATEGORIES: TaxCategory[] = [
  ...US_GENERAL_CATEGORIES,
  ...US_RENTAL_CATEGORIES,
  ...CA_CATEGORIES,
];

export function suggestCategories(text: string): { us: TaxCategory[], ca: TaxCategory[] } {
  if (!text || text.length < 2) return { us: [], ca: [] };
  const lower = text.toLowerCase();
  const usMatches = [...US_GENERAL_CATEGORIES, ...US_RENTAL_CATEGORIES].filter(cat =>
    cat.keywords.some(kw => lower.includes(kw.toLowerCase()))
  );
  const caMatches = CA_CATEGORIES.filter(cat =>
    cat.keywords.some(kw => lower.includes(kw.toLowerCase()))
  );
  return { us: usMatches.slice(0, 3), ca: caMatches.slice(0, 3) };
}
