"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Peumayen
          </p>
          <h1 className="truncate text-base font-semibold">{household.name}</h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-9 w-9">
              <AvatarFallback className={cn("text-xs font-semibold", colorForName(me.display_name))}>
                {initialsFor(me.display_name)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{me.display_name}</span>
                <span className="text-muted-foreground text-xs">
                  {me.role === "admin" ? "Administrador" : "Miembro"}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/me" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Ajustes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSignOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
