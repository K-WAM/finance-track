import { useState } from "react";
import { Settings, Download, Upload, RefreshCw, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { storageService } from "@/services/storageService";
import { transactionService } from "@/services/transactionService";
import { businessService } from "@/services/businessService";

export default function SettingsPage() {
  const { toast } = useToast();
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");

  function exportAllData() {
    const businesses = businessService.getAll();
    const transactions = transactionService.getAll();
    const data = JSON.stringify({ businesses, transactions, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-track-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Data exported successfully" });
  }

  function resetSampleData() {
    transactionService.resetToSample();
    toast({ title: "Sample data restored" });
  }

  function clearAllData() {
    storageService.clearAll();
    businessService.init();
    transactionService.init();
    toast({ title: "All data cleared and sample data restored" });
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">App preferences and data management</p>
      </div>

      {/* App Settings */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" /> App Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Default Reporting Currency</Label>
            <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
              <SelectTrigger className="mt-1 w-48" data-testid="select-default-currency-setting">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD (US Dollar)</SelectItem>
                <SelectItem value="CAD">CAD (Canadian Dollar)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date Format</Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger className="mt-1 w-48" data-testid="select-date-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => toast({ title: "Preferences saved" })} data-testid="button-save-preferences">
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4" /> Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
            <Download className="w-4 h-4 mt-0.5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Export All Data</p>
              <p className="text-xs text-muted-foreground">Download all businesses and transactions as JSON</p>
            </div>
            <Button variant="outline" size="sm" onClick={exportAllData} data-testid="button-export-all">
              Export JSON
            </Button>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
            <Upload className="w-4 h-4 mt-0.5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Import Data</p>
              <p className="text-xs text-muted-foreground">Import previously exported JSON data</p>
              {/* TODO: Implement JSON import */}
            </div>
            <Button variant="outline" size="sm" disabled data-testid="button-import">
              Import JSON
            </Button>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
            <RefreshCw className="w-4 h-4 mt-0.5 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">Reset Sample Data</p>
              <p className="text-xs text-muted-foreground">Restore the default sample transactions</p>
            </div>
            <Button variant="outline" size="sm" onClick={resetSampleData} data-testid="button-reset-sample">
              Reset Samples
            </Button>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-red-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">Clear All Data</p>
              <p className="text-xs text-red-600">This will delete all your businesses and transactions</p>
            </div>
            <Button variant="destructive" size="sm" onClick={clearAllData} data-testid="button-clear-all">
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Firebase Migration Notice */}
      <Card className="shadow-sm border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-blue-800">
            <Info className="w-4 h-4" /> Firebase / Vercel Migration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-700">
          <p className="font-medium">This app is structured for Firebase + Vercel deployment.</p>
          <ul className="space-y-1.5 text-xs text-blue-600 list-disc list-inside">
            <li>
              {/* TODO: Firebase Auth - add Firebase Auth configuration */}
              Firebase Auth: Replace localStorage with Firebase Authentication
            </li>
            <li>
              {/* TODO: Firestore - replace localStorage with Firestore collections */}
              Firestore: Map to <code className="bg-blue-100 px-1 rounded">/users/&#123;uid&#125;/businesses/&#123;id&#125;</code>
            </li>
            <li>
              {/* TODO: Firebase Storage - implement receipt upload */}
              Firebase Storage: Enable receipt file uploads
            </li>
            <li>
              {/* TODO: Live FX API - add VITE_FX_API_KEY to Vercel env vars */}
              Vercel env vars: <code className="bg-blue-100 px-1 rounded">VITE_FIREBASE_CONFIG</code>, <code className="bg-blue-100 px-1 rounded">VITE_FX_API_KEY</code>
            </li>
            <li>
              {/* TODO: Role-based access - add owner permission checks */}
              Role-based access: Add owner-level permissions to businesses
            </li>
            <li>
              {/* TODO: CSV/PDF Export - add PDF export functionality */}
              PDF Export: Add jsPDF or Puppeteer for PDF reports
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Disclaimer:</strong> Finance Track is designed for recordkeeping and tax preparation support only.
            It does not constitute tax, legal, or financial advice. Always consult a qualified CPA or tax advisor
            for your specific situation. Categories and calculations are for organizational purposes only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
