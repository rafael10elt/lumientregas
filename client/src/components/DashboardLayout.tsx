import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  CarFront,
  LayoutDashboard,
  LogOut,
  Package2,
  PanelLeft,
  Shield,
  MapPinned,
  Truck,
  TrendingUp,
  UserCog,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { BrandMark } from "./BrandMark";

const operationalMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Package2, label: "Entregas", path: "/deliveries" },
  { icon: MapPinned, label: "Bases", path: "/bases" },
  { icon: CarFront, label: "Motoristas", path: "/drivers" },
  { icon: UserCog, label: "Usuários", path: "/users" },
  { icon: Truck, label: "Rotas", path: "/routes" },
  { icon: TrendingUp, label: "Analytics", path: "/analytics" },
];

const saasMenuItems = [
  { icon: Shield, label: "Tenants", path: "/tenants" },
  { icon: UserCog, label: "Usuários", path: "/users" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex w-full max-w-md flex-col items-center gap-8 p-8">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-center text-2xl font-semibold tracking-tight">
              Sign in to continue
            </h1>
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = "/login";
            }}
            size="lg"
            className="w-full shadow-lg transition-all hover:shadow-xl"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, tenant, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const menuItems =
    user?.role === "motorista"
      ? [{ icon: Users, label: "Painel do motorista", path: "/driver" }]
      : user?.role === "superadmin"
        ? saasMenuItems
        : operationalMenuItems;

  const activeMenuItem = menuItems.find(item => item.path === location);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center">
            <div className="flex w-full items-center gap-3 px-2 transition-all">
              <button
                onClick={toggleSidebar}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? <BrandMark size="sm" className="min-w-0" /> : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 font-normal transition-all"
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>{user?.role || "-"}</span>
              </div>
              <p className="mt-1 truncate text-sm font-medium">{user?.name || "-"}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {user?.role === "superadmin" ? "Acesso SaaS" : tenant?.name || "Sem tenant"}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-9 w-9 shrink-0 border">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium leading-none">{user?.name || "-"}</p>
                    <p className="mt-1.5 truncate text-xs text-muted-foreground">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/20 ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile ? (
          <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex flex-col gap-1">
                <span className="tracking-tight text-foreground">{activeMenuItem?.label ?? "Menu"}</span>
              </div>
            </div>
          </div>
        ) : null}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
