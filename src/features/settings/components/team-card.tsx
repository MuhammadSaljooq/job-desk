"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Loader2, MoreVertical, Pencil, Plus, Shuffle, UserMinus } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { FormField } from "@/components/shared/form-field"
import { InitialsAvatar } from "@/components/shared/initials-avatar"
import { StatusPill } from "@/components/shared/status-pill"
import { PASSWORD_MIN } from "@/features/auth/credentials-schema"
import { AVATAR_COLORS } from "../schema"
import {
  addMemberAction,
  removeMemberAction,
  resetMemberPasswordAction,
  updateMemberAction,
} from "../actions"
import type { SettingsView } from "../queries"
import { SettingsCard } from "./field-row"

type Member = SettingsView["team"][number]

/** Readable temporary password, e.g. "maple-river-48". The owner passes it on in person. */
function tempPassword() {
  const words = ["maple", "river", "cedar", "stone", "amber", "harbor", "willow", "summit"]
  const pick = () => words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length]
  const n = 10 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90)
  return `${pick()}-${pick()}-${n}`
}

/** Team (D1, D3, D14): members, role pill, title; the owner adds, edits and removes. */
export function TeamCard({
  team,
  currentUserId,
  readOnly,
}: {
  team: Member[]
  currentUserId: string
  readOnly: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<Member | "new" | null>(null)
  const [resetting, setResetting] = useState<Member | null>(null)
  const [removing, setRemoving] = useState<Member | null>(null)

  return (
    <SettingsCard
      id="team-title"
      title="Team"
      action={
        !readOnly && (
          <Button variant="muted" onClick={() => setEditing("new")}>
            <Plus /> Add member
          </Button>
        )
      }
    >
      <ul className="grid gap-1">
        {team.map((m) => (
          <li key={m.id} className="flex items-center gap-3 rounded-[16px] px-1 py-2">
            <InitialsAvatar
              name={m.role === "OWNER" && m.id === currentUserId ? "Me" : m.name}
              color={m.avatarColor}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold">{m.name}</p>
              <p className="truncate text-[12px] text-text-muted">
                {m.title ?? (m.role === "OWNER" ? "Owner" : "Staff")}
                {m.mustChangePassword ? " · hasn't signed in yet" : ""}
              </p>
            </div>
            <StatusPill tone={m.role === "OWNER" ? "mint" : "neutral"}>
              {m.role === "OWNER" ? "Owner" : (m.title ?? "Staff")}
            </StatusPill>
            {!readOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`Manage ${m.name}`}
                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-text-muted outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ink"
                >
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onSelect={() => setEditing(m)}>
                    <Pencil /> Edit
                  </DropdownMenuItem>
                  {m.id !== currentUserId && (
                    <>
                      <DropdownMenuItem onSelect={() => setResetting(m)}>
                        <KeyRound /> Reset password
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(m)}>
                        <UserMinus /> Remove
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>

      <MemberDialog
        key={`member-${editing === "new" ? "new" : (editing?.id ?? "closed")}`}
        member={editing}
        onClose={() => setEditing(null)}
      />
      <ResetPasswordDialog
        key={`reset-${resetting?.id ?? "closed"}`}
        member={resetting}
        onClose={() => setResetting(null)}
      />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.name ?? "member"}?`}
        description="They can't sign in any more and come off jobs that aren't finished. Their past jobs, photos and notes stay."
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!removing) return
          const res = await removeMemberAction(removing.id)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success(`Removed ${res.data.name}`)
          setRemoving(null)
          router.refresh()
        }}
      />
    </SettingsCard>
  )
}

function MemberDialog({ member, onClose }: { member: Member | "new" | null; onClose: () => void }) {
  const router = useRouter()
  const isNew = member === "new"
  const m = member && member !== "new" ? member : null
  const [v, setV] = useState({
    name: m?.name ?? "",
    email: m?.email ?? "",
    role: (m?.role ?? "STAFF") as "OWNER" | "STAFF",
    title: m?.title ?? "",
    avatarColor: (m?.avatarColor ?? AVATAR_COLORS[1]) as (typeof AVATAR_COLORS)[number],
    password: isNew ? tempPassword() : "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const res = isNew
        ? await addMemberAction(v)
        : await updateMemberAction(m!.id, {
            name: v.name,
            role: v.role,
            title: v.title,
            avatarColor: v.avatarColor,
          })
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {})
        toast.error(res.error)
        return
      }
      toast.success(
        isNew ? `Added ${v.name}. Give them their temporary password.` : `Saved ${v.name}`
      )
      onClose()
      router.refresh()
    })
  }

  return (
    <Dialog open={member !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add team member" : `Edit ${m?.name}`}</DialogTitle>
          <DialogDescription>
            {isNew
              ? "They sign in with this email and the temporary password, then choose their own."
              : "Name, role, title and avatar colour."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <FormField label="Name" htmlFor="m-name" error={errors.name}>
            <Input
              id="m-name"
              value={v.name}
              onChange={(e) => setV({ ...v, name: e.target.value })}
              autoFocus
            />
          </FormField>
          {isNew && (
            <FormField label="Email" htmlFor="m-email" error={errors.email}>
              <Input
                id="m-email"
                type="email"
                value={v.email}
                onChange={(e) => setV({ ...v, email: e.target.value })}
                autoComplete="off"
              />
            </FormField>
          )}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Role" htmlFor="m-role">
              <div
                id="m-role"
                role="radiogroup"
                aria-label="Role"
                className="inline-flex rounded-full bg-surface-muted p-1"
              >
                {(["STAFF", "OWNER"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={v.role === r}
                    onClick={() => setV({ ...v, role: r })}
                    className={cn(
                      "h-8 cursor-pointer rounded-full px-3.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ink",
                      v.role === r ? "bg-surface font-semibold shadow-sm" : "text-text-muted"
                    )}
                  >
                    {r === "OWNER" ? "Owner" : "Staff"}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="Title (optional)" htmlFor="m-title" error={errors.title}>
              <Input
                id="m-title"
                value={v.title}
                placeholder="Technician"
                onChange={(e) => setV({ ...v, title: e.target.value })}
              />
            </FormField>
          </div>
          <fieldset>
            <legend className="field-label mb-2">Avatar colour</legend>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  aria-pressed={v.avatarColor === c}
                  onClick={() => setV({ ...v, avatarColor: c })}
                  className={cn(
                    "size-8 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
                    v.avatarColor === c && "ring-2 ring-ink ring-offset-2 ring-offset-surface"
                  )}
                  // the avatar palette is data (User.avatarColor), not a theme colour
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </fieldset>
          {isNew && (
            <FormField
              label="Temporary password"
              htmlFor="m-password"
              error={errors.password}
              hint={`At least ${PASSWORD_MIN} characters. They'll change it when they first sign in.`}
            >
              <div className="flex gap-2">
                <Input
                  id="m-password"
                  value={v.password}
                  onChange={(e) => setV({ ...v, password: e.target.value })}
                  autoComplete="off"
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="bg-surface-muted"
                  onClick={() => setV({ ...v, password: tempPassword() })}
                  aria-label="New random password"
                >
                  <Shuffle />
                </Button>
              </div>
            </FormField>
          )}
          <DialogFooter className="gap-2 pt-1 sm:gap-2">
            <Button type="button" variant="muted" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {isNew ? "Add member" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ResetPasswordDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const [password, setPassword] = useState(tempPassword)
  const [error, setError] = useState<string | undefined>()
  const [pending, start] = useTransition()
  return (
    <Dialog open={member !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            {member?.name} is signed out and chooses a new password with this one.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              const res = await resetMemberPasswordAction(member!.id, password)
              if (!res.ok) {
                setError(res.fieldErrors?._ ?? res.error)
                return
              }
              toast.success(`New temporary password set for ${member!.name}`)
              onClose()
            })
          }}
        >
          <FormField label="Temporary password" htmlFor="r-password" error={error}>
            <Input
              id="r-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono"
              autoComplete="off"
            />
          </FormField>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="muted" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Reset password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
