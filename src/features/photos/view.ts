import "server-only"
import { formatDayOf } from "@/lib/dates"
import { getStorageFor } from "@/lib/storage"
import type { GalleryPhoto } from "./components/gallery"
import type { PhotoTile } from "./queries"

const PROVIDER_LABEL = {
  GOOGLE_DRIVE: "Google Drive",
  DROPBOX: "Dropbox",
  DEV_LOCAL: "a new tab",
} as const

/** Serialize photo rows for the client gallery, with "Open in Drive / Dropbox" links. */
export async function toGalleryPhotos(
  businessId: string,
  tiles: PhotoTile[],
  timezone: string
): Promise<GalleryPhoto[]> {
  const storages = new Map<string, Awaited<ReturnType<typeof getStorageFor>>>()
  const out: GalleryPhoto[] = []
  for (const t of tiles) {
    if (!storages.has(t.provider))
      storages.set(t.provider, await getStorageFor(businessId, t.provider).catch(() => null))
    const storage = storages.get(t.provider)
    const openUrl =
      t.provider === "DEV_LOCAL"
        ? `/api/photos/${t.id}/file?size=full`
        : storage
          ? storage.webLink({ fileId: t.fileId, path: t.path })
          : null
    out.push({
      id: t.id,
      stage: t.stage,
      caption: t.caption,
      jobId: t.jobId,
      customerId: t.customerId,
      customerName: t.customerName,
      createdAt: t.createdAt.toISOString(),
      createdLabel: formatDayOf(t.createdAt, timezone),
      uploadedBy: t.uploadedBy,
      openUrl,
      providerLabel: PROVIDER_LABEL[t.provider],
    })
  }
  return out
}
