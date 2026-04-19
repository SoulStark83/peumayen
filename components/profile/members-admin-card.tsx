"use client";

import { Pencil, Plus, Trash2, Check, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { colorForName, initialsFor } from "@/lib/colors";
import { createClient } from "@/lib/supabase/client";
import type { Member } from "@/lib/types";
import { cn } from "@/lib/utils";

type MemberType = Member["member_type"];

const MEMBER_TYPE_LABEL: Record<MemberType, string> = {
  adult: "Adulto",
  teen: "Adolescente",
  child: "Peque",
};

export function MembersAdminCard({
  householdId,
  members,
}: {
  householdId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">Miembros del hogar</CardTitle>
          <CardDescription>Solo administradores pueden modificar.</CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setAddOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Añadir
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {members.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            isEditing={editingId === m.id}
            onEdit={() => setEditingId(m.id)}
            onClose={() => setEditingId(null)}
            onChanged={() => router.refresh()}
          />
        ))}
      </CardContent>

      <AddMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        householdId={householdId}
        onAdded={() => router.refresh()}
      />
    </Card>
  );
}

function MemberRow({
  member,
  isEditing,
  onEdit,
  onClose,
  onChanged,
}: {
  member: Member;
  isEditing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState(member.display_name);
  const [memberType, setMemberType] = useState<MemberType>(member.member_type);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving || !name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("household_members")
      .update({ display_name: name.trim(), member_type: memberType })
      .eq("id", member.id);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    toast.success("Miembro actualizado");
    onClose();
    onChanged();
  }

  async function remove() {
    if (saving) return;
    if (member.user_id) {
      toast.error("No se puede borrar", {
        description: "Este miembro tiene cuenta. Pídele que se dé de baja.",
      });
      return;
    }
    if (!confirm(`¿Borrar a ${member.display_name}?`)) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("household_members")
      .delete()
      .eq("id", member.id);
    setSaving(false);
    if (error) {
      toast.error("No se pudo borrar", { description: error.message });
      return;
    }
    toast.success("Miembro borrado");
    onChanged();
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {member.avatar_url && (
              <AvatarImage src={member.avatar_url} alt={member.display_name} />
            )}
            <AvatarFallback className={cn("text-xs", colorForName(member.display_name))}>
              {initialsFor(member.display_name)}
            </AvatarFallback>
          </Avatar>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
            autoFocus
          />
        </div>
        <Select value={memberType} onValueChange={(v) => setMemberType(v as MemberType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="adult">Adulto</SelectItem>
            <SelectItem value="teen">Adolescente</SelectItem>
            <SelectItem value="child">Peque</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={saving || !name.trim()}>
            <Check className="mr-1 h-3.5 w-3.5" />
            Guardar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Avatar className="h-9 w-9">
        {member.avatar_url && (
          <AvatarImage src={member.avatar_url} alt={member.display_name} />
        )}
        <AvatarFallback className={cn("text-xs", colorForName(member.display_name))}>
          {initialsFor(member.display_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{member.display_name}</p>
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="outline" className="text-xs">
            {MEMBER_TYPE_LABEL[member.member_type]}
          </Badge>
          {member.role === "admin" && (
            <Badge variant="secondary" className="text-xs">
              Admin
            </Badge>
          )}
          {!member.user_id && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Sin cuenta
            </Badge>
          )}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onEdit}
        className="h-8 w-8"
        aria-label="Editar"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={remove}
        className="text-muted-foreground hover:text-destructive h-8 w-8"
        aria-label="Borrar"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AddMemberDialog({
  open,
  onOpenChange,
  householdId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [memberType, setMemberType] = useState<MemberType>("child");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("household_members").insert({
      household_id: householdId,
      display_name: name.trim(),
      member_type: memberType,
      role: "member",
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo añadir", { description: error.message });
      return;
    }
    toast.success("Miembro añadido");
    setName("");
    setMemberType("child");
    onOpenChange(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir miembro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="member-name">Nombre</Label>
            <Input
              id="member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Roma, Lucía…"
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <Select value={memberType} onValueChange={(v) => setMemberType(v as MemberType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adult">Adulto</SelectItem>
                <SelectItem value="teen">Adolescente</SelectItem>
                <SelectItem value="child">Peque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-muted-foreground text-xs">
            Se añade sin cuenta de acceso. Los adultos con cuenta deben registrarse aparte.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Añadiendo…" : "Añadir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
