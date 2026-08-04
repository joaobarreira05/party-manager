"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createParty } from "../actions";

export default function NewPartyPage() {
  const [state, formAction, isPending] = useActionState(createParty, null);

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova Festa</CardTitle>
          <CardDescription>Cria uma nova festa para gerir despesas, inventário e jogos.</CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            {state?.error && (
              <div className="p-3 text-sm bg-destructive/15 text-destructive rounded-md">
                {state.error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Festa</Label>
              <Input id="name" name="name" placeholder="Ex: Férias no Algarve" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessPassword">Palavra-passe de Acesso para Utilizadores (Opcional)</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="accessPassword"
                  name="accessPassword"
                  type="password"
                  placeholder="Password para a malta poder entrar"
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data de Início</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data de Fim</Label>
                <Input id="endDate" name="endDate" type="date" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Link href="/">
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Festa
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
