"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, User, KeyRound, Sparkles, ArrowRight, ShieldCheck, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPartyId = searchParams.get("partyId") || "";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [partyId, setPartyId] = useState(initialPartyId);
  const [partyPassword, setPartyPassword] = useState("");
  const [isManager, setIsManager] = useState(false);
  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/parties-list")
      .then((res) => res.json())
      .then((data) => {
        if (data.parties) setParties(data.parties);
      })
      .catch(() => {});
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Preenche o nome de utilizador e a palavra-passe");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As palavras-passe não coincidem");
      return;
    }

    if (!isManager && !partyId) {
      toast.error("Seleciona a festa onde queres entrar");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          partyId: isManager ? undefined : partyId,
          partyPassword: isManager ? undefined : partyPassword,
          isManager,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao criar conta");
        setLoading(false);
        return;
      }

      toast.success("Conta criada com sucesso!");
      if (partyId && !isManager) {
        router.push(`/parties/${partyId}`);
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err) {
      toast.error("Erro de ligação");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-muted/50 to-primary/5 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full text-primary mb-2 ring-8 ring-primary/5">
            <PartyPopper className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Criar Conta</h1>
          <p className="text-muted-foreground text-sm">Regista-te para entrar nas festas e participar nos jogos</p>
        </div>

        <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader>
            <div className="flex rounded-lg bg-muted p-1 text-muted-foreground text-sm font-medium mb-2">
              <button
                type="button"
                className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
                  !isManager ? "bg-background text-foreground shadow-sm font-semibold" : "hover:text-foreground"
                }`}
                onClick={() => setIsManager(false)}
              >
                Utilizador
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
                  isManager ? "bg-background text-foreground shadow-sm font-semibold" : "hover:text-foreground"
                }`}
                onClick={() => setIsManager(true)}
              >
                Gestor (Conta Única)
              </button>
            </div>
            <CardTitle className="text-xl">
              {isManager ? "Registo de Gestor" : "Registo de Utilizador"}
            </CardTitle>
            <CardDescription>
              {isManager
                ? "A conta de Gestor tem acesso total e gestão de todas as festas"
                : "Insere os teus dados e a palavra-passe da festa onde queres entrar"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Utilizador</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="O teu nome de utilizador"
                    className="pl-9"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Palavra-passe pessoal</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Palavra-passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {!isManager && (
                <>
                  <div className="space-y-2">
                    <Label>Festa para Aceder</Label>
                    <Select value={partyId} onValueChange={(val) => setPartyId(val || "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleciona uma festa..." />
                      </SelectTrigger>
                      <SelectContent>
                        {parties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="partyPassword">Palavra-passe da Festa</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="partyPassword"
                        type="password"
                        placeholder="Password dada pelo gestor"
                        className="pl-9"
                        value={partyPassword}
                        onChange={(e) => setPartyPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full h-11 text-base font-semibold gap-2" disabled={loading}>
                {loading ? "A criar conta..." : "Criar Conta"}
                <ArrowRight className="w-4 h-4" />
              </Button>

              <div className="text-center text-sm text-muted-foreground pt-2">
                Já tens conta?{" "}
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Inicia sessão
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
