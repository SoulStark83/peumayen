"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHousehold, useCurrentMember } from "@/components/providers/household-provider";
import { colorForName, initialsFor } from "@/lib/colors";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function TopHeader() {
  const router = useRouter();
  const household = useHousehold();
  const me = useCurrentMember();

  async function onSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-40 bg-background/90 supports-[backdrop-filter]:bg-background/75 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
        {/* Nombre del hogar — minimalista */}
        <div className="flex items-center gap-2">
          <span className="text-lg">🏡</span>
          <span className="text-sm font-bold text-foreground/70">
            {household.name}
          </span>
        </div>

        {/* Avatar con menú */}
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-9 w-9 ring-2 ring-primary/20 transition-all hover:ring-primary/50">
              {me.avatar_url && (
                <AvatarImage src={me.avatar_url} alt={me.display_name} />
              )}
              <AvatarFallback
                className={cn("text-sm font-bold", colorForName(me.display_name))}
              >
                {initialsFor(me.display_name)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52 rounded-2xl shadow-lg">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5 py-0.5">
                <span className="text-sm font-bold">{me.display_name}</span>
                <span className="text-muted-foreground text-xs">
                  {me.role === "admin" ? "✦ Admin" : "Miembro"}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/me" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Mi perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onSignOut}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Salir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
