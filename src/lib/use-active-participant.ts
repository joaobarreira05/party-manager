"use client";

import { useState, useEffect } from "react";

export interface ActiveParticipant {
  userId: string;
  username: string;
  role: "manager" | "user";
  participantId: string;
  name: string;
}

export function useActiveParticipant(partyId: string) {
  const [currentParticipant, setCurrentParticipant] = useState<ActiveParticipant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (data.user) {
          // Find matching participant in this party
          const p = data.user.participants?.find((part: any) => part.partyId === partyId);
          setCurrentParticipant({
            userId: data.user.id,
            username: data.user.username,
            role: data.user.role,
            participantId: p?.id || "",
            name: p?.name || data.user.username,
          });
        }
      } catch (e) {
        console.error("Error loading active participant:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [partyId]);

  return { currentParticipant, loading };
}
