#!/bin/bash

# Fix all Prisma model names and field names in API routes

echo "Fixing Prisma naming in API routes..."

# Model names
find src/app/api -type f -name "*.ts" -exec sed -i 's/prisma\.profile\b/prisma.profiles/g' {} \;
find src/app/api -type f -name "*.ts" -exec sed -i 's/prisma\.trip\b/prisma.trips/g' {} \;
find src/app/api -type f -name "*.ts" -exec sed -i 's/prisma\.tenant\b/prisma.tenants/g' {} \;
find src/app/api -type f -name "*.ts" -exec sed -i 's/prisma\.journeyData\b/prisma.journey_data/g' {} \;

# Field names in where clauses and data objects (be careful with these)
find src/app/api -type f -name "*.ts" -exec sed -i 's/\buser_id:/user_id:/g' {} \;
find src/app/api -type f -name "*.ts" -exec sed -i 's/\btenant_id:/tenant_id:/g' {} \;
find src/app/api -type f -name "*.ts" -exec sed -i 's/\btrip_id:/trip_id:/g' {} \;
find src/app/api -type f -name "*.ts" -exec sed -i 's/\bstart_date:/start_date:/g' {} \;
find src/app/api -type f -name "*.ts" -exec sed-i 's/\bend_date:/end_date:/g' {} \;
find src/app/api -type f -name "*.ts" -exec sed -i 's/\btotal_emission:/total_emission:/g' {} \;

# More complex replacements
find src/app/api -type f -name "*.ts" -exec sed -i 's/userId:/user_id:/g' {} \;
find src/app/api -type f -name "*.ts" -exec sed -i 's/tenantId:/tenant_id:/g' {} \;
find src/app/api -type f -name "*.ts" -exec sed -i 's/tripId:/trip_id:/g' {} \;
find src/app/api -type f -name "*.ts" -exec sed -i 's/startDate:/start_date:/g' {} \;
find src/app/api -type f -name "*.ts" -exec sed -i 's/endDate:/end_date:/g' {} \;
find src/app/api -type f -name "*.ts" -exec sed -i 's/totalEmission:/total_emission:/g' {} \;

echo "Done!"
