
import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { subscribeToAuthChanges } from "@/lib/firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading };
}
