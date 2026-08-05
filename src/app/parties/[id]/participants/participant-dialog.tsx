"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addParticipant } from "./actions";
import { useActiveParticipant } from "@/lib/use-active-participant";

export function ParticipantDialog({ partyId }: { partyId: string }) {
  const { currentParticipant } = useActiveParticipant(partyId);
  const isManager = currentParticipant?.role === "manager";

  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(addParticipant, null);

  useEffect(() => {
    if (state?.success) {
      toast.success("Participante adicionado com sucesso!");
      setOpen(false);
    }
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  if (!isManager) {
    return (
      <div className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg flex items-center gap-1.5 border">
        <Lock className="w-3.5 h-3.5" /> Apenas o Gestor pode adicionar participantes
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-2 h-4 w-4" />
        Novo Participante
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Participante</DialogTitle>
          <DialogDescription>
            Adicione uma nova pessoa à festa para poder dividir as contas.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="partyId" value={partyId} />
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required placeholder="Ex: João Silva" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Input id="notes" name="notes" placeholder="Ex: Não come carne" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
