"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FileText, Loader2, Search, User, Wrench } from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { globalSearchAction } from "@/features/search/actions"
import type { SearchHit } from "@/features/search/search"

const KIND = {
  customer: { label: "Customers", icon: User },
  job: { label: "Jobs", icon: Wrench },
  quote: { label: "Quotes", icon: FileText },
} as const

/** ⌘K / Ctrl+K search across customers, jobs and quotes. */
export function CommandSearch({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<SearchHit[]>([])
  const [pending, startTransition] = useTransition()
  const latest = useRef(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    const id = ++latest.current
    const t = setTimeout(() => {
      startTransition(async () => {
        const result = await globalSearchAction(q)
        if (id === latest.current) setHits(result)
      })
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  const go = (href: string) => {
    onOpenChange(false)
    setQuery("")
    setHits([])
    router.push(href)
  }

  const shown = query.trim().length < 2 ? [] : hits

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search customers, jobs and quotes"
      className="sm:max-w-xl"
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search customers, jobs and quotes"
        />
        <CommandList>
          {query.trim().length < 2 ? (
            <div className="flex items-center gap-2 px-4 py-6 text-[13px] text-text-muted">
              <Search className="size-4" /> Type a name, phone, address, job or quote number.
            </div>
          ) : pending && shown.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-6 text-[13px] text-text-muted">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </div>
          ) : (
            <CommandEmpty>No matches for “{query.trim()}”.</CommandEmpty>
          )}
          {(Object.keys(KIND) as (keyof typeof KIND)[]).map((kind) => {
            const group = shown.filter((h) => h.kind === kind)
            if (!group.length) return null
            const Icon = KIND[kind].icon
            return (
              <CommandGroup key={kind} heading={KIND[kind].label}>
                {group.map((h) => (
                  <CommandItem
                    key={h.kind + h.id}
                    value={h.kind + h.id}
                    onSelect={() => go(h.href)}
                  >
                    <Icon className="size-4 text-text-muted" />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold">{h.title}</span>
                      <span className="ml-2 text-text-muted">{h.subtitle}</span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          })}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
