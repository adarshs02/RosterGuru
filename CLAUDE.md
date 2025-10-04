# RosterGuru - Project Documentation

## Project Overview

RosterGuru is a comprehensive fantasy basketball analysis platform that provides data-driven insights, historical NBA player statistics, and community discussions to help users make informed fantasy basketball decisions.

**Project Type:** Next.js Web Application
**Purpose:** Fantasy Basketball Analysis & Community Platform
**Target Users:** Fantasy basketball enthusiasts seeking data-driven insights

## Tech Stack

### Core Framework
- **Next.js 14.2.30** - React framework with App Router
- **React 18** - UI library
- **TypeScript 5** - Type safety

### Authentication & Database
- **Clerk** - User authentication and management (@clerk/nextjs ^6.26.0)
- **Supabase** - Backend database and real-time data (@supabase/supabase-js ^2.52.1)
  - PostgreSQL database
  - Row Level Security (RLS) policies
  - Real-time subscriptions

### UI & Styling
- **Tailwind CSS 3** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
  - Accordion, Alert Dialog, Avatar, Checkbox, Dropdown Menu, Tabs, etc.
- **Lucide React** - Icon library
- **Framer Motion** - Animation library
- **shadcn/ui** - Component architecture (via components.json)

### Additional Tools
- **Stripe** - Payment processing
- **Tempo DevTools** - Development debugging tools
- **Vercel Analytics & Speed Insights** - Performance monitoring
- **next-themes** - Dark/light mode support
- **cmdk** - Command menu
- **react-hook-form** - Form management

## Project Structure

```
/RosterGuru
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── (auth)/              # Authentication routes (grouped)
│   │   │   ├── forgot-password/
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── api/                 # API routes
│   │   │   ├── discussions/
│   │   │   └── players/
│   │   ├── coming-soon/         # Feature preview pages
│   │   ├── dashboard/           # User dashboard
│   │   ├── discussion/          # Discussion forum
│   │   ├── maintenance/         # Maintenance pages
│   │   ├── playerdatabase/      # Player statistics database
│   │   ├── players/             # Individual player pages
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home page
│   │   ├── globals.css          # Global styles
│   │   └── actions.ts           # Server actions
│   ├── components/              # React components
│   │   ├── ui/                  # Reusable UI components (shadcn/ui)
│   │   ├── navbar.tsx           # Navigation bar
│   │   ├── footer.tsx           # Footer
│   │   ├── hero.tsx             # Hero section
│   │   ├── base-table.tsx       # Player data table
│   │   ├── discussion-card.tsx  # Discussion display
│   │   ├── create-discussion-dialog.tsx
│   │   ├── AutoCompleteSearch.tsx
│   │   └── zscore-multiplier-editor.tsx
│   ├── lib/                     # Utility libraries
│   │   ├── playerData.ts        # Player data fetching
│   │   ├── zscoreCalculator.ts  # Z-score calculation logic
│   │   ├── supabase.ts          # Supabase client
│   │   └── utils.ts             # General utilities
│   ├── types/
│   │   └── supabase.ts          # Supabase type definitions
│   └── utils/                   # Additional utilities
│       ├── auth.ts
│       └── utils.ts
├── supabase/                    # Supabase configuration
│   ├── migrations/              # Database migrations
│   │   ├── initial-setup.sql
│   │   ├── 20250813_add_discussions.sql
│   │   └── 20250813_add_discussion_votes.sql
│   ├── client.ts                # Supabase client setup
│   ├── server.ts                # Server-side Supabase client
│   └── middleware.ts            # Supabase middleware
├── public/                      # Static assets
├── next.config.js               # Next.js configuration
├── tailwind.config.ts           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
├── components.json              # shadcn/ui configuration
└── package.json                 # Dependencies
```

## Features

### 1. Player Database (`/playerdatabase`)
- **Historical NBA Stats**: 10+ years of player statistics
- **Dynamic Z-Score Rankings**: Customizable player value calculations
- **Multiple Stat Types**: Per Game, Per 36 Minutes, Total Stats
- **Season Selection**: Browse stats from 2015-16 to 2024-25
- **Sortable & Searchable**: Advanced filtering and sorting
- **Real-time Top Player**: Display highest z-score player for selected season

**Key Files:**
- `src/app/playerdatabase/page.tsx`
- `src/components/base-table.tsx`
- `src/lib/playerData.ts`
- `src/lib/zscoreCalculator.ts`

### 2. Discussion Forums (`/discussion`)
- **Community Discussions**: Threaded conversations about players and teams
- **Player/Team Specific**: Link discussions to specific subjects
- **Voting System**: Upvote/downvote discussions
- **Tagging System**: Tags and engagement tags for organization
- **Real-time Updates**: Live discussion feed

**Key Files:**
- `src/app/discussion/page.tsx`
- `src/components/discussion-card.tsx`
- `src/components/create-discussion-dialog.tsx`
- `src/app/api/discussions/route.ts`

### 3. Authentication
- **Clerk Integration**: Secure user authentication
- **Sign In/Sign Up**: Email-based authentication
- **Password Recovery**: Forgot password flow
- **Protected Routes**: Middleware-based route protection

**Key Files:**
- `src/app/(auth)/sign-in/page.tsx`
- `src/app/(auth)/sign-up/page.tsx`
- `src/middleware.ts`

### 4. Coming Soon Features
- Player Profiles (detailed career progression)
- Projection Sharing (upload and compare projections)
- AI Mock Drafts (simulate drafts with AI)

## Database Schema

### Tables

#### `users`
```sql
- id: uuid (PK)
- user_id: text (unique)
- email: text
- name: text
- full_name: text
- avatar_url: text
- token_identifier: text
- image: text
- created_at: timestamptz
- updated_at: timestamptz
```

**Features:**
- RLS enabled
- Automatic user creation via trigger on `auth.users`
- Policy: Users can view own data only

#### `discussions`
```sql
- id: uuid (PK, auto-generated)
- subject_type: enum('player', 'team')
- player_id: integer (nullable)
- team_abbreviation: text (nullable)
- subject_name: text
- title: text
- content: text
- tags: text[]
- engagement_tags: text[]
- created_by: uuid (nullable, FK to users)
- created_at: timestamptz
- updated_at: timestamptz
```

**Constraints:**
- Check: player discussions must have player_id, team discussions must have team_abbreviation

**Indexes:**
- `discussions_player_id_idx`
- `discussions_team_abbrev_idx`
- `discussions_created_at_idx` (DESC)

**Features:**
- RLS enabled
- Open read/insert policies (development-friendly)

#### `discussion_votes`
```sql
- discussion_id: uuid (FK to discussions)
- user_id: uuid
- value: integer (1 or -1)
```

**Features:**
- Vote tracking for discussions
- Aggregated on discussion page load

### Triggers & Functions

**`handle_new_user()`**
- Automatically creates user record when auth.users receives new entry
- Syncs user metadata

**`handle_user_update()`**
- Keeps user table in sync with auth.users updates

## API Routes

### POST `/api/discussions`
Create a new discussion

**Request Body:**
```typescript
{
  subjectType: 'player' | 'team',
  playerId?: number,
  teamAbbreviation?: string,
  subjectName: string,
  title: string,
  content: string,
  tags?: string[],
  engagementTags?: string[]
}
```

**Response:** `201 Created` with discussion object

### GET `/api/discussions`
Fetch discussions with optional filtering

**Query Params:**
- `subject_type`: 'player' | 'team'
- `player_id`: number
- `team_abbreviation`: string
- `limit`: number (default: 20)
- `page`: number (default: 1)

**Response:** Array of discussion objects

### POST `/api/discussions/[id]/vote`
Vote on a discussion (upvote/downvote)

## Key Components

### `BaseTable`
Dynamic, sortable table for displaying player statistics with z-score calculations.

**Props:**
- `title`: string
- `showZScore`: boolean
- `season`: string
- `statsType`: 'per_game' | 'per_36' | 'total'
- `searchTerm`: string

**Features:**
- Real-time data fetching
- Custom z-score multipliers
- Column sorting
- Responsive design

### `DiscussionCard`
Display component for individual discussions with voting capabilities.

**Features:**
- Subject badges (player/team)
- Vote buttons (upvote/downvote)
- Tag display
- Relative timestamps

### `AutoCompleteSearch`
Search component for player/team lookup (used in discussion creation).

### `ZScoreMultiplierEditor`
UI for customizing z-score category weights.

**Categories:**
- Points, Rebounds, Assists, Steals, Blocks
- Turnovers, FG%, FT%, 3PM

### `Navbar` & `Footer`
Consistent navigation and branding across all pages.

## Configuration

### Environment Variables

Required environment variables (see `.env.example`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
```

### Next.js Configuration

**Key Settings:**
- Image domains: `images.unsplash.com`
- Tempo DevTools integration (optional, via `NEXT_PUBLIC_TEMPO`)
- SWC plugins for Tempo (NextJS 14.1.3 to 14.2.11)

### TypeScript Configuration

**Path Aliases:**
- `@/*` maps to `./src/*`

**Compiler Options:**
- Strict mode enabled
- ES5 target
- ESNext module

## Development Setup

### Prerequisites
- Node.js 20+
- npm or package manager
- Supabase account
- Clerk account

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd RosterGuru
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Fill in your Supabase and Clerk credentials
```

4. Run database migrations
```bash
# Apply Supabase migrations from supabase/migrations/
```

5. Start development server
```bash
npm run dev
```

6. Open browser at `http://localhost:3000`

### Build & Deploy

```bash
# Production build
npm run build

# Start production server
npm start
```

**Deployment Platform:** Vercel (optimized for Next.js)

## Architecture & Patterns

### Data Fetching Strategy
- **Server Components**: Default for data fetching (discussions, player stats)
- **Client Components**: Interactive UI elements (tables, forms, voting)
- **API Routes**: Backend logic for mutations (create discussion, vote)

### Authentication Flow
1. Clerk handles UI and session management
2. Middleware protects routes using `clerkMiddleware()`
3. Supabase users table synced via triggers
4. User ID passed to Supabase for RLS policies

### State Management
- **React Hook Form**: Form state
- **URL State**: Search params, filters, pagination
- **Local State**: UI toggles, modals

### Styling Approach
- Tailwind utility classes for layout
- shadcn/ui components for consistent design
- CSS variables for theming (dark/light mode)
- Responsive design with mobile-first approach

### Z-Score Calculation
Custom weighted z-score algorithm:
```typescript
customZScore = Σ(zscore_category × multiplier_category)
```

Categories include: points, rebounds, assists, steals, blocks, turnovers (negative), FG%, FT%, 3PM

**Default Multipliers:** Equal weight (1.0) for all categories

## Key Development Notes

### Current Branch: `discussion-page`
Active development on discussion forum features.

### Recent Changes
- Added discussion voting system
- Implemented discussion creation dialog
- Added player database with dynamic z-scores
- Integrated Clerk authentication

### Known Issues/TODOs
- Some features marked as "Coming Soon"
- Discussion comment count currently hardcoded to 0
- README.md is empty (needs content)

### Analytics & Monitoring
- Vercel Analytics enabled
- Speed Insights enabled
- Tempo DevTools for debugging (optional)

## File References

**Landing Page:** `src/app/page.tsx:26-236`
**Player Database:** `src/app/playerdatabase/page.tsx:35-291`
**Discussions:** `src/app/discussion/page.tsx:14-102`
**Discussion API:** `src/app/api/discussions/route.ts:5-105`
**Layout:** `src/app/layout.tsx:26-52`
**Middleware:** `src/middleware.ts:1-12`

## Additional Resources

- **Next.js Docs:** https://nextjs.org/docs
- **Supabase Docs:** https://supabase.com/docs
- **Clerk Docs:** https://clerk.com/docs
- **Radix UI:** https://www.radix-ui.com
- **shadcn/ui:** https://ui.shadcn.com
