import { Link, useLocation } from "wouter";
import { 
  Tv, 
  LayoutDashboard, 
  Bot, 
  MessageSquare, 
  BarChart3, 
  Settings,
  Youtube,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Channels", href: "/channels", icon: Tv },
  { name: "Automation", href: "/automation", icon: Bot },
  { name: "Comments", href: "/comments", icon: MessageSquare },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { data: authStatus } = useAuth();

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="bg-material-blue p-2 rounded-lg">
            <Youtube className="text-white h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-medium text-sidebar-foreground">YouTube Automation</h1>
            <p className="text-sm text-sidebar-foreground/60">
              {authStatus?.authenticated ? "@adarshtripathi5520" : "Not authenticated"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href}>
              <a
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors",
                  isActive && "bg-blue-50 text-material-blue border-l-4 border-material-blue"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className={cn("font-medium", isActive && "font-medium")}>{item.name}</span>
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Status Indicator */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-2 text-sm">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span className="text-sidebar-foreground/60">System Active</span>
        </div>
        <div className="mt-2 text-xs text-sidebar-foreground/50">
          Last sync: <span>2 minutes ago</span>
        </div>
      </div>
    </div>
  );
}
