import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MembersAdminCard } from "@/components/profile/members-admin-card";
import { PasswordChangeCard } from "@/components/profile/password-change-card";
import { requireHouseholdContext } from "@/lib/auth";
import { colorForName, initialsFor } from "@/lib/colors";
import { cn } from "@/lib/utils";

const MEMBER_TYPE_LABEL = {
  adult: "Adulto",
  teen: "Adolescente",
  child: "Peque",
} as const;

export const metadata = {
  title: "Tu perfil",
};

export default async function MePage() {
  const { currentMember, members, household } = await requireHouseholdContext();
  const isAdmin = currentMember.role === "admin";

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4 pb-6">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight">Tu perfil</h2>
        <p className="text-muted-foreground text-sm">
          Hogar · {household.name}
        </p>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <Avatar className="h-14 w-14">
            {currentMember.avatar_url && (
              <AvatarImage
                src={currentMember.avatar_url}
                alt={currentMember.display_name}
              />
            )}
            <AvatarFallback
              className={cn(
                "text-base font-semibold",
                colorForName(currentMember.display_name),
              )}
            >
              {initialsFor(currentMember.display_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg">
              {currentMember.display_name}
            </CardTitle>
            <CardDescription className="flex flex-wrap gap-1">
              <Badge variant="secondary">
                {currentMember.role === "admin" ? "Administrador" : "Miembro"}
              </Badge>
              <Badge variant="outline">
                {MEMBER_TYPE_LABEL[currentMember.member_type]}
              </Badge>
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <PasswordChangeCard />

      {isAdmin ? (
        <MembersAdminCard householdId={household.id} members={members} />
      ) : (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Miembros del hogar</h3>
          <div className="space-y-2">
            {members.map((m) => (
              <Card key={m.id} className="flex flex-row items-center gap-3 p-3">
                <Avatar className="h-9 w-9">
                  {m.avatar_url && (
                    <AvatarImage src={m.avatar_url} alt={m.display_name} />
                  )}
                  <AvatarFallback
                    className={cn("text-xs font-semibold", colorForName(m.display_name))}
                  >
                    {initialsFor(m.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.display_name}</p>
                  <p className="text-muted-foreground text-xs">
                    {MEMBER_TYPE_LABEL[m.member_type]}
                    {m.role === "admin" && " · admin"}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
