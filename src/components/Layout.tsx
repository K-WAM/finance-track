import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Building2, ArrowLeftRight,
  Users, FileText, Settings, Menu, X, ChevronRight, TrendingUp,
  FolderOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import luxorLogo from "@/assets/luxor-logo.png";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Businesses", href: "/businesses", icon: Building2 },
  {
    label: "Transactions", href: "/transactions", icon: ArrowLeftRight,
    children: [{ label: "Add Transaction", href: "/transactions/new" }],
  },
  { label: "Documents", href: "/documents", icon: FolderOpen },
  { label: "Owners", href: "/owners", icon: Users },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

function NavLink({ item, onClose }: { item: NavItem; onClose?: () => void }) {
  const [location] = useLocation();
  const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
  const [open, setOpen] = useState(false);
  const Icon = item.icon;

  return (
    <div>
      <Link href={item.href}>
        <div
          onClick={() => {
            if (item.children) setOpen(!open);
            if (!item.children && onClose) onClose();
          }}
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-medium cursor-pointer transition-all duration-100",
            isActive
              ? "bg-sidebar-accent text-white"
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
          data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
        >
          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1">{item.label}</span>
          {item.children && (
            <ChevronRight className={cn("w-3 h-3 transition-transform", open && "rotate-90")} />
          )}
        </div>
      </Link>
      {item.children && open && (
        <div className="ml-6 mt-0.5 space-y-0.5 border-l border-sidebar-border/50 pl-2.5">
          {item.children.map(child => (
            <Link key={child.href} href={child.href}>
              <div
                onClick={onClose}
                className="py-1 text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground cursor-pointer transition-colors"
              >
                {child.label}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden lg:flex flex-col w-52 bg-sidebar border-r border-sidebar-border flex-shrink-0">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-52 bg-sidebar flex flex-col z-50">
            <div className="flex items-center justify-end p-3">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}
                className="text-sidebar-foreground hover:bg-sidebar-accent h-7 w-7">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-3 py-2 bg-sidebar border-b border-sidebar-border">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}
            className="text-sidebar-foreground hover:bg-sidebar-accent h-7 w-7"
            data-testid="button-mobile-menu">
            <Menu className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1.5">
            <img src={luxorLogo} alt="Luxor" className="w-5 h-5 object-contain rounded" />
            <span className="font-semibold text-sidebar-foreground text-xs">Finance Track</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  return (
    <>
      <div className="px-3 py-2.5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <img src={luxorLogo} alt="Luxor" className="w-8 h-8 object-contain rounded" />
          <div>
            <div className="font-bold text-sidebar-foreground text-xs tracking-tight">Finance Track</div>
            <div className="text-[9px] text-sidebar-foreground/50 uppercase tracking-widest">Luxor Developments</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <NavLink key={item.href} item={item} onClose={onClose} />
        ))}
      </nav>

      <div className="p-2.5 border-t border-sidebar-border">
        <div className="rounded bg-sidebar-accent/40 px-2.5 py-1.5 text-[10px] text-sidebar-foreground/50 leading-relaxed">
          Not a substitute for a CPA or tax advisor.
        </div>
      </div>
    </>
  );
}
