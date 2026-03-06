# Green Hajj & Umrah - PostgreSQL Self-Host Setup

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies

```bash
npm install
```

### 2. Start PostgreSQL with Docker

```bash
docker compose up -d
```

This starts a local PostgreSQL database on port 5432.

### 3. Setup Environment Variables

The `.env.local` file is already configured for local development:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/green_hajj_db?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_DEFAULT_TENANT="default"
```

**IMPORTANT**: Generate a secure secret for production:
```bash
openssl rand -base64 32
```

### 4. Run Database Migrations

```bash
npx prisma migrate dev
```

### 5. Start Development Server

```bash
npm run dev
```

App will be available at http://localhost:3000

## 📦 Tech Stack

- **Database**: PostgreSQL 16 (Docker)
- **ORM**: Prisma 7
- **Auth**: NextAuth.js v5
- **Password**: bcrypt
- **Framework**: Next.js 14

## 🗄️ Database Schema

```prisma
model Tenant {
  id        String   (UUID)
  name      String
  slug      String   (unique)
  settings  Json
  branding  Json
  profiles  Profile[]
  journeys  Journey[]
}

model Profile {
  id           String   (UUID)
  tenantId     String
  fullName     String
  email        String   (unique)
  password     String   (hashed)
  authProvider String
  journeys     Journey[]
}

model Journey {
  id            String   (UUID)
  userId        String   (unique per user)
  tenantId      String
  phases        Json     (journey data)
  totalEmission Decimal
}
```

## 🔐 Authentication

### Sign Up
```bash
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe"
}
```

### Sign In
- Navigate to `/auth/signin`
- Or use NextAuth API: `signIn("credentials", { email, password })`

### Sign Out
```javascript
import { signOut } from "next-auth/react"
signOut()
```

## 🏢 Multi-Tenant Setup

### Default Tenant
On first signup, a "default" tenant is auto-created for standalone users.

### Create New Tenant (for clients)

```bash
npx prisma studio
```

Then add a new Tenant:
- **name**: "My Travel Agency"
- **slug**: "my-agency" (unique identifier)
- **settings**: `{}`
- **branding**: `{"primaryColor": "#0D6E4F"}`

### Embedded Mode

```
https://your-app.com?tenant=my-agency&embed=true
```

## 🐳 Docker Commands

```bash
# Start database
docker compose up -d

# Stop database
docker compose down

# View logs
docker compose logs -f postgres

# Restart database
docker compose restart

# Remove database (⚠️ deletes all data)
docker compose down -v
```

## 🔧 Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# View database in browser
npx prisma studio

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Push schema without migration (dev only)
npx prisma db push
```

## 📊 Prisma Studio

Browse and edit database with GUI:

```bash
npx prisma studio
```

Opens at http://localhost:5555

## 🚀 Production Deployment

### 1. Cloud PostgreSQL Options

**Free/Cheap Options:**
- Railway ($5/mo after free tier)
- Supabase Free Tier (no subscription needed!)
- Neon.tech (3GB free)
- DigitalOcean (from $15/mo)
- AWS RDS (from $15/mo)

**Self-Host:**
```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=secure_password \
  -e POSTGRES_DB=green_hajj_db \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine
```

### 2. Update Environment Variables

```env
DATABASE_URL="postgresql://user:pass@your-db-host:5432/green_hajj_db"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="<generated-with-openssl>"
```

### 3. Run Migrations on Production

```bash
npx prisma migrate deploy
```

### 4. Deploy to Vercel

```bash
vercel --prod
```

Add environment variables in Vercel dashboard.

## 🔄 Migrate from localStorage

The app currently uses localStorage. To migrate:

1. User signs up/logs in
2. Check for localStorage data
3. POST to `/api/journey` to sync
4. Clear localStorage after success

Add to your journey hook:

```typescript
const migrateLocalData = async (session) => {
  const localData = localStorage.getItem('hajiJourney');
  if (localData && session) {
    await fetch('/api/journey', {
      method: 'POST',
      body: JSON.stringify({
        journey: JSON.parse(localData),
        totalEmission: calculateTotal(JSON.parse(localData))
      })
    });
    localStorage.removeItem('hajiJourney');
  }
};
```

## 🛠️ Development Tips

### Hot Reload Database Schema

After changing `schema.prisma`:

```bash
npx prisma migrate dev
npm run dev
```

### Seed Database

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default',
      settings: {},
      branding: {}
    }
  });
}

main();
```

Run: `npx prisma db seed`

## 📱 API Routes

All routes require authentication except signup:

- `POST /api/auth/signup` - Register
- `GET /api/auth/me` - Current user
- `GET /api/journey` - Fetch user's journey
- `POST /api/journey` - Save journey
- `GET /api/tenants?tenant=slug` - Get tenant info

## 🔒 Security Checklist

- [x] Passwords hashed with bcrypt
- [x] JWT-based sessions
- [x] CSRF protection (NextAuth)
- [x] SQL injection safe (Prisma)
- [ ] Rate limiting (TODO: add redis)
- [ ] Email verification (TODO)

## 🧪 Testing

```bash
# Check database connection
npx prisma db execute --stdin <<< "SELECT 1;"

# Test auth
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234","fullName":"Test User"}'
```

## 📚 Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

