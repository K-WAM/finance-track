import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { businessService } from "@/services/businessService";
import { transactionService } from "@/services/transactionService";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Businesses from "@/pages/Businesses";
import Transactions from "@/pages/Transactions";
import AddTransaction from "@/pages/AddTransaction";
import Owners from "@/pages/Owners";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/Settings";
import Documents from "@/pages/Documents";

// Initialize sample data synchronously before first render
businessService.init();
transactionService.init();

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/businesses" component={Businesses} />
        <Route path="/transactions/new" component={AddTransaction} />
        <Route path="/transactions/:id/edit" component={AddTransaction} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/documents" component={Documents} />
        <Route path="/owners" component={Owners} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
