"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, UserPlus, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface UserNavProps {
  session: {
    userId: string;
    username: string;
    role: "manager" | "user";
  } | null;
}

export function UserNav({ session }: UserNavProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Sessão terminada");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Erro ao sair");
    }
  };

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="outline" size="sm" className="gap-1.5 font-medium">
            <LogIn className="w-4 h-4" /> Entrar
          </Button>
        </Link>
        <Link href="/register">
          <Button size="sm" className="gap-1.5 font-semibold bg-primary hover:bg-primary/90">
            <UserPlus className="w-4 h-4" /> Criar Conta
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-foreground font-medium">
        {session.role === "manager" ? (
          <Shield className="w-3.5 h-3.5 text-amber-500" />
        ) : (
          <User className="w-3.5 h-3.5 text-blue-500" />
        )}
        <span>{session.username}</span>
        <span className="text-[10px] uppercase font-bold text-muted-foreground">
          ({session.role === "manager" ? "Gestor" : "Utilizador"})
        </span>
      </div>

      <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground gap-1.5">
        <LogOut className="w-4 h-4" /> Sair
      </Button>
    </div>
  );
}
