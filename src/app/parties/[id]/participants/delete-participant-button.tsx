"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeParticipant } from "./actions";
import { useActiveParticipant } from "@/lib/use-active-participant";

export function DeleteParticipantButton({ participantId, partyId }: { participantId: string, partyId: string }) {
  const { currentParticipant } = useActiveParticipant(partyId);
  const isManager = currentParticipant?.role === "manager";
  const [isPending, startTransition] = useTransition();

  if (!isManager) return null;

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="text-destructive hover:bg-destructive/10"
      onClick={() => {
        if (confirm("Tem a certeza que deseja apagar este participante? Ações relacionadas (eventos/despesas) podem ser afetadas.")) {
          startTransition(() => {
            removeParticipant(participantId, partyId);
          });
        }
      }}
      disabled={isPending}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
