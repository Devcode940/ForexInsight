'use client';

import { Button } from "@/components/ui/button";
import { User as UserIcon } from "lucide-react";

export function UserNav() {
  return (
    <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0" disabled>
      <UserIcon className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}
