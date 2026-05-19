import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Distribution System",
  description: "Concurrency-safe lead allocation demo with Prisma and PostgreSQL.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <Link className="brand" href="/">
            Lead Distribution
          </Link>
          <nav className="nav-links" aria-label="Primary navigation">
            <Link href="/request-service">Request Service</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/test-tools">Test Tools</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
