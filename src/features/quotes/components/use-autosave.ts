"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type SaveState = "saved" | "dirty" | "saving" | "invalid" | "error" | "conflict"

/**
 * Debounced autosave that never runs two saves at once: edits made while a save is in
 * flight are saved right after it. `flush()` saves now (before status actions).
 */
export function useAutosave(opts: {
  /** returns the payload, or null when the form has invalid fields */
  build: () => unknown | null
  save: (
    payload: unknown
  ) => Promise<{ ok: true } | { ok: false; error: string; conflict?: boolean }>
  delay?: number
}) {
  const [state, setState] = useState<SaveState>("saved")
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const saving = useRef<Promise<void> | null>(null)
  const again = useRef(false)
  const dirty = useRef(false)
  const optsRef = useRef(opts)
  useEffect(() => {
    optsRef.current = opts
  })

  const run = useCallback(async (): Promise<void> => {
    if (saving.current) {
      // a save is in flight: save again right after it
      again.current = true
      return saving.current
    }
    const loop = async () => {
      do {
        again.current = false
        const payload = optsRef.current.build()
        if (payload === null) {
          setState("invalid")
          return
        }
        dirty.current = false
        setState("saving")
        const res = await optsRef.current.save(payload)
        if (res.ok) {
          setError(null)
          setState(dirty.current ? "dirty" : "saved")
        } else {
          setError(res.error)
          setState(res.conflict ? "conflict" : "error")
          dirty.current = true
          return
        }
      } while (again.current)
    }
    saving.current = loop()
    try {
      await saving.current
    } finally {
      saving.current = null
    }
  }, [])

  useEffect(() => {
    if (!tick) return
    const t = setTimeout(() => void run(), opts.delay ?? 700)
    return () => clearTimeout(t)
  }, [tick, run, opts.delay])

  /** Call after every edit. */
  const touch = useCallback(() => {
    dirty.current = true
    setState((s) => (s === "conflict" ? s : "dirty"))
    setTick((t) => t + 1)
  }, [])

  /** Save now and wait (used before Mark sent / Accept / Preview). Resolves false on failure. */
  const flush = useCallback(async () => {
    if (saving.current) await saving.current
    if (dirty.current) await run()
    return !dirty.current
  }, [run])

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current || saving.current) e.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [])

  return { state, error, touch, flush }
}
