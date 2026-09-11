CREATE TABLE "StoreSetting" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT,
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "logoUrl" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "taxRate" REAL NOT NULL DEFAULT 0,
  "serviceCharge" REAL NOT NULL DEFAULT 0,
  "receiptHeader" TEXT,
  "receiptFooter" TEXT,
  "printerName" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE TRIGGER IF NOT EXISTS "StoreSetting_updatedAt" AFTER UPDATE ON "StoreSetting" BEGIN
  UPDATE "StoreSetting" SET "updatedAt" = CURRENT_TIMESTAMP WHERE rowid = NEW.rowid;
END;
