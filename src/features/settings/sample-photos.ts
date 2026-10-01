// Placeholder job-site photos for the demo, written to the dev-only local storage
// (.storage/{businessId}/...). Only used when STORAGE_DEV_LOCAL=1 outside production; real
// photos always go to the business's Google Drive or Dropbox.

import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import type { PrismaClient } from "@/generated/prisma/client"
import { photoPath } from "@/lib/storage/paths"

type Db = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]
type Art = "wall" | "hole" | "patch" | "ladder" | "light" | "tv"

function svg(label: string, c1: string, c2: string, kind: Art) {
  const shapes: Record<Art, string> = {
    wall: "<rect x='188' y='170' width='24' height='34' rx='3' fill='#f3efe6' stroke='#7a705f'/><path d='M120 70h160v96H120z' fill='none' stroke='rgba(255,255,255,.6)' stroke-dasharray='8 6' stroke-width='2'/>",
    tv: "<rect x='112' y='62' width='176' height='104' rx='5' fill='#15171a'/><rect x='120' y='70' width='160' height='88' rx='2' fill='#2c3a4a'/><rect x='150' y='182' width='100' height='12' rx='6' fill='#15171a'/>",
    hole: "<path d='M170 100l30-10 25 15 5 30-20 25-35-5-15-25z' fill='#5b4f40' stroke='#3e352a' stroke-width='3'/>",
    patch:
      "<rect x='160' y='88' width='84' height='80' fill='rgba(255,255,255,.45)' stroke='rgba(255,255,255,.8)'/>",
    ladder:
      "<path d='M150 60l-30 160M200 60l30 160' stroke='#e2ad3c' stroke-width='8' stroke-linecap='round'/><path d='M143 100h63M136 140h77M129 180h91' stroke='#e2ad3c' stroke-width='6'/><rect x='236' y='70' width='120' height='70' rx='4' fill='#1a1c1f'/>",
    light:
      "<path d='M200 40v40' stroke='#333' stroke-width='3'/><path d='M160 80h80l-15 30h-50z' fill='#f7e6a8'/><circle cx='200' cy='130' r='50' fill='rgba(255,240,180,.35)'/>",
  }
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' width='1600' height='1200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='400' height='300' fill='url(#g)'/><rect y='226' width='400' height='74' fill='rgba(0,0,0,.16)'/>${shapes[kind]}<desc>Sample photo: ${label}</desc></svg>`
}

type Sample = {
  customer: string
  job: string | null
  stage: "BEFORE" | "DURING" | "AFTER"
  caption: string
  art: [string, string, Art]
  daysAgo: number
}

const SAMPLES: Sample[] = [
  {
    customer: "Oakwood Property Mgmt",
    job: "Unit 12 turnover repairs",
    stage: "BEFORE",
    caption: "Hole behind the door",
    art: ["#cfc6b6", "#9c917e", "hole"],
    daysAgo: 2,
  },
  {
    customer: "Oakwood Property Mgmt",
    job: "Unit 12 turnover repairs",
    stage: "BEFORE",
    caption: "Living room wall",
    art: ["#b7a58c", "#8a7a63", "wall"],
    daysAgo: 2,
  },
  {
    customer: "Oakwood Property Mgmt",
    job: "Unit 12 turnover repairs",
    stage: "DURING",
    caption: "Patch set, ready for mud",
    art: ["#d5cfc4", "#a39a8b", "patch"],
    daysAgo: 1,
  },
  {
    customer: "Oakwood Property Mgmt",
    job: "Unit 12 turnover repairs",
    stage: "DURING",
    caption: "Ceiling prep",
    art: ["#a2a9ae", "#6d767d", "ladder"],
    daysAgo: 0,
  },
  {
    customer: "Oakwood Property Mgmt",
    job: "Unit 12 turnover repairs",
    stage: "DURING",
    caption: "Second coat",
    art: ["#c0b6a8", "#8f8575", "patch"],
    daysAgo: 0,
  },
  {
    customer: "Oakwood Property Mgmt",
    job: "Unit 7 light fixtures",
    stage: "AFTER",
    caption: "New fixture in the entry",
    art: ["#6d7f8f", "#3f4f5d", "light"],
    daysAgo: 40,
  },
  {
    customer: "Oakwood Property Mgmt",
    job: "Unit 7 light fixtures",
    stage: "AFTER",
    caption: "Hallway pendant",
    art: ["#8a9cad", "#5a6b7c", "light"],
    daysAgo: 40,
  },
  {
    customer: "Sarah Mitchell",
    job: "Living room TV mount",
    stage: "BEFORE",
    caption: "Bare wall, outlet location marked",
    art: ["#b7a58c", "#8a7a63", "wall"],
    daysAgo: 24,
  },
  {
    customer: "Sarah Mitchell",
    job: "Living room TV mount",
    stage: "AFTER",
    caption: "TV mounted, cables hidden",
    art: ["#9fb1c0", "#6c8193", "tv"],
    daysAgo: 24,
  },
  {
    customer: "David Chen",
    job: "Bedroom TV mount",
    stage: "BEFORE",
    caption: "Bedroom wall",
    art: ["#c0b6a8", "#8f8575", "wall"],
    daysAgo: 0,
  },
  {
    customer: "David Chen",
    job: "Bedroom TV mount",
    stage: "DURING",
    caption: "Bracket going up",
    art: ["#a2a9ae", "#6d767d", "ladder"],
    daysAgo: 0,
  },
  {
    customer: "Alvarez Family",
    job: "Ceiling fan install",
    stage: "BEFORE",
    caption: "Old light fixture",
    art: ["#b9b2a4", "#8b8475", "light"],
    daysAgo: 20,
  },
  {
    customer: "Alvarez Family",
    job: "Ceiling fan install",
    stage: "AFTER",
    caption: "Fan installed and balanced",
    art: ["#7f93a5", "#4e6273", "light"],
    daysAgo: 20,
  },
]

export async function seedSamplePhotos(
  db: Db,
  opts: { businessId: string; timezone: string; uploadedById: string; now?: Date }
) {
  const now = opts.now ?? new Date()
  const root = path.resolve(process.cwd(), ".storage", opts.businessId)
  let n = 0
  for (const s of SAMPLES) {
    const customer = await db.customer.findFirst({
      where: { businessId: opts.businessId, name: s.customer },
    })
    if (!customer) continue
    const job = s.job
      ? await db.job.findFirst({
          where: { businessId: opts.businessId, customerId: customer.id, title: s.job },
        })
      : null
    const at = new Date(now.getTime() - s.daysAgo * 86_400_000 - n * 60_000)
    const rel = photoPath({
      customerName: customer.name,
      jobTitle: job?.title,
      stage: s.stage,
      at,
      timeZone: opts.timezone,
      shortId: `sample${n}`,
      mimeType: "image/svg+xml",
    })
    const file = path.join(root, rel)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, svg(s.stage[0] + s.stage.slice(1).toLowerCase(), ...s.art))
    await db.photo.create({
      data: {
        businessId: opts.businessId,
        customerId: customer.id,
        jobId: job?.id ?? null,
        provider: "DEV_LOCAL",
        fileId: rel,
        path: rel,
        mimeType: "image/svg+xml",
        width: 1600,
        height: 1200,
        stage: s.stage,
        caption: s.caption,
        uploadedById: opts.uploadedById,
        createdAt: at,
      },
    })
    n++
  }
  return n
}
