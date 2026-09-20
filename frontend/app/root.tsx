import { useState } from "react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AlertTriangle, Home } from "lucide-react";

import type { Route } from "./+types/root";
import "./app.css";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider, THEME_STORAGE_KEY } from "./components/provider/theme";
import ToastProvider from "./components/provider/toast";
import { Button } from "./components/ui/button";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.ico" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* Applies the saved theme before first paint to avoid a flash. Must
            use the same storage key / default as ThemeProvider. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || "system";
                  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  var root = document.documentElement;
                  root.classList.remove("light", "dark");
                  root.classList.add(theme === "dark" || (theme === "system" && prefersDark) ? "dark" : "light");
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey={THEME_STORAGE_KEY}>
          <TooltipProvider>{children}</TooltipProvider>
          <ToastProvider />
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  // Create the client once per app instance – creating it during render
  // would throw away the whole cache on every re-render / navigation.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Something went wrong";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Page not found" : `Error ${error.status}`;
    details =
      error.status === 404
        ? "The page you are looking for does not exist or has moved."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="min-h-svh flex items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight">{message}</h1>
          <p className="text-muted-foreground">{details}</p>
        </div>
        <Button asChild>
          <Link to="/dashboard">
            <Home className="h-4 w-4" /> Back to MedFlow
          </Link>
        </Button>
        {stack && (
          <pre className="w-full p-4 overflow-x-auto text-left text-xs rounded-lg border bg-card">
            <code>{stack}</code>
          </pre>
        )}
      </div>
    </main>
  );
}
