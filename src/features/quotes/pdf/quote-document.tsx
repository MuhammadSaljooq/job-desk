import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import { formatBps, formatMoney } from "@/lib/money"
import { formatDay } from "@/lib/dates"

// Printable quote (page-spec 5b > Quote preview): business name and logo, number, date,
// customer, items, totals, notes and footer. Built-in Helvetica keeps it dependency-free.

export type QuotePdfData = {
  business: {
    name: string
    phone: string | null
    email: string | null
    address: string | null
    logo: { data: Buffer; mime: string } | null
  }
  number: number
  date: string
  status: string
  title: string | null
  customer: { name: string; address: string | null; phone: string | null; email: string | null }
  lines: {
    name: string
    category: string | null
    unit: string | null
    qty: string
    unitPriceCents: number
    amountCents: number
  }[]
  subtotal: number
  discount: number
  taxRateBps: number
  tax: number
  total: number
  notes: string | null
  footer: string | null
  currency: string
}

const INK = "#17191A"
const MUTED = "#6B716C"
const LINE = "#E6EAE6"
const SAGE = "#DFE7DE"

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: INK },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 44, height: 44, objectFit: "contain" },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: INK,
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    textAlign: "center",
    paddingTop: 12,
  },
  bizName: { fontFamily: "Helvetica-Bold", fontSize: 16 },
  muted: { color: MUTED },
  quoteNo: { fontFamily: "Helvetica-Bold", fontSize: 20, textAlign: "right" },
  meta: { flexDirection: "row", gap: 40, marginBottom: 22 },
  label: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  strong: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  table: { borderTopWidth: 1, borderTopColor: LINE },
  th: {
    flexDirection: "row",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tr: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: LINE },
  cItem: { flex: 1, paddingRight: 8 },
  cQty: { width: 50, textAlign: "right" },
  cPrice: { width: 80, textAlign: "right" },
  cAmt: { width: 80, textAlign: "right" },
  totals: { marginLeft: "auto", width: 220, marginTop: 14 },
  tRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: INK,
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
  },
  notes: { marginTop: 26, padding: 12, backgroundColor: "#F3F5F3", borderRadius: 6 },
  footer: { marginTop: 26, paddingTop: 12, borderTopWidth: 4, borderTopColor: SAGE, color: MUTED },
})

export function QuoteDocument({ d }: { d: QuotePdfData }) {
  const m = (c: number) => formatMoney(c, d.currency)
  const initials = d.business.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
  return (
    <Document title={`Quote Q-${d.number}`} author={d.business.name} subject={d.title ?? undefined}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View style={s.brand}>
            {d.business.logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
              <Image
                style={s.logo}
                src={{
                  data: d.business.logo.data,
                  format: d.business.logo.mime.includes("png") ? "png" : "jpg",
                }}
              />
            ) : (
              <Text style={s.mark}>{initials || "JD"}</Text>
            )}
            <View>
              <Text style={s.bizName}>{d.business.name}</Text>
              {[d.business.phone, d.business.email, d.business.address].filter(Boolean).map((v) => (
                <Text key={v} style={s.muted}>
                  {v}
                </Text>
              ))}
            </View>
          </View>
          <View>
            <Text style={s.quoteNo}>Quote Q-{d.number}</Text>
            <Text style={[s.muted, { textAlign: "right" }]}>{formatDay(d.date)}</Text>
          </View>
        </View>

        <View style={s.meta}>
          <View>
            <Text style={s.label}>Prepared for</Text>
            <Text style={s.strong}>{d.customer.name}</Text>
            {[d.customer.address, d.customer.phone, d.customer.email].filter(Boolean).map((v) => (
              <Text key={v} style={s.muted}>
                {v}
              </Text>
            ))}
          </View>
          {d.title && (
            <View>
              <Text style={s.label}>Job</Text>
              <Text style={s.strong}>{d.title}</Text>
            </View>
          )}
        </View>

        <View style={s.table}>
          <View style={s.th}>
            <Text style={s.cItem}>Item</Text>
            <Text style={s.cQty}>Qty</Text>
            <Text style={s.cPrice}>Price</Text>
            <Text style={s.cAmt}>Amount</Text>
          </View>
          {d.lines.map((l, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <View style={s.cItem}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{l.name}</Text>
                {(l.category || l.unit) && (
                  <Text style={[s.muted, { fontSize: 8.5 }]}>
                    {[l.category, l.unit && `per ${l.unit}`].filter(Boolean).join(", ")}
                  </Text>
                )}
              </View>
              <Text style={s.cQty}>{l.qty}</Text>
              <Text style={s.cPrice}>{m(l.unitPriceCents)}</Text>
              <Text style={s.cAmt}>{m(l.amountCents)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals} wrap={false}>
          <View style={s.tRow}>
            <Text style={s.muted}>Subtotal</Text>
            <Text>{m(d.subtotal)}</Text>
          </View>
          {d.discount > 0 && (
            <View style={s.tRow}>
              <Text style={s.muted}>Discount</Text>
              <Text>−{m(d.discount)}</Text>
            </View>
          )}
          <View style={s.tRow}>
            <Text style={s.muted}>Tax {formatBps(d.taxRateBps)}</Text>
            <Text>{m(d.tax)}</Text>
          </View>
          <View style={s.grand}>
            <Text>Total</Text>
            <Text>{m(d.total)}</Text>
          </View>
        </View>

        {d.notes && (
          <View style={s.notes} wrap={false}>
            <Text style={s.label}>Notes</Text>
            <Text>{d.notes}</Text>
          </View>
        )}
        <Text style={s.footer}>{d.footer || "Thank you for the opportunity."}</Text>
      </Page>
    </Document>
  )
}
