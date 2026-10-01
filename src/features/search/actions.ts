"use server"

import { requireUser } from "@/lib/auth"
import { searchEverything, type SearchHit } from "./search"

export async function globalSearchAction(query: string): Promise<SearchHit[]> {
  const user = await requireUser()
  if (typeof query !== "string") return []
  return searchEverything(user.businessId, query)
}
