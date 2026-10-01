# Phase 2: Database, schema and seed data

Phase 2. Set up the database. Show me the schema before running migrations.

- docker-compose.yml with Postgres 16
- .env.example with DATABASE_URL, AUTH_SECRET, GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET, DROPBOX_APP_KEY, DROPBOX_APP_SECRET, TOKEN_ENCRYPTION_KEY
- prisma/schema.prisma with these models, all with id, createdAt, updatedAt
  and a businessId:
  Business (name, logoUrl, phone, email, address, currency, taxRateBps,
    nextQuoteNumber, quoteFooter)
  User (name, email, role OWNER|STAFF, avatarColor)
  StorageConnection (provider GOOGLE_DRIVE|DROPBOX, accountEmail,
    encryptedRefreshToken, rootFolderId, connectedById), one per business
  Customer (name, type HOMEOWNER|LANDLORD|BUSINESS, phone, email, address,
    accessNotes, preferredContact, status ACTIVE|PAST)
  Job (customerId, title, category, stage LEAD|QUOTED|SCHEDULED|IN_PROGRESS|
    COMPLETED, scheduledAt, notes, assignees -> User many to many)
  Photo (customerId, jobId?, provider, fileId, path, mimeType, stage BEFORE|DURING|AFTER, caption,
    uploadedById, width, height)
  CatalogCategory (name, sortOrder); CatalogItem (categoryId, name, unit)
  Quote (number, customerId, jobId?, title, date, status DRAFT|SENT|ACCEPTED|
    DECLINED, taxRateBps, discountCents, notes)
  QuoteLine (quoteId, catalogItemId?, name, category, unit, qty Decimal,
    unitPriceCents, sortOrder)
  Transaction (type INCOME|EXPENSE, amountCents, date, category, description,
    customerId?, quoteId?)
  Activity (type, message, customerId?, entity, entityId, readAt?)
- Indexes on every foreign key and on (businessId, date) for Transaction
- prisma/seed.ts from docs/seed-data.md: one business, owner + 2 staff, the full catalog from the
  spec (9 categories, about 45 items, no prices), 6 customers, 8 jobs across
  all stages, 5 quotes, about 20 transactions over the last 5 months
- src/lib/db.ts (singleton client) and src/lib/money.ts (toCents,
  formatMoney, sum) with Vitest tests
