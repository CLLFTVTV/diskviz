import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import "./app.css";
import { ScanProvider } from "./context/scan-context";
import { Link } from "react-router";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>DiskViz</title>
        <Meta />
        <Links />
      </head>
      <body className="bg-zinc-950 text-zinc-50 font-sans antialiased min-h-screen flex flex-col">
        <header className="border-b border-border/40 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-xl">💾</span>
              <span className="font-semibold text-lg">DiskViz</span>
            </Link>
            <nav className="flex items-center space-x-4">
              <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">Dashboard</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-6">
          {children}
        </main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ScanProvider>
      <Outlet />
    </ScanProvider>
  );
}
