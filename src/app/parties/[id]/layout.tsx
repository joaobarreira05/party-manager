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

  // Ensure logged-in user (including Manager) is a participant in this party so they can play, drink & wager
  if (session) {
    const existingParticipant = await prisma.participant.findFirst({
      where: {
        partyId: party.id,
        userId: session.userId,
      },
    });

    if (!existingParticipant) {
      // Check if participant with matching name exists without userId
      const matchingByName = await prisma.participant.findFirst({
        where: {
          partyId: party.id,
          name: session.username,
          userId: null,
        },
      });

      if (matchingByName) {
        await prisma.participant.update({
          where: { id: matchingByName.id },
          data: { userId: session.userId },
        });
      } else {
        const newP = await prisma.participant.create({
          data: {
            name: session.username,
            partyId: party.id,
            userId: session.userId,
          },
        });

        await prisma.penaltyBalance.create({
          data: { participantId: newP.id, balance: 0 },
        });
      }
    }
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
        <div className="mt-6 flex-1">{children}</div>
      </main>
    </div>
  );
}
