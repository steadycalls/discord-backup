import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Meetings from "./pages/Meetings";
import DiscordClientMatch from "./pages/DiscordClientMatch";
import Analytics from "./pages/Analytics";
import Messages from "./pages/Messages";
import Webhooks from "./pages/Webhooks";
import WebhookLogs from "./pages/WebhookLogs";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import ClientDatabase from "./pages/ClientDatabase";
import ChannelSettings from "./pages/ChannelSettings";
import Alerts from "./pages/Alerts";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/meetings"} component={Meetings} />
      <Route path={"/messages"} component={Messages} />
      <Route path={"/webhooks"} component={Webhooks} />
      <Route path={"/webhook-logs"} component={WebhookLogs} />
      <Route path={"/chat"} component={Chat} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/client-database"} component={ClientDatabase} />
      <Route path={"/discord-client-match"} component={DiscordClientMatch} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/channel-settings"} component={ChannelSettings} />
      <Route path={"/alerts"} component={Alerts} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
