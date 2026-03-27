import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const assets = await prisma.asset.findMany({
    select: { id: true, name: true, type: true },
    orderBy: { type: "asc" },
  });
  console.log("=== Assets ===");
  for (const a of assets) {
    console.log(`  ${a.id}\t${a.type.padEnd(12)}\t${a.name}`);
  }

  const exts = await prisma.externalEntity.findMany();
  console.log("\n=== External Entities ===");
  for (const e of exts) {
    console.log(`  ${e.id}\t${e.type}\t${e.name}`);
  }

  const links = await prisma.assetLink.count();
  console.log(`\n=== Links: ${links} ===`);

  const views = await prisma.assetMapView.findMany({
    select: { id: true, name: true, isDefault: true, viewType: true },
  });
  console.log("\n=== Views ===");
  for (const v of views) {
    console.log(`  ${v.id}\t${v.name}\t${v.viewType}\t${v.isDefault ? "(default)" : ""}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
