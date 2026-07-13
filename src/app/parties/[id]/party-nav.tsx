"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, PackageOpen, Calendar, Wallet, FileText, ReceiptText } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const navItems = [
  { href: "", label: "Resumo", icon: LayoutDashboard },
  { href: "/participants", label: "Participantes", icon: Users },
  { href: "/inventory", label: "Inventário", icon: PackageOpen },
  { href: "/events", label: "Eventos", icon: Calendar },
  { href: "/expenses", label: "Despesas", icon: Wallet },
  { href: "/receipts", label: "Faturas", icon: ReceiptText },
  { href: "/reports", label: "Relatórios", icon: FileText },
];

export function PartyNav({ partyId }: { partyId: string }) {
  const pathname = usePathname();

  return (
    <div className="w-full">
      <ScrollArea className="max-w-[600px] lg:max-w-none border-b">
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const fullHref = `/parties/${partyId}${item.href}`;
            const isActive = pathname === fullHref || (item.href !== "" && pathname.startsWith(fullHref));
            
            return (
              <Link
                key={item.href}
                href={fullHref}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors hover:text-foreground/80 -mb-px",
                  isActive
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground border-b-2 border-transparent"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
