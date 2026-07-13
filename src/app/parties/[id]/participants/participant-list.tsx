"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteParticipantButton } from "./delete-participant-button";

export function ParticipantList({ partyId, participants, balances }: any) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredParticipants = participants.filter((p: any) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar participante..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="text-right">Já Pagou</TableHead>
                <TableHead className="text-right">Total a Pagar</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Sem participantes encontrados.
                  </TableCell>
                </TableRow>
              )}
              {filteredParticipants.map((p: any) => {
                const b = balances[p.id];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.notes || "-"}</TableCell>
                    <TableCell className="text-right">{b.paid.toFixed(2)} €</TableCell>
                    <TableCell className="text-right">{b.owes.toFixed(2)} €</TableCell>
                    <TableCell className="text-right font-semibold">
                      {b.balance === 0 ? (
                        <span className="text-muted-foreground">0.00 €</span>
                      ) : b.balance > 0 ? (
                        <span className="text-emerald-500">+{b.balance.toFixed(2)} € (Recebe)</span>
                      ) : (
                        <span className="text-destructive">{b.balance.toFixed(2)} € (Deve)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DeleteParticipantButton participantId={p.id} partyId={partyId} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
