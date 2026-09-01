import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata = {
  title: "Executive Dashboard | CONTECH",
  description: "Unified CRM, sales, projects, service and finance dashboard.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
