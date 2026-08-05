"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, PackageOpen, Calendar, Wallet, FileText, ReceiptText, Gamepad2, Beer } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const navItems = [
  { href: "", label: "Resumo", icon: LayoutDashboard },
  { href: "/games", label: "Jogos & Apostas", icon: Gamepad2 },
  { href: "/penalties", label: "Penáltis", icon: Beer },
  { href: "/inventory", label: "Inventário", icon: PackageOpen },
  { href: "/events", label: "Eventos", icon: Calendar },
  { href: "/participants", label: "Participantes", icon: Users },
  { href: "/reports", label: "Relatórios", icon: FileText },
];

export function PartyNav({ partyId }: { partyId: string }) {
  const pathname = usePathname();

  return (
    <div className="w-full">
      <ScrollArea className="w-full border-b">
        <div className="flex items-center gap-1 min-w-max pb-1">
          {navItems.map((item) => {
            const fullHref = `/parties/${partyId}${item.href}`;
            const isActive = pathname === fullHref || (item.href !== "" && pathname.startsWith(fullHref));
            
            return (
              <Link
                key={item.href}
                href={fullHref}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition-colors hover:text-foreground/80 -mb-px rounded-t-lg",
                  isActive
                    ? "border-b-2 border-primary text-primary bg-primary/5 font-semibold"
                    : "text-muted-foreground border-b-2 border-transparent hover:bg-muted/50"
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
