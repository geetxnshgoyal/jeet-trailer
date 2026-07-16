"use client";

import { useState } from "react";
import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth/auth-context";
import { initials } from "@/lib/utils";

/** Top-right account menu: shows identity and role, offers sign-out. */
export function UserMenu() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-3 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary text-xs text-primary-foreground">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-medium">{user.name}</span>
          <span className="block text-xs capitalize text-muted-foreground">
            {user.role}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block font-medium">{user.name}</span>
          <span className="block text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <User className="size-4" />
          <span className="capitalize">{user.role} account</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="size-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
