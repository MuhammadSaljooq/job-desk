import Link from "next/link"
import { Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { StageBadge } from "@/features/photos/components/gallery"
import { PHOTO_STAGE_LABEL } from "@/features/photos/constants"
import type { PhotoTile } from "@/features/photos/queries"

/** Row 3: the 6 newest job site photos with their Before / During / After badge. */
export function LatestPhotos({ photos }: { photos: PhotoTile[] }) {
  return (
    <section className="min-w-0 rounded-card bg-surface p-5" aria-labelledby="photos-title">
      <header className="mb-3 flex min-h-8 items-center justify-between gap-3">
        <h2 id="photos-title" className="text-[16px] font-semibold">
          Latest job site photos
        </h2>
        <Link
          href="/photos"
          className="rounded-full px-1 text-[12.5px] text-text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ink"
        >
          View all
        </Link>
      </header>
      {photos.length === 0 ? (
        <EmptyState
          icon={<Camera />}
          title="No photos yet"
          description="Before, during and after shots land here as you upload them."
          className="py-8"
          action={
            <Button asChild>
              <Link href="/photos?upload=1">
                <Camera /> Upload photos
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-3 gap-2.5">
          {photos.map((p) => (
            <li key={p.id}>
              <Link
                href={`/customers/${p.customerId}/photos`}
                className="relative block aspect-[4/3] overflow-hidden rounded-tile bg-surface-muted outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                aria-label={`${PHOTO_STAGE_LABEL[p.stage]} photo for ${p.customerName}${
                  p.caption ? `: ${p.caption}` : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- short-lived provider links, not optimizable */}
                <img
                  src={`/api/photos/${p.id}/file?size=thumb`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <StageBadge stage={p.stage} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
