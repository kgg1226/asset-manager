-- CreateEnum
CREATE TYPE "DeviceEnrollmentStatus" AS ENUM ('UNENROLLED', 'ENROLLED', 'PENDING', 'RETIRED');

-- CreateEnum
CREATE TYPE "DeviceComplianceStatus" AS ENUM ('COMPLIANT', 'NON_COMPLIANT', 'UNKNOWN');

-- CreateTable
CREATE TABLE "DeviceCompliance" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "enrollmentStatus" "DeviceEnrollmentStatus" NOT NULL DEFAULT 'UNENROLLED',
    "complianceStatus" "DeviceComplianceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "managed" BOOLEAN NOT NULL DEFAULT false,
    "diskEncrypted" BOOLEAN,
    "passcodeSet" BOOLEAN,
    "firewallOn" BOOLEAN,
    "antivirusOn" BOOLEAN,
    "osUpToDate" BOOLEAN,
    "jailbrokenRooted" BOOLEAN,
    "lastCheckinAt" TIMESTAMP(3),
    "enrolledAt" TIMESTAMP(3),
    "externalSource" TEXT,
    "externalDeviceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceCompliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceCheckin" (
    "id" SERIAL NOT NULL,
    "complianceId" INTEGER NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "complianceStatus" "DeviceComplianceStatus" NOT NULL,
    "osVersion" TEXT,
    "ipAddress" TEXT,
    "source" TEXT,
    "note" TEXT,

    CONSTRAINT "DeviceCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCompliance_assetId_key" ON "DeviceCompliance"("assetId");

-- CreateIndex
CREATE INDEX "DeviceCompliance_enrollmentStatus_idx" ON "DeviceCompliance"("enrollmentStatus");

-- CreateIndex
CREATE INDEX "DeviceCompliance_complianceStatus_idx" ON "DeviceCompliance"("complianceStatus");

-- CreateIndex
CREATE INDEX "DeviceCheckin_complianceId_idx" ON "DeviceCheckin"("complianceId");

-- CreateIndex
CREATE INDEX "DeviceCheckin_checkedAt_idx" ON "DeviceCheckin"("checkedAt");

-- AddForeignKey
ALTER TABLE "DeviceCompliance" ADD CONSTRAINT "DeviceCompliance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceCheckin" ADD CONSTRAINT "DeviceCheckin_complianceId_fkey" FOREIGN KEY ("complianceId") REFERENCES "DeviceCompliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

