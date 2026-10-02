-- AlterTable
ALTER TABLE "StorageConnection" ADD COLUMN     "previousAccountEmail" TEXT,
ADD COLUMN     "previousEncryptedRefreshToken" TEXT,
ADD COLUMN     "previousProvider" "StorageProvider",
ADD COLUMN     "previousRootFolderId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "removedAt" TIMESTAMP(3);
