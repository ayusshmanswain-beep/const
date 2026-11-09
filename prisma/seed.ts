// ==============================================================================
// CONSTRUCT360 PRISMA SEED RUNNER
// Executes raw SQL migrations & seed datasets
// ==============================================================================

import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 [CONSTRUCT360] Starting Database Seeding...");

  const seedSqlPath = join(__dirname, "seed.sql");
  const sql = readFileSync(seedSqlPath, "utf-8");

  // Execute seed script directly in PostgreSQL
  console.log("🚀 Executing prisma/seed.sql...");
  await prisma.$executeRawUnsafe(sql);

  console.log("✅ [CONSTRUCT360] Database Seeding Complete!");
  console.log("   - Companies: 2 (Apex Infra Projects Ltd, Metro Builtcon Pvt Ltd)");
  console.log("   - Projects: 2 (Skyline Tech Park, Elevated Corridor)");
  console.log("   - Sites: 2 with PostGIS Circular & Polygon Geofences");
  console.log("   - Personnel: 350 Total Workers (35 Salaried Staff + 315 Labourers)");
  console.log("   - Double-entry Stock Ledger initialized with Cement & Rebar");
  console.log("   - Telemetry, Attendance, Quality & Safety Inspections seeded");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
