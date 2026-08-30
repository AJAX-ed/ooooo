# RegDesk

**"Every arrival. Counted."**

RegDesk is a registration and event-management system for the CYSCOM x FYI college event/hackathon. Designed to handle approximately 500 participants with features including participant management, Google-authenticated volunteers, and offline-first volunteer operation capabilities.

## Features (Current Implementation)

- **Google OAuth Authentication**: Secure login with Google OAuth through Supabase Auth
- **Role-based Access Control**: Admin and Volunteer roles with appropriate permissions
- **Admin Dashboard**: Real-time statistics and management interface
- **Participant Management**: Search, paginate, and view participant data
- **Volunteer Management**: View authorized volunteers and their status
- **Event Configuration**: View event settings
- **Audit Logging**: Comprehensive logging of administrative actions
- **Security**: Row Level Security (RLS) enforced at database level

## Tech Stack

- Next.js 16.3.3 (App Router)
- React 19.2.8
- TypeScript
- Tailwind CSS v4
- Supabase (PostgreSQL, Auth, RLS)
- Zod (validation)

## Local Setup

### Prerequisites

- Node.js 18+
- npm/pnpm/yarn

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then configure:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Supabase Setup

### 1. Create a Supabase Project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run Migrations

Apply the database migrations in order:

1. `supabase/migrations/0001_initial_schema.sql` - Creates all tables
2. `supabase/migrations/0002_rls_policies.sql` - Sets up Row Level Security

You can run these in the Supabase SQL Editor or using the Supabase CLI:

```bash
supabase db push
```

### 3. Configure Google OAuth

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable **Google** provider
4. Configure your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
5. Add authorized redirect URIs in Google Cloud Console:
   - `https://your-project-id.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for local development)

### 4. Create Authorized Volunteers

After enabling Google OAuth, you need to add volunteers to the database:

```sql
-- Insert an admin volunteer
INSERT INTO public.volunteers (id, email, name, role, is_active)
VALUES (
  'auth-user-id-from-supabase-auth',  -- Get this from Supabase Auth after user signs in
  'admin@example.com',
  'Admin User',
  'ADMIN',
  true
);

-- Insert a regular volunteer
INSERT INTO public.volunteers (id, email, name, role, is_active)
VALUES (
  'another-auth-user-id',
  'volunteer@example.com',
  'Volunteer User',
  'VOLUNTEER',
  true
);
```

**Important**: The `id` must match the user's ID in Supabase Auth. After a user signs in via Google OAuth for the first time, find their auth user ID in the Supabase Auth dashboard and insert a corresponding record in the volunteers table.

## Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**
4. Go to **APIs & Services** → **Credentials**
5. Create **OAuth 2.0 Client IDs**
6. Configure consent screen
7. Add authorized redirect URIs:
   - `https://your-project-id.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (development)
8. Copy the Client ID and Client Secret to Supabase

## Architecture

```
Browser → Cloudflare DNS → Vercel → Supabase
```

- **Frontend**: Next.js App Router with Server and Client Components
- **Backend**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth with Google OAuth
- **Deployment**: Vercel

## Security Model

1. **Authentication**: Google OAuth via Supabase Auth
2. **Authorization**: 
   - Middleware checks authentication for protected routes
   - Server-side verification of volunteer status
   - Database-level Row Level Security (RLS)
3. **Role Verification**: 
   - Only users in the `volunteers` table with `is_active = true` can access the application
   - ADMIN role required for `/admin` routes
4. **No Service Role Exposure**: Browser only uses anon key; service role never exposed

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Deployment to Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (your production domain)
3. Deploy

## Current Implementation Status

### ✅ Completed (This Task)

- Google OAuth authentication flow
- OAuth callback handling
- Session management with middleware
- Volunteer authorization (email allowlist)
- Admin dashboard with live statistics
- Participant list with search and pagination
- Volunteer management view
- Event settings view
- Audit log viewer
- Logout functionality
- Server-side authorization
- Row Level Security policies

### ⏳ Planned for Next Task

- QR credential generation
- QR code scanning (offline-capable)
- Email pass delivery with Resend
- Three-point attendance tracking
- Offline-first volunteer PWA
- Team formation on event day
- Sync operations for offline data

## Troubleshooting

### "Not authorized" after Google login

Ensure your Google email is added to the `volunteers` table with `is_active = true`.

### OAuth redirect errors

Verify that your redirect URIs are correctly configured in both:
1. Google Cloud Console
2. Supabase Auth provider settings

### Can't access admin routes

Only users with `role = 'ADMIN'` in the volunteers table can access `/admin` routes.

## Database Schema

Key tables:

- `event_config` - Event details and activation status
- `volunteers` - Authorized volunteers with roles
- `participants` - Event participants with QR tokens
- `teams` - Participant teams
- `team_members` - Team membership
- `attendance` - Attendance records (3 checkpoints)
- `sync_operations` - Offline sync queue
- `audit_logs` - Administrative action logs
- `pass_deliveries` - Email pass delivery tracking

## License

Private - CYSCOM x FYI Event
