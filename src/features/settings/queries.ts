import "server-only"
import { db } from "@/lib/db"
import { folderLink, storageStatus } from "@/lib/storage"
import { oauthConfigured } from "@/lib/storage/oauth"
import { copyStatus } from "./service"

/** Everything /settings shows. Secrets (tokens, password hashes) never leave this file. */
export async function getSettingsView(businessId: string) {
  const [business, team, storage, copy, quoteMax] = await Promise.all([
    db.business.findUniqueOrThrow({
      where: { id: businessId },
      select: {
        name: true,
        tagline: true,
        phone: true,
        email: true,
        address: true,
        timezone: true,
        currency: true,
        taxRateBps: true,
        nextQuoteNumber: true,
        quoteFooter: true,
        notifyJobReminders: true,
        notifyPayments: true,
        createdAt: true,
        logoMime: true,
        updatedAt: true,
      },
    }),
    db.user.findMany({
      where: { businessId, removedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        avatarColor: true,
        mustChangePassword: true,
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    storageStatus(businessId),
    copyStatus(businessId),
    db.quote.aggregate({ where: { businessId }, _max: { number: true } }),
  ])
  const conn = await db.storageConnection.findUnique({
    where: { businessId },
    select: { previousProvider: true, previousAccountEmail: true },
  })
  return {
    business: {
      ...business,
      hasLogo: !!business.logoMime,
      logoVersion: business.updatedAt.getTime(),
      createdAt: business.createdAt.toISOString(),
      updatedAt: undefined,
    },
    team,
    highestQuoteNumber: quoteMax._max.number ?? 0,
    storage: {
      status: storage,
      folderUrl:
        storage.state === "connected" ? folderLink(storage.provider, storage.rootFolderId) : null,
      previous: conn?.previousProvider
        ? { provider: conn.previousProvider, accountEmail: conn.previousAccountEmail }
        : null,
      copy: copy && copy.remaining > 0 ? copy : null,
      configured: { google: oauthConfigured("google"), dropbox: oauthConfigured("dropbox") },
    },
  }
}

export type SettingsView = Awaited<ReturnType<typeof getSettingsView>>
