"use client";

import { useState, useTransition, useMemo } from "react";
import { format } from "date-fns";
import { Plus, Trash2, Calendar as CalendarIcon, Users, PackageOpen, Loader2, Search, ChevronDown, ChevronUp, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EventDialog } from "./event-dialog";
import { deleteEvent } from "./actions";

function calculateEventCosts(event: any) {
  const costs: Record<string, { name: string; total: number }> = {};
  
  // Initialize all participants
  for (const ep of event.participants) {
    costs[ep.participantId] = {
      name: ep.participant.name,
      total: 0
    };
  }

  let totalEventCost = 0;

  for (const itemUsed of event.itemsUsed) {
    const cost = itemUsed.quantityUsed * itemUsed.inventoryItem.unitPrice;
    totalEventCost += cost;

    // Divide equally among ALL participants
    const consumers = event.participants.map((p: any) => p.participantId);

    if (consumers.length > 0) {
      const costPerPerson = cost / consumers.length;
      for (const consumerId of consumers) {
        if (costs[consumerId]) {
          costs[consumerId].total += costPerPerson;
        }
      }
    }
  }

  return { costs, totalEventCost };
}

export function EventsList({ partyId, events, participants, inventory }: any) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const filteredEvents = events.filter((e: any) => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDelete = (id: string) => {
    if (confirm("Tem a certeza que deseja apagar este evento? Os produtos consumidos serão repostos no inventário.")) {
      startTransition(() => {
        deleteEvent(id, partyId);
      });
    }
  };

  const toggleExpanded = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Eventos</h2>
          <p className="text-muted-foreground">Registe refeições e momentos da festa.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar evento..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredEvents.length === 0 && (
          <div className="py-12 text-center border rounded-md border-dashed bg-muted/30">
            <CalendarIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Sem eventos encontrados.</p>
          </div>
        )}

        {filteredEvents.map((event: any) => {
          const { costs, totalEventCost } = calculateEventCosts(event);
          const isExpanded = expandedEvents.has(event.id);
          const costEntries = Object.values(costs).sort((a: any, b: any) => b.total - a.total);

          return (
            <Card key={event.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{event.name}</CardTitle>
                    <CardDescription>
                      {event.date ? format(new Date(event.date), "dd MMM yyyy") : "Sem data"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="font-semibold">
                      {totalEventCost.toFixed(2)} €
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => setEditingEvent(event)}>
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)} disabled={isPending} className="text-destructive">
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
                
                {/* Quick Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{event.participants.length} participantes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <PackageOpen className="h-4 w-4 text-muted-foreground" />
                    <span>{event.itemsUsed.length} produtos</span>
                  </div>
                  {event.participants.length > 0 && totalEventCost > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span>💰</span>
                      <span>{(totalEventCost / event.participants.length).toFixed(2)} €/pessoa</span>
                    </div>
                  )}
                </div>

                {/* Participant badges */}
                <div className="flex flex-wrap gap-1">
                  {event.participants.map((ep: any) => (
                    <Badge 
                      variant="secondary" 
                      key={ep.participantId}
                    >
                      {ep.participant.name}
                      {costs[ep.participantId] && (
                        <span className="ml-1.5 font-semibold">
                          {costs[ep.participantId].total.toFixed(2)} €
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>

                {/* Expand/Collapse for detailed breakdown */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-muted-foreground"
                  onClick={() => toggleExpanded(event.id)}
                >
                  {isExpanded ? (
                    <><ChevronUp className="mr-2 h-4 w-4" /> Esconder detalhes</>
                  ) : (
                    <><ChevronDown className="mr-2 h-4 w-4" /> Ver detalhes por pessoa</>
                  )}
                </Button>

                {isExpanded && (
                  <div className="space-y-4">
                    {/* Per-person cost table */}
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Participante</TableHead>
                            <TableHead className="text-right font-bold">Total a Pagar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {costEntries.map((entry: any) => (
                            <TableRow key={entry.name}>
                              <TableCell className="font-medium">
                                {entry.name}
                              </TableCell>
                              <TableCell className="text-right font-bold">{entry.total.toFixed(2)} €</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Products consumed list */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Produtos consumidos:</h4>
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produto</TableHead>
                              <TableHead>Categoria</TableHead>
                              <TableHead className="text-right">Qtd.</TableHead>
                              <TableHead className="text-right">Preço Unit.</TableHead>
                              <TableHead className="text-right">Custo Total</TableHead>
                              <TableHead className="text-right">Dividido por</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {event.itemsUsed.map((ei: any) => {
                              const cost = ei.quantityUsed * ei.inventoryItem.unitPrice;

                              return (
                                <TableRow key={ei.inventoryItemId}>
                                  <TableCell className="font-medium">
                                    {ei.inventoryItem.name}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{ei.inventoryItem.category?.name || 'Sem categoria'}</TableCell>
                                  <TableCell className="text-right">{ei.quantityUsed} {ei.inventoryItem.unit}</TableCell>
                                  <TableCell className="text-right">{ei.inventoryItem.unitPrice.toFixed(2)} €</TableCell>
                                  <TableCell className="text-right font-semibold">{cost.toFixed(2)} €</TableCell>
                                  <TableCell className="text-right">{event.participants.length} pessoas</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(isDialogOpen || editingEvent) && (
        <EventDialog 
          partyId={partyId}
          participants={participants}
          inventory={inventory}
          open={isDialogOpen || !!editingEvent}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setIsDialogOpen(false);
              setEditingEvent(null);
            }
          }}
          existingEvent={editingEvent}
        />
      )}
    </div>
  );
}
