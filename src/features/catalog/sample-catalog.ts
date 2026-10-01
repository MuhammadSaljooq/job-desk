// The 44-item sample catalog from the POC (docs/seed-data.md, decision D19). No prices.

export const CATALOG_UNITS = [
  "each",
  "hour",
  "sq ft",
  "linear ft",
  "room",
  "sheet",
  "box",
  "gallon",
  "tube",
  "set",
  "load",
] as const
export type CatalogUnit = (typeof CATALOG_UNITS)[number]

export const SAMPLE_CATALOG: { category: string; items: [name: string, unit: CatalogUnit][] }[] = [
  {
    category: "TV & Mounting",
    items: [
      ["TV Wall Mount (Fixed / Tilt)", "each"],
      ["TV Wall Mount (Full Motion)", "each"],
      ["Soundbar Mount", "each"],
      ["In-Wall Cable Concealment", "each"],
      ["Floating Shelf Install", "each"],
      ["Mirror / Artwork Hanging", "each"],
    ],
  },
  {
    category: "Electrical",
    items: [
      ["Light Fixture Install", "each"],
      ["Ceiling Fan Install", "each"],
      ["Outlet / Switch Replacement", "each"],
      ["Dimmer Switch Install", "each"],
      ["Smart Doorbell Install", "each"],
      ["Smart Thermostat Install", "each"],
    ],
  },
  {
    category: "Plumbing",
    items: [
      ["Faucet Replacement", "each"],
      ["Toilet Repair / Replace", "each"],
      ["Garbage Disposal Install", "each"],
      ["Leak Repair", "each"],
      ["Showerhead Replacement", "each"],
    ],
  },
  {
    category: "Drywall & Carpentry",
    items: [
      ["Drywall Patch (Small)", "each"],
      ["Drywall Patch (Large)", "each"],
      ["Door Install / Adjust", "each"],
      ["Trim & Baseboard", "linear ft"],
      ["Cabinet Hardware Install", "set"],
    ],
  },
  {
    category: "Painting",
    items: [
      ["Interior Wall Painting", "room"],
      ["Ceiling Painting", "room"],
      ["Paint Touch-ups", "hour"],
      ["Exterior Trim Painting", "linear ft"],
    ],
  },
  {
    category: "Assembly",
    items: [
      ["Furniture Assembly", "each"],
      ["Bed Frame Assembly", "each"],
      ["Desk / Office Assembly", "each"],
      ["Outdoor Furniture / Grill", "each"],
    ],
  },
  {
    category: "Flooring & Tile",
    items: [
      ["Tile Repair", "sq ft"],
      ["Laminate / Vinyl Plank Install", "sq ft"],
      ["Grout & Caulk Refresh", "room"],
    ],
  },
  {
    category: "Construction Supplies",
    items: [
      ["Drywall Sheets", "sheet"],
      ["Joint Compound", "box"],
      ["Lumber", "each"],
      ["Screws & Anchors", "box"],
      ["Paint & Primer", "gallon"],
      ["Caulk / Sealant", "tube"],
      ["Mounting Hardware Kit", "each"],
    ],
  },
  {
    category: "Labor & Fees",
    items: [
      ["Hourly Labor", "hour"],
      ["Service Call / Trip Fee", "each"],
      ["Haul-Away / Disposal", "load"],
      ["After-Hours Surcharge", "each"],
    ],
  },
]

/** Case-insensitive key used for duplicate detection (CatalogItem.nameKey). */
export function catalogNameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase()
}
