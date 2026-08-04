import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ModeToggle } from "@/components/mode-toggle";
import { UserNav } from "@/components/user-nav";
import { PartyNav } from "./party-nav";

export default async function PartyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const session = await getSession();
  
  const party = await prisma.party.findUnique({
    where: { id: resolvedParams.id, deletedAt: null },
  });

  if (!party) {
    notFound();
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-muted/20">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="h-4 w-px bg-border" />
            <h1 className="font-semibold">{party.name}</h1>
          </div>

          <div className="flex items-center gap-3">
            <UserNav session={session} />
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1 flex flex-col">
        <PartyNav partyId={party.id} />
        <div className="mt-6 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
