# Phase 5: Job site photos

Phase 5. Job site photos per customer (docs/screens/shot-photos.png).
Photos are stored in the business's own Google Drive or Dropbox, never on
our servers. Show me a plan first.

Storage layer (src/lib/storage/):
- index.ts: StorageProvider interface with ensureFolder(path),
  createUploadSession(path, mimeType, size), finalizeUpload(result) ->
  {fileId, path}, getViewUrl(fileId), getThumbnailUrl(fileId, size),
  move(fileId, newPath), delete(fileId); getProvider(businessId) returns
  the provider the business connected
- google-drive.ts (googleapis): OAuth scope drive.file only, so the app sees
  only files it created. The server creates a resumable upload session
  (send the app origin so CORS works) and the browser PUTs the file to it
- dropbox.ts (dropbox SDK): scoped app with files.content.write and
  files.content.read. The browser uploads to a URL from
  files/get_temporary_upload_link; view with files/get_temporary_link and
  thumbnails with files/get_thumbnail_v2
- fake.ts: in memory provider used by unit and e2e tests
- OAuth routes /api/storage/connect/[provider] and
  /api/storage/callback/[provider]; store the refresh token encrypted
  (AES-256-GCM, src/lib/crypto.ts) in StorageConnection; refresh access
  tokens automatically and show a "Reconnect" banner if access is revoked
- paths.ts builds a folder layout Dylan can browse himself:
  JobDesk/Customers/{Customer name}/{Job title or General}/{Before|During|After}/
  2026-09-29_1432_{shortId}.jpg
  Sanitize names; move folders when a customer or job is renamed

Upload flow:
- POST /api/storage/upload-session checks the user owns the customer,
  allows only image/* up to 15 MB, returns the provider upload URL
- Compress on the client with browser-image-compression (max 1600px,
  about 0.75 quality), upload with per file progress, then save the Photo
  row (provider, fileId, path) and write an Activity row
- No storage connected yet: the upload card shows "Connect Google Drive" and
  "Connect Dropbox" to the Owner, and "Ask the owner to connect storage" to Staff

UI:
- Upload card: Attach to job select (or General), Before / During / After
  segmented control, drop zone that also opens the phone camera
  (accept="image/*" capture="environment"), multiple files
- Gallery: filter tabs with counts, grouped by job with its stage pill,
  tiles with stage badge and caption. Images load through
  GET /api/photos/[id]/file?size=thumb|full, which checks access and
  redirects to a short lived provider link (cache it for a few minutes)
- Photo viewer dialog: large image, edit caption / stage / job (moves the
  file to the matching folder), delete (also deletes it in Drive or Dropbox),
  "Open in Google Drive / Dropbox" link, arrow keys for previous / next
- Export a query for the 6 newest photos for the dashboard
- Unit tests for paths.ts (sanitizing, renames) and the upload flow using
  fake.ts
