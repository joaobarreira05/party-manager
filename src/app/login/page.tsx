"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, User, KeyRound, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partyId = searchParams.get("partyId") || undefined;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Preenche o nome de utilizador e a palavra-passe");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, partyId }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao entrar");
        setLoading(false);
        return;
      }

      toast.success(`Bem-vindo, ${data.user.username}!`);
      if (partyId) {
        router.push(`/parties/${partyId}`);
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err: any) {
      toast.error("Erro de ligação");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-muted/50 to-primary/5 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full text-primary mb-2 ring-8 ring-primary/5">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Party Manager</h1>
          <p className="text-muted-foreground text-sm">Entra na tua conta para aceder às festas e aos jogos</p>
        </div>

        <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader>
            <CardTitle className="text-xl">Iniciar Sessão</CardTitle>
            <CardDescription>
              Introduz os teus dados de acesso de Gestor ou Utilizador
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
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
                <Label htmlFor="password">Palavra-passe</Label>
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
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full h-11 text-base font-semibold gap-2" disabled={loading}>
                {loading ? "A entrar..." : "Entrar"}
                <ArrowRight className="w-4 h-4" />
              </Button>

              <div className="text-center text-sm text-muted-foreground pt-2">
                Ainda não tens conta?{" "}
                <Link
                  href={partyId ? `/register?partyId=${partyId}` : "/register"}
                  className="text-primary font-semibold hover:underline"
                >
                  Regista-te aqui
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
