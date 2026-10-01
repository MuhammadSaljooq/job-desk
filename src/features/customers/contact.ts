/** tel:, sms:, mailto: and a maps link for a customer (call / text / directions buttons). */
export function contactLinks(c: {
  phone?: string | null
  email?: string | null
  address?: string | null
}) {
  const digits = c.phone?.replace(/[^\d+]/g, "") ?? ""
  return {
    tel: digits ? `tel:${digits}` : undefined,
    sms: digits ? `sms:${digits}` : undefined,
    mailto: c.email ? `mailto:${c.email}` : undefined,
    maps: c.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`
      : undefined,
  }
}
