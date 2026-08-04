"use client";

import { useState } from "react";
import { ShieldAlert, UserX, Trash2, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export function ManageUsersDialog() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch {
      toast.error("Erro ao carregar lista de utilizadores");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) loadUsers();
  };

  const handleKickUser = async (userId: string, username: string) => {
    if (!confirm(`Tens a certeza que queres expulsar a conta "${username}" da aplicação?`)) {
      return;
    }

    setKickingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao expulsar conta");
        return;
      }

      toast.success(`Conta "${username}" expulsa com sucesso! 🚫`);
      loadUsers();
    } catch {
      toast.error("Erro de ligação");
    } finally {
      setKickingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 border-red-500/40 text-red-600 hover:bg-red-500/10 font-semibold">
            <UserX className="w-4 h-4" /> Expulsar Contas
          </Button>
        }
      />
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 text-red-600">
            <ShieldAlert className="w-5 h-5" /> Gestão de Contas (Painel do Gestor)
          </DialogTitle>
          <DialogDescription>
            Aqui podes ver todas as contas registadas e expulsar utilizadores indesejados da aplicação.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> A carregar utilizadores...
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Festas</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Nenhum utilizador encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => {
                    const isManager = u.role === "manager";
                    const partyNames = u.participants?.map((p: any) => p.party?.name).filter(Boolean) || [];

                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-bold flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {u.username}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                              isManager ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"
                            }`}
                          >
                            {isManager ? "Gestor" : "Utilizador"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {partyNames.length > 0 ? partyNames.join(", ") : "Nenhuma"}
                        </TableCell>
                        <TableCell className="text-right">
                          {isManager ? (
                            <span className="text-xs text-muted-foreground italic">Principal</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={kickingId === u.id}
                              onClick={() => handleKickUser(u.id, u.username)}
                              className="h-8 gap-1.5 text-xs font-bold"
                            >
                              {kickingId === u.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              Expulsar 🚫
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
