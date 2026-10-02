"use client"

import { useEffect, useState } from "react"

/**
 * For dialogs loaded with next/dynamic: true once `open` has been true (so the dialog stays
 * mounted for its close animation), and `preload` is fetched while the browser is idle so the
 * first open is instant. Keeps form code (zod, react-hook-form) off the page's first load.
 */
export function useLazyDialog(open: boolean, preload: () => Promise<unknown>) {
  const [opened, setOpened] = useState(open)
  if (open && !opened) setOpened(true)
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500))
    const id = idle(() => void preload().catch(() => {}))
    return () => (window.cancelIdleCallback ?? clearTimeout)(id as number)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, [])
  return opened || open
}
