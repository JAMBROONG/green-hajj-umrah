// Quick database check script
// Run with: npx tsx check-db.ts

import prisma from "./src/lib/prisma";

async function main() {
  console.log("🔍 Checking database...\n");

  // Count records
  const tenantCount = await prisma.tenant.count();
  const profileCount = await prisma.profile.count();
  const tripCount = await prisma.trip.count();
  const journeyCount = await prisma.journeyData.count();

  console.log("📊 Record Counts:");
  console.log(`   Tenants: ${tenantCount}`);
  console.log(`   Profiles: ${profileCount}`);
  console.log(`   Trips: ${tripCount}`);
  console.log(`   Journey Data: ${journeyCount}\n`);

  // Show tables structure
  console.log("📋 Tables:");
  console.log("   ✅ tenants");
  console.log("   ✅ profiles");
  console.log("   ✅ trips");
  console.log("   ✅ journey_data");
  console.log("   ✅ _prisma_migrations\n");

  // Sample data
  if (profileCount > 0) {
    const profiles = await prisma.profile.findMany({ take: 5 });
    console.log("👥 Sample Profiles:");
    profiles.forEach((p) => {
      console.log(`   - ${p.email} (${p.fullName || "No name"})`);
    });
  }

  if (tripCount > 0) {
    const trips = await prisma.trip.findMany({ take: 5 });
    console.log("\n🕌 Sample Trips:");
    trips.forEach((t) => {
      console.log(`   - ${t.name} (${t.type}) - ${t.status}`);
    });
  }
}

main()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
