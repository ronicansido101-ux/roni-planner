import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { Route, Switch } from "wouter";

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Switch><Route path="/login" component={Login} /><Route path="/" component={Home} /><Route component={Home} /></Switch></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
