-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imagePath" TEXT NOT NULL,
    "storeName" TEXT,
    "date" DATETIME,
    "notes" TEXT,
    "partyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Receipt_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
