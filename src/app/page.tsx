import Link from "next/link";
import { format } from "date-fns";
import { Plus, Users, Wallet, PackageOpen, LayoutDashboard } from "lucide-react";
import prisma from "@/lib/prisma";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { DashboardClient } from "./dashboard-client";

export default async function Home() {
  const parties = await prisma.party.findMany({
    where: { deletedAt: null },
    include: {
      participants: true,
      expenses: true,
      inventory: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <LayoutDashboard className="h-5 w-5" />
            <span>Party Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
            <Link href="/parties/new">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Festa
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        <DashboardClient parties={parties} />
      </main>
    </div>
  );
}
