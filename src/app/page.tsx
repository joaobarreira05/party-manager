import Link from "next/link";
import { Plus, LayoutDashboard } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { DashboardClient } from "./dashboard-client";
import { UserNav } from "@/components/user-nav";

export default async function Home() {
  const session = await getSession();
  const isManager = session?.role === "manager";

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
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <span className="font-extrabold text-base tracking-tight">Party Manager</span>
          </div>

          <div className="flex items-center gap-3">
            <UserNav session={session} />
            <ModeToggle />
            {isManager && (
              <Link href="/parties/new">
                <Button size="sm" className="font-semibold bg-amber-600 hover:bg-amber-700 text-white">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nova Festa
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        <DashboardClient parties={parties} isManager={isManager} />
      </main>
    </div>
  );
}
