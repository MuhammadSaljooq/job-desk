"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

/**
 * Applies the signed-in person's saved Appearance (User.themePreference) once per load, so
 * the choice follows them to other devices. Changing it in Settings saves it again.
 */
export function ThemeSync({ preference }: { preference: string }) {
  const { theme, setTheme } = useTheme()
  useEffect(() => {
    if (theme && theme !== preference) setTheme(preference)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on load / when it changes on the server
  }, [preference])
  return null
}
