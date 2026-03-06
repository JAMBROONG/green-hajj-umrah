#!/bin/bash

echo "🚀 Starting Green Hajj & Umrah Development Environment..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Start PostgreSQL
echo "📦 Starting PostgreSQL container..."
docker compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 3

# Check if database needs migration
if [ ! -d "prisma/migrations" ]; then
    echo "🔧 Running initial database migration..."
    npx prisma migrate dev --name init
else
    echo "✅ Database migrations already exist"
fi

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Database: PostgreSQL running on localhost:5432"
echo "🔑 Database: green_hajj_db"
echo "👤 Username: postgres"
echo "🔒 Password: postgres"
echo ""
echo "🌐 Starting Next.js development server..."
echo ""

npm run dev
