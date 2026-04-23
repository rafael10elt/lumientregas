import { useAuth } from "./_core/hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Deliveries from "./pages/Deliveries";
import Drivers from "./pages/Drivers";
import Users from "./pages/Users";
import Routes from "./pages/Routes";
import Analytics from "./pages/Analytics";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import DriverPortal from "./pages/DriverPortal";
import Tenants from "./pages/Tenants";
import NotFound from "@/pages/NotFound";
import { Loader2, ShieldAlert } from "lucide-react";
import { Route, Switch } from "wouter";
import { useEffect } from "react";
import { useLocation } from "wouter";

function TenantBlockedScreen({
  tenantName,
  reason,
  onLogout,
}: {
  tenantName?: string | null;
  reason?: string | null;
  onLogout: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-background to-slate-50 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle>Acesso temporariamente bloqueado</CardTitle>
          <CardDescription>
            {tenantName
              ? `O tenant ${tenantName} está sem acesso no momento.`
              : "Seu tenant está sem acesso no momento."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {reason || "Entre em contato com o administrador do sistema para regularizar o pagamento ou o status do tenant."}
          </p>
          <Button onClick={onLogout} className="w-full">
            Sair da conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Router() {
  const { isAuthenticated, loading, user, accessBlocked, accessBlockedReason, tenant, logout } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!user) return;
    if (user.role !== "motorista") return;
    if (location === "/driver") return;
    if (location === "/login" || location === "/trocar-senha") return;
    setLocation("/driver");
  }, [location, setLocation, user]);

  if (location === "/trocar-senha") {
    return <ResetPassword />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (accessBlocked && user?.role !== "superadmin") {
    return (
      <TenantBlockedScreen
        tenantName={tenant?.name}
        reason={accessBlockedReason}
        onLogout={logout}
      />
    );
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/deliveries" component={Deliveries} />
        <Route path="/drivers" component={Drivers} />
        <Route path="/users" component={Users} />
        <Route path="/routes" component={Routes} />
        <Route path="/driver" component={DriverPortal} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/tenants" component={Tenants} />
        <Route path="/login" component={Login} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
