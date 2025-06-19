import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import Channels from "@/pages/Channels";
import Settings from "@/pages/Settings";
import Automation from "@/pages/Automation";
import Comments from "@/pages/Comments";
import Analytics from "@/pages/Analytics";
import ProcessChannel from "@/pages/ProcessChannel";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/Sidebar";

function Router() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/channels" component={Channels} />
          <Route path="/automation" component={Automation} />
          <Route path="/comments" component={Comments} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
          <Route path="/process/:id" component={ProcessChannel} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
