import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Deliveries from "./pages/Deliveries";
import Drivers from "./pages/Drivers";
import Users from "./pages/Users";
import Clients from "./pages/Clients";
import Routes from "./pages/Routes";
import DriverPortal from "./pages/DriverPortal";
import Analytics from "./pages/Analytics";
import Login from "./pages/Login";
import SaaSAdmin from "./pages/SaasAdmin";
import TenantBlocked from "./pages/TenantBlocked";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

type GuardProps = {
  component: React.ComponentType<any>;
  allowedRoles?: Array<"superadmin" | "admin" | "motorista">;
};

function GuardedRoute({ component: Component, allowedRoles }: GuardProps) {
  const { isAuthenticated, loading, user, blocked } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (blocked) {
    return <TenantBlocked />;
  }

  if (!isAuthenticated || !user) {
    return <Login />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <NotFound />;
  }

  return <Component />;
}

function HomeRedirect() {
  const { isAuthenticated, loading, user, blocked } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading || blocked || !isAuthenticated || !user) return;
    if (user.role === "superadmin") {
      setLocation("/saas");
      return;
    }
    if (user.role === "motorista") {
      setLocation("/driver");
      return;
    }
    setLocation("/deliveries");
  }, [blocked, isAuthenticated, loading, setLocation, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (blocked) {
    return <TenantBlocked />;
  }

  if (!isAuthenticated || !user) {
    return <Login />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/blocked" component={TenantBlocked} />
      <Route path="/404" component={NotFound} />

      <Route path="/" nest>
        {() => (
          <DashboardLayout>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/saas" component={() => <GuardedRoute component={SaaSAdmin} allowedRoles={["superadmin"]} />} />
              <Route path="/deliveries" component={() => <GuardedRoute component={Deliveries} allowedRoles={["superadmin", "admin"]} />} />
              <Route path="/drivers" component={() => <GuardedRoute component={Drivers} allowedRoles={["superadmin", "admin"]} />} />
              <Route path="/users" component={() => <GuardedRoute component={Users} allowedRoles={["superadmin", "admin"]} />} />
              <Route path="/clients" component={() => <GuardedRoute component={Clients} allowedRoles={["superadmin", "admin"]} />} />
              <Route path="/routes" component={() => <GuardedRoute component={Routes} allowedRoles={["superadmin", "admin"]} />} />
              <Route path="/analytics" component={() => <GuardedRoute component={Analytics} allowedRoles={["superadmin", "admin"]} />} />
              <Route path="/driver" component={() => <GuardedRoute component={DriverPortal} allowedRoles={["superadmin", "admin", "motorista"]} />} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
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
