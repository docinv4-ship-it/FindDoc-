"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Stethoscope, ArrowLeft, Code, Database, Shield, Calendar, MessageSquare,
  Bell, CreditCard, Lock, Server, FolderTree, BookOpen, ChevronRight,
  Settings, Users, FileCheck, Zap, GitBranch, AlertTriangle, Search
} from "lucide-react";

const DOC_SECTIONS = [
  {
    id: "architecture",
    label: "Architecture Overview",
    icon: Server,
    content: `# Architecture Overview

DocFind is a healthcare booking platform built with Next.js 16 (App Router), Supabase (PostgreSQL), and Tailwind CSS v4.

## Tech Stack

- **Frontend**: Next.js 16 with App Router, React 19, TypeScript 5
- **Styling**: Tailwind CSS v4 with custom theme (primary color: #36d1cf teal)
- **Backend**: Supabase (PostgreSQL database, Auth, Storage, Edge Functions)
- **Icons**: lucide-react
- **PWA**: Service worker with web push notifications

## Application Structure

The app has three main user-facing areas:

1. **Public Site** — Landing page, search, doctor profiles, booking flow, help center
2. **Patient Portal** — Appointments, chat, favorites, notifications, reviews
3. **Doctor Portal** — Dashboard, appointments, availability, patients, billing, settings
4. **Admin Panel** — Verification, doctors, clinics, bookings, subscriptions, analytics, settings, feature flags

## Data Flow

- Client components use \`createClient()\` from \`@/lib/supabase/client\` (browser client)
- Server components/APIs use \`createClient()\` from \`@/lib/supabase/server\` (server client with cookies)
- API routes use the service role key for privileged operations (admin actions, audit logs)
- Real-time updates use Supabase realtime subscriptions for chat and notifications

## Authentication

- Supabase Auth with email/password
- Three auth contexts: patient, doctor, admin
- Admin access checked via \`admin_roles\` table or fallback to \`admin@healthcare.com\`
- Session management via HTTP-only cookies (SSR-compatible)
- Middleware refreshes auth tokens on every request`
  },
  {
    id: "folder-structure",
    label: "Folder Structure",
    icon: FolderTree,
    content: `# Folder Structure

\`\`\`
src/
├── app/
│   ├── (public)/          # Public pages
│   │   ├── page.tsx       # Landing page
│   │   ├── about/         # About page
│   │   ├── contact/       # Contact form
│   │   ├── faq/           # FAQ page
│   │   ├── help/          # Help center
│   │   │   ├── page.tsx           # Help home
│   │   │   ├── [slug]/page.tsx     # Article page
│   │   │   └── category/[slug]/    # Category listing
│   │   ├── pricing/       # Pricing page
│   │   ├── privacy/       # Privacy policy
│   │   ├── terms/         # Terms of service
│   │   ├── refund/        # Refund policy
│   │   ├── search/        # Doctor search
│   │   ├── support/       # Support page
│   │   └── clinic/[slug]/ # Clinic profile
│   ├── admin/             # Admin panel
│   │   ├── layout.tsx     # Admin layout with sidebar nav
│   │   ├── page.tsx       # Admin dashboard
│   │   ├── analytics/     # Analytics dashboard
│   │   ├── feature-flags/ # Feature flag management
│   │   ├── settings/      # System configuration
│   │   ├── verification/  # Verification queue
│   │   ├── doctors/       # Doctor management
│   │   ├── clinics/       # Clinic management
│   │   ├── bookings/      # Booking overview
│   │   ├── subscriptions/ # Subscription management
│   │   ├── featured/      # Featured listings
│   │   ├── reports/       # Reports & complaints
│   │   ├── reviews/       # Review moderation
│   │   ├── broadcasts/    # Broadcast messages
│   │   ├── support/       # Support tickets
│   │   ├── roles/         # Roles & permissions
│   │   ├── audit/         # Audit trail
│   │   ├── events/        # Event log
│   │   ├── health/        # System health
│   │   ├── maintenance/   # Maintenance mode
│   │   ├── profile/       # Admin profile
│   │   └── login/         # Admin login
│   ├── doctor/            # Doctor portal
│   │   ├── layout.tsx     # Doctor layout
│   │   ├── dashboard/     # Dashboard
│   │   ├── appointments/  # Appointment management
│   │   ├── availability/  # Availability settings
│   │   ├── patients/      # Patient list
│   │   ├── inbox/         # Chat inbox
│   │   ├── billing/       # Billing & subscription
│   │   ├── reviews/       # Reviews
│   │   ├── settings/      # Settings
│   │   └── ...            # More doctor pages
│   ├── patient/           # Patient portal
│   │   ├── page.tsx       # Find a doctor
│   │   ├── appointments/  # My appointments
│   │   ├── chats/         # Chat conversations
│   │   ├── favorites/     # Favorite doctors
│   │   ├── notifications/ # Notifications
│   │   ├── reviews/       # My reviews
│   │   └── support/       # Patient support
│   ├── api/               # API routes
│   │   ├── admin/         # Admin APIs
│   │   ├── book/          # Booking API
│   │   ├── otp/           # OTP APIs
│   │   ├── chat/          # Chat API
│   │   ├── reviews/       # Reviews API
│   │   ├── events/        # Events API
│   │   ├── health/        # Health check
│   │   └── ...            # More APIs
│   ├── booking/           # Booking flow pages
│   └── doctor/            # Doctor profile pages
├── components/            # Shared components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and config
│   ├── supabase/          # Supabase clients
│   ├── billing/           # Billing logic
│   ├── slots/             # Slot generation
│   ├── feature-flags.ts   # Feature flag utilities
│   ├── settings.ts        # Settings utilities
│   └── ...
├── types/                 # TypeScript types
│   └── database.ts       # Supabase generated types
└── middleware.ts         # Auth + rate limiting middleware
\`\`\``
  },
  {
    id: "database-schema",
    label: "Database Schema",
    icon: Database,
    content: `# Database Schema

## Core Tables

### doctors
- \`id\` (uuid, PK)
- \`user_id\` (uuid, unique, FK to auth.users)
- \`full_name\`, \`email\`, \`phone\`, \`specialization\`
- \`is_verified\` (boolean) — admin verification
- \`is_onboarded\` (boolean) — onboarding complete
- \`profile_image_url\`, \`qualification\`, \`experience_years\`
- \`license_number\`, \`certificates\` (text[])
- Social links: \`facebook_url\`, \`instagram_url\`, \`linkedin_url\`, etc.

### clinics
- \`id\` (uuid, PK)
- \`doctor_id\` (uuid, FK to doctors)
- \`name\`, \`address\`, \`city\`, \`consultation_fee\`
- \`slot_duration\` (int) — appointment length in minutes
- \`booking_mode\` (text) — 'auto' or 'manual'
- \`is_active\` (boolean)

### patients
- \`id\` (uuid, PK)
- \`user_id\` (uuid, unique)
- \`full_name\`, \`email\`, \`phone\`, \`date_of_birth\`

### appointments
- \`id\` (uuid, PK)
- \`doctor_id\`, \`patient_id\`, \`clinic_id\` (FKs)
- \`appointment_date\` (timestamptz)
- \`status\` (text) — pending, confirmed, cancelled, completed, no_show
- \`reason\`, \`notes\`
- \`booking_reference\` (text, unique)

### conversations
- \`id\` (uuid, PK)
- \`doctor_id\`, \`patient_id\` (FKs)
- \`status\` (text) — active, blocked, closed

### messages
- \`id\` (uuid, PK)
- \`conversation_id\` (FK)
- \`sender_id\`, \`receiver_id\`
- \`content\` (text), \`is_read\` (boolean)
- \`attachment_url\` (text, nullable)

## Admin Tables

### admin_roles
- \`id\` (uuid, PK)
- \`user_id\` (uuid)
- \`role\` (text) — super_admin, admin, viewer
- \`permissions\` (jsonb)

### verification_requests
- \`id\`, \`doctor_id\`, \`status\` (pending/approved/rejected/resubmit)
- \`submitted_at\`, \`reviewed_at\`, \`reviewer_id\`

### verification_documents
- \`id\`, \`verification_request_id\`, \`document_type\`, \`file_url\`

### audit_logs
- \`id\`, \`admin_id\`, \`action\`, \`entity_type\`, \`entity_id\`
- \`before_data\`, \`after_data\` (jsonb)
- \`ip_address\`, \`user_agent\`

### platform_settings
- \`key\` (text, PK)
- \`value\` (jsonb)
- \`description\` (text)

### feature_flags
- \`id\`, \`key\` (unique), \`label\`, \`description\`
- \`is_enabled\` (boolean), \`category\`, \`is_system\`

### reports
- \`id\`, \`reporter_id\`, \`reported_id\`, \`reason\`, \`status\`

### support_tickets
- \`id\`, \`user_id\`, \`subject\`, \`status\` (open/in_progress/resolved/closed)
- \`priority\`, \`category\`

### support_ticket_messages
- \`id\`, \`ticket_id\`, \`sender_id\`, \`content\`

## Billing Tables

### subscription_plans
- \`id\`, \`name\`, \`price_monthly\`, \`price_yearly\`, \`features\` (jsonb)

### doctor_subscriptions
- \`id\`, \`doctor_id\`, \`plan_id\`, \`status\` (active/trial/expired/suspended)
- \`billing_cycle\`, \`current_period_end\`

### featured_listings
- \`id\`, \`doctor_id\`, \`status\` (active/expired/inactive)
- \`expires_at\` (timestamptz)

### billing_events
- \`id\`, \`doctor_id\`, \`event_type\`, \`amount\`, \`currency\`

## Help Center Tables

### help_categories
- \`id\`, \`slug\` (unique), \`name\`, \`description\`, \`icon\`, \`display_order\`

### help_articles
- \`id\`, \`category_id\` (FK), \`slug\` (unique), \`title\`, \`content\` (markdown)
- \`summary\`, \`tags\` (text[]), \`is_published\`, \`view_count\`

### help_feedback
- \`id\`, \`article_id\` (FK), \`is_helpful\` (boolean), \`comment\`, \`user_identifier\`

## Events & Notifications

### events
- \`id\`, \`event_type\`, \`entity_type\`, \`entity_id\`, \`metadata\` (jsonb)

### notification_queue
- \`id\`, \`user_id\`, \`notification_type\`, \`payload\` (jsonb), \`status\`

## RLS Policies

All tables have RLS enabled. Access patterns:
- **Patient data**: owner-scoped via \`auth.uid()\`
- **Doctor data**: owner-scoped via \`auth.uid() = user_id\`
- **Admin tables**: admin-only via \`admin_roles\` check
- **Public data** (help articles, feature flags): readable by anon + authenticated`
  },
  {
    id: "api-overview",
    label: "API Overview",
    icon: Code,
    content: `# API Overview

All API routes are in \`src/app/api/\`. They use Next.js Route Handlers.

## Admin APIs

### \`/api/admin/auth\` (GET)
Checks if the current user has admin access. Returns \`{ authorized, role, permissions, adminId }\`.

### \`/api/admin/audit\` (GET, POST)
- GET: Fetch audit logs with filters (entity_type, action, admin_id, limit, offset)
- POST: Create audit log entry

### \`/api/admin/verification/[id]\` (GET, PATCH)
- GET: Fetch verification request details
- PATCH: Approve/reject/resubmit verification

### \`/api/admin/analytics\` (GET)
Returns analytics data: summary counts, trends, specializations, subscription status, recent events.
Query params: \`start_date\`, \`end_date\` (ISO strings)

### \`/api/admin/feature-flags\` (GET, POST, PATCH, DELETE)
- GET: List all feature flags
- POST: Create new flag (key, label, description, category, is_enabled)
- PATCH: Update flag (id, is_enabled, label, description, category)
- DELETE: Delete non-system flag (id)

### \`/api/admin/settings\` (GET, PUT, POST)
- GET: List all platform settings
- PUT: Batch update settings ({ settings: { key: value } })
- POST: Create new setting (key, value, description)

## Booking APIs

### \`/api/book\` (POST)
Create a new appointment. Validates slot availability, creates booking.

### \`/api/appointment/[id]\` (GET, PATCH)
- GET: Fetch appointment details
- PATCH: Update appointment status

### \`/api/appointment/[id]/cancel\` (POST)
Cancel an appointment with OTP verification.

### \`/api/appointment/[id]/reschedule\` (POST)
Reschedule an appointment to a new time slot.

### \`/api/booking/reference/[id]\` (GET)
Look up a booking by reference ID.

### \`/api/bookings/lookup\` (POST)
Look up bookings by phone number with OTP.

## OTP APIs

### \`/api/otp/send\` (POST)
Send OTP to a phone number.

### \`/api/otp/verify\` (POST)
Verify OTP code.

## Chat APIs

### \`/api/chat/start\` (POST)
Start a new conversation between patient and doctor.

### \`/api/conversations\` (GET)
List conversations for the current user.

### \`/api/messages\` (GET, POST)
- GET: List messages in a conversation
- POST: Send a message

## Other APIs

### \`/api/events\` (GET)
List system events with filtering.

### \`/api/notifications\` (GET)
List notifications for the current user.

### \`/api/notifications/read-all\` (POST)
Mark all notifications as read.

### \`/api/reviews\` (GET, POST)
- GET: List reviews
- POST: Submit a review

### \`/api/search\` (GET)
Search doctors by name, specialization, city.

### \`/api/search/autocomplete\` (GET)
Autocomplete suggestions for search.

### \`/api/slots\` (GET)
Get available time slots for a doctor.

### \`/api/health\` (GET)
System health check endpoint.

### \`/api/maintenance\` (GET, POST)
Get/set maintenance mode.

### \`/api/contact\` (POST)
Submit contact form.

### \`/api/support\` (POST)
Submit support ticket.

### \`/api/help/feedback\` (POST)
Submit help article feedback.

### \`/api/push-token\` (POST)
Register push notification token.

### \`/api/consent\` (POST)
Record cookie consent.

### \`/api/errors\` (POST)
Client-side error reporting.

### \`/api/user/block\` (POST)
Block a user from chat.

### \`/api/user/report\` (POST)
Report a user.

### \`/api/unread-count\` (GET)
Get unread message/notification counts.

### \`/api/billing/checkout\` (POST)
Create checkout session for subscription.

### \`/api/billing/webhook\` (POST)
Webhook handler for billing provider.`
  },
  {
    id: "auth-flow",
    label: "Auth Flow",
    icon: Shield,
    content: `# Authentication Flow

## Overview

DocFind uses Supabase Auth with email/password. Three separate auth contexts exist: patient, doctor, and admin.

## Doctor Auth Flow

1. **Sign Up** (\`/doctor/signup\`): User enters name, email, password
2. **Email Verification** (\`/doctor/verify-email\`): User verifies email
3. **Onboarding** (\`/doctor/onboarding\`): Complete profile (specialization, qualifications, etc.)
4. **Login** (\`/doctor/login\`): Email/password sign in
5. **Forgot Password** (\`/doctor/forgot-password\` → \`/doctor/reset-password\`): Password reset flow

## Patient Auth Flow

Patients can book as guests (OTP verification) or create accounts:
1. **Guest Booking**: Enter phone → OTP verify → Book appointment
2. **Account Creation**: Sign up with email/phone → OTP verify → Set password

## Admin Auth Flow

1. **Login** (\`/admin/login\`): Email/password
2. **Auth Check** (\`/api/admin/auth\`): Verifies admin role in \`admin_roles\` table
3. **Fallback**: If user email is \`admin@healthcare.com\`, auto-creates \`super_admin\` role
4. **Session**: Admin layout checks auth on every page load via \`/api/admin/auth\`

## Session Management

- Supabase SSR handles session via HTTP-only cookies
- \`src/middleware.ts\` refreshes the session token on every request
- \`src/lib/supabase/server.ts\`: Server-side client with cookie handling
- \`src/lib/supabase/client.ts\`: Browser client singleton
- \`src/lib/supabase/middleware.ts\`: Session refresh logic

## Access Control

- **RLS Policies**: Database-level access control on every table
- **API Guards**: API routes check auth before processing
- **Layout Guards**: Admin and doctor layouts check auth and redirect if unauthorized
- **Role-based**: Admin roles (super_admin, admin, viewer) with different permissions

## Security Features

- Session timeout via \`SessionTimeoutProvider\`
- Rate limiting via \`src/lib/rate-limit.ts\`
- OTP verification for sensitive actions
- Audit logging for admin actions`
  },
  {
    id: "booking-flow",
    label: "Booking Flow",
    icon: Calendar,
    content: `# Booking Flow

## Overview

The booking system allows patients to book appointments with doctors. Two modes exist: auto-confirm and manual approval.

## Flow Steps

1. **Search**: Patient searches for doctors (\`/search\` or \`/patient\`)
2. **View Profile**: Patient views doctor profile (\`/doctor/[id]\`)
3. **Select Slot**: Patient selects an available time slot
   - Slots fetched from \`/api/slots\` (generated by \`src/lib/slots/generator.ts\`)
   - Generator considers: working hours, breaks, holidays, overrides, existing bookings
4. **Enter Details**: Patient enters name, phone, reason for visit
5. **OTP Verification**:
   - \`/api/otp/send\` sends OTP to phone
   - \`/api/otp/verify\` verifies the code
6. **Create Booking**: \`/api/book\` creates the appointment
   - Checks slot availability (race condition prevention via \`check_booking_conflict()\`)
   - Creates appointment record with status 'pending' or 'confirmed'
   - Generates unique booking reference ID
7. **Confirmation**: Patient sees success page (\`/booking/success\`)
8. **Notification**: Doctor and patient receive notifications

## Booking Statuses

- \`pending\`: Awaiting doctor confirmation (manual mode)
- \`confirmed\`: Booking confirmed (auto mode or doctor approved)
- \`cancelled\`: Cancelled by patient or doctor
- \`completed\`: Appointment completed
- \`no_show\`: Patient didn't show up

## Slot Generation

\`src/lib/slots/generator.ts\` generates available slots:
1. Get doctor's working hours for the selected day
2. Subtract break periods
3. Subtract holiday periods
4. Subtract availability overrides
5. Subtract existing bookings
6. Return available time slots

## Cancellation

- Patient can cancel via \`/api/appointment/[id]/cancel\`
- Requires OTP verification for guest bookings
- Cancellation cutoff: configurable via platform settings (\`cancellation_cutoff_hours\`)

## Rescheduling

- Patient can reschedule via \`/api/appointment/[id]/reschedule\`
- Selects new slot, old slot is freed
- Doctor must confirm if in manual mode`
  },
  {
    id: "chat-flow",
    label: "Chat Flow",
    icon: MessageSquare,
    content: `# Chat Flow

## Overview

DocFind includes a real-time messaging system between doctors and patients.

## Starting a Conversation

1. Patient visits a doctor's profile or appointment
2. Clicks "Chat" or "Message"
3. \`/api/chat/start\` creates a conversation record
4. Conversation status: 'active'

## Sending Messages

1. User types a message in the chat UI
2. \`POST /api/messages\` saves the message
3. Supabase realtime broadcasts the insert
4. Other party receives the message in real-time

## Message Structure

- \`conversation_id\`: Links to conversation
- \`sender_id\` / \`receiver_id\`: Message direction
- \`content\`: Text content
- \`is_read\`: Read receipt flag
- \`attachment_url\`: Optional file attachment

## Real-time Updates

- Supabase realtime subscription on \`messages\` table
- Filtered by \`conversation_id\`
- Typing indicators via \`src/hooks/useTypingIndicator.ts\`

## File Uploads

- \`src/components/ChatFileUpload.tsx\` handles file uploads
- Files stored in Supabase Storage
- Max size: 10MB (configurable via platform settings)
- Allowed types: JPEG, PNG, PDF

## Blocking & Reporting

- Users can block each other (\`/api/user/block\`)
- Users can report abuse (\`/api/user/report\`)
- Blocked users cannot send messages
- Reports go to admin moderation queue

## Unread Count

- \`/api/unread-count\` returns total unread messages + notifications
- Used by bottom nav badge and notification icons`
  },
  {
    id: "notification-flow",
    label: "Notification Flow",
    icon: Bell,
    content: `# Notification Flow

## Overview

DocFind sends notifications for appointments, messages, and system events.

## Notification Types

### Appointment Notifications
- Booking confirmed
- Booking pending (manual mode)
- Booking rejected
- Booking cancelled
- Appointment reminder (24h and 2h before)
- Appointment completed
- No-show marked

### Chat Notifications
- New message received

### System Notifications
- Doctor verified
- Review submitted
- Subscription updated
- Featured status changed
- Broadcast message received

## Delivery Channels

1. **In-App**: Notification bell icon, viewable at \`/patient/notifications\` or \`/doctor/notifications\`
2. **Push**: Web push notifications via PWA (\`src/components/PWAProvider.tsx\`)
3. **Email**: Email notifications (if enabled in settings)

## Notification Queue

- \`notification_queue\` table stores pending notifications
- \`supabase/functions/process-notifications/index.ts\` processes the queue
- Push tokens registered via \`/api/push-token\`

## Notification Preferences

- Patients: \`/patient/notifications/preferences\`
- Doctors: \`/doctor/settings\`
- Toggle individual notification types
- Choose delivery channels (push, email)

## Real-time Updates

- Supabase realtime subscription on notifications table
- Bell icon updates live with unread count
- \`/api/notifications/read-all\` marks all as read`
  },
  {
    id: "subscription-flow",
    label: "Subscription Flow",
    icon: CreditCard,
    content: `# Subscription Flow

## Overview

Doctors can subscribe to paid plans for premium features. Billing is handled via Paddle integration.

## Plans

1. **Trial** (Free, 14 days): Basic features
2. **Basic** ($19.99/mo or $199.99/yr): Full profile, chat, auto-confirm
3. **Pro** ($49.99/mo or $499.99/yr): Analytics, broadcasts, priority support
4. **Featured Add-On** ($9.99/mo or $99.99/yr): Featured placement in search

## Subscription Lifecycle

1. **Trial**: New doctors get 14-day free trial
2. **Active**: Paid subscription running
3. **Past Due**: Payment failed, in grace period (7 days)
4. **Expired**: Subscription ended
5. **Suspended**: Admin suspended subscription

## Billing Flow

1. Doctor visits \`/doctor/billing\`
2. Selects a plan and billing cycle
3. \`/api/billing/checkout\` creates a checkout session
4. Payment processed by Paddle (\`src/lib/billing/paddle.ts\`)
5. \`/api/billing/webhook\` receives payment confirmation
6. Subscription record updated in \`doctor_subscriptions\`

## Feature Access

- \`check_feature_access()\` database function checks subscription status
- Used to gate premium features (analytics, broadcasts, etc.)

## Admin Management

- Admins can view all subscriptions at \`/admin/subscriptions\`
- Can extend trials, activate, suspend subscriptions
- Can export subscription data as CSV

## Featured Listings

- Separate from subscriptions
- Purchased as an add-on
- \`featured_listings\` table tracks status and expiry
- \`expire_featured_listings()\` database function auto-expires listings`
  },
  {
    id: "admin-flow",
    label: "Admin Flow",
    icon: Lock,
    content: `# Admin Flow

## Overview

The admin panel manages all platform operations: verification, moderation, billing, and system configuration.

## Access Control

1. **Login**: \`/admin/login\` with email/password
2. **Auth Check**: \`/api/admin/auth\` verifies admin role
3. **Roles**: super_admin, admin, viewer
4. **Permissions**: JSON object in \`admin_roles.permissions\`
5. **Layout Guard**: \`src/app/admin/layout.tsx\` checks auth on every page

## Admin Sections

### Dashboard (\`/admin\`)
- Overview stats: doctors, appointments, subscriptions, reports
- Quick actions: verifications, reports, support
- System health indicator

### Analytics (\`/admin/analytics\`)
- Live counts, trends, charts
- Date range filters
- Export-ready CSV data
- Specialization distribution
- Subscription status breakdown

### Verification (\`/admin/verification\`)
- Queue of pending doctor verifications
- Review documents, approve/reject/resubmit
- File preview modal

### Doctors (\`/admin/doctors\`)
- List all doctors
- Toggle onboarding status

### Clinics (\`/admin/clinics\`)
- View all clinics (read-only)

### Bookings (\`/admin/bookings\`)
- View all appointments (read-only)

### Subscriptions (\`/admin/subscriptions\`)
- View/manage doctor subscriptions
- Extend trials, activate, suspend
- CSV export

### Featured (\`/admin/featured\`)
- Manage featured listings
- Activate, extend, deactivate

### Reports (\`/admin/reports\`)
- Handle user complaints
- Status updates, resolution

### Reviews (\`/admin/reviews\`)
- Moderate patient reviews
- Toggle visibility, delete

### Broadcasts (\`/admin/broadcasts\`)
- Create/delete broadcast messages

### Support (\`/admin/support\`)
- Manage support tickets
- Reply to users

### Roles (\`/admin/roles\`)
- Create/edit/delete admin roles
- 10 configurable permissions

### Audit (\`/admin/audit\`)
- View all admin actions
- Filter by action type, entity type
- JSON export

### Events (\`/admin/events\`)
- System event log
- Filter by event type

### Health (\`/admin/health\`)
- Real-time system health monitoring
- Database, auth, storage, API checks

### Feature Flags (\`/admin/feature-flags\`)
- Toggle modules on/off
- Create custom flags
- Grouped by category

### Settings (\`/admin/settings\`)
- Database-backed platform configuration
- Booking rules, billing, notifications, security
- Add custom settings

### Maintenance (\`/admin/maintenance\`)
- Toggle maintenance mode
- Set maintenance message`
  },
  {
    id: "feature-flags",
    label: "Feature Flags",
    icon: Zap,
    content: `# Feature Flags System

## Overview

Feature flags allow toggling modules on/off without code changes. They are stored in the \`feature_flags\` table and managed via the admin panel.

## Database Schema

\`\`\`sql
CREATE TABLE feature_flags (
  id uuid PRIMARY KEY,
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  is_enabled boolean DEFAULT false,
  category text DEFAULT 'General',
  is_system boolean DEFAULT false,
  created_at timestamptz,
  updated_at timestamptz
);
\`\`\`

## Server-side Usage

\`\`\`typescript
import { isFeatureEnabled, getFeatureFlags } from "@/lib/feature-flags";

// Check a single flag
const bookingEnabled = await isFeatureEnabled("booking_enabled");
if (!bookingEnabled) return NextResponse.json({ error: "Booking disabled" }, { status: 403 });

// Get all flags
const flags = await getFeatureFlags();
\`\`\`

## Client-side Usage

For client components, fetch flags from the API:

\`\`\`typescript
const res = await fetch("/api/admin/feature-flags");
const { flags } = await res.json();
\`\`\`

Or use the Supabase client directly:

\`\`\`typescript
const supabase = createClient();
const { data } = await supabase.from("feature_flags").select("key, is_enabled");
\`\`\`

## Admin Management

- **UI**: \`/admin/feature-flags\`
- **API**: \`/api/admin/feature-flags\` (GET, POST, PATCH, DELETE)
- Flags are grouped by category
- System flags (\`is_system = true\`) cannot be deleted, only toggled
- Custom flags can be created with any key, label, and category

## Default Flags

| Key | Category | Default |
|-----|----------|---------|
| booking_enabled | Booking | true |
| chat_enabled | Communication | true |
| subscriptions_enabled | Billing | true |
| featured_listings_enabled | Billing | true |
| guest_booking_enabled | Booking | true |
| patient_accounts_enabled | Authentication | true |
| doctor_signup_enabled | Authentication | true |
| reviews_enabled | Engagement | true |
| broadcasts_enabled | Communication | true |
| auto_confirm_bookings | Booking | false |
| push_notifications_enabled | Notifications | true |
| email_notifications_enabled | Notifications | true |
| analytics_dashboard_enabled | Admin | true |
| help_center_enabled | Admin | true |
| maintenance_mode | System | false |

## Caching

- Server-side flags are cached for 30 seconds
- \`clearFlagCache()\` clears the cache after updates
- RLS allows anon + authenticated SELECT, admin-only write`
  },
  {
    id: "deployment",
    label: "Deployment Guide",
    icon: GitBranch,
    content: `# Deployment Guide

## Environment Variables

Required environment variables (pre-populated in \`.env\`):

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-key>
SUPABASE_DB_URL=postgresql://...
\`\`\`

## Build Commands

\`\`\`bash
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
\`\`\`

## Database Migrations

Migrations are applied via the Supabase MCP \`apply_migration\` tool. Migration files are in \`supabase/migrations/\` for reference, but are NOT automatically applied — they must be run through the MCP tool.

## Edge Functions

Edge functions are deployed via the Supabase MCP \`deploy_edge_function\` tool. Source files are in \`supabase/functions/\`.

### Deployed Functions
- \`cleanup-files\`: Cleans up expired temporary files
- \`process-notifications\`: Processes the notification queue and sends push notifications

## PWA Configuration

- \`public/manifest.json\`: PWA manifest
- \`public/sw.js\`: Service worker
- \`src/components/PWAProvider.tsx\`: PWA setup and push notification registration

## SEO

- \`src/app/robots.ts\`: Robots.txt generation
- \`src/app/sitemap.ts\`: Sitemap generation
- \`src/components/StructuredData.tsx\`: Structured data for SEO
- \`src/components/CanonicalUrl.tsx\`: Canonical URL management

## Middleware

\`src/middleware.ts\` handles:
- Rate limiting (via \`src/lib/rate-limit.ts\`)
- Supabase session refresh
- Runs on all routes except static assets`
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    icon: AlertTriangle,
    content: `# Troubleshooting

## Common Issues

### Build Fails

1. **Type errors**: Run \`npm run lint\` to check
2. **Missing dependencies**: Run \`npm install\`
3. **Supabase types**: Ensure \`src/types/database.ts\` matches your schema

### Database Connection Issues

1. Check \`.env\` has correct \`NEXT_PUBLIC_SUPABASE_URL\` and keys
2. Verify Supabase project is not paused
3. Check RLS policies aren't blocking access
4. Use \`/api/health\` endpoint to check connection

### RLS Policy Issues

- If data appears empty in the app but exists in the database:
  - Check if the table has an \`anon\` SELECT policy (for no-auth pages)
  - Check if the table has an \`authenticated\` SELECT policy with ownership check
  - Use \`execute_sql\` MCP tool to verify data exists (note: this bypasses RLS)
  - The only real test is reading through the anon-key client

### Auth Issues

- **Doctor can't log in**: Check if email is verified, check \`doctors\` table
- **Admin can't access panel**: Check \`admin_roles\` table or fallback email
- **Session expires**: Check \`session_timeout_minutes\` setting
- **OTP not received**: Check phone number format, check OTP table

### Real-time Not Working

1. Check Supabase realtime is enabled for the table
2. Check the subscription filter matches
3. Check network connection
4. Check browser console for WebSocket errors

### Push Notifications Not Working

1. Check \`push_notifications_enabled\` feature flag
2. Check push token is registered (\`/api/push-token\`)
3. Check browser notification permissions
4. Check PWA is installed
5. Check \`process-notifications\` edge function is deployed

### File Upload Fails

1. Check file size (max 10MB, configurable)
2. Check file type (JPEG, PNG, PDF only)
3. Check Supabase Storage bucket exists and has correct policies
4. Check network connection

### Booking Conflicts

- The \`check_booking_conflict()\` database function prevents double-booking
- If slots show available but booking fails, another patient may have just booked
- Refresh the page to get updated availability

### Performance Issues

1. Check if rate limiting is too aggressive (\`rate_limit_api_per_minute\`)
2. Check for N+1 queries in API routes
3. Check if indexes exist on frequently queried columns
4. Check if Supabase connection pool is exhausted

### Edge Function Issues

1. Check CORS headers are included in all responses
2. Check environment variables are set as secrets
3. Check function logs in Supabase dashboard
4. Ensure imports use \`npm:\` or \`jsr:\` prefixes
5. Check \`Deno.serve\` is used (not imported \`serve\`)`
  },
];

function renderMarkdown(md: string): string {
  let html = md;
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto my-4 text-sm"><code>$2</code></pre>');
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-3">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4">$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>');
  html = html.replace(/^\| (.*)\|$/gm, (match) => {
    const cells = match.split('|').filter(c => c.trim());
    if (cells[0]?.includes('---')) return '';
    return `<tr>${cells.map(c => `<td class="border border-gray-200 px-3 py-1.5 text-sm">${c.trim()}</td>`).join('')}</tr>`;
  });
  html = html.replace(/^(\d+)\. (.*$)/gm, '<li class="ml-6 list-decimal text-gray-700">$2</li>');
  html = html.replace(/^- (.*$)/gm, '<li class="ml-6 list-disc text-gray-700">$1</li>');
  html = html.replace(/\n\n/g, '</p><p class="text-gray-700 leading-relaxed mt-2">');
  html = '<p class="text-gray-700 leading-relaxed">' + html + '</p>';
  return html;
}

export default function DeveloperDocsPage() {
  const [activeSection, setActiveSection] = useState(0);
  const [search, setSearch] = useState("");

  const filteredSections = search.trim()
    ? DOC_SECTIONS.filter(s => s.label.toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase()))
    : DOC_SECTIONS;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">DocFind</span>
                <span className="text-xs text-gray-500 block">Developer Documentation</span>
              </div>
            </Link>
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-20 self-start">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search docs..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": "#36d1cf" } as React.CSSProperties}
                />
              </div>
              <nav className="space-y-0.5">
                {filteredSections.map((section, idx) => {
                  const Icon = section.icon;
                  const realIdx = DOC_SECTIONS.indexOf(section);
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(realIdx)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                        activeSection === realIdx ? "" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                      style={activeSection === realIdx ? { backgroundColor: "#e6faf9", color: "#239999" } : {}}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
              {(() => {
                const Icon = DOC_SECTIONS[activeSection].icon;
                return <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                  <Icon className="w-5 h-5" style={{ color: "#36d1cf" }} />
                </div>;
              })()}
              <h1 className="text-2xl font-bold text-gray-900">{DOC_SECTIONS[activeSection].label}</h1>
            </div>
            <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(DOC_SECTIONS[activeSection].content) }} />

            {/* Navigation */}
            <div className="mt-12 pt-6 border-t border-gray-200 flex items-center justify-between">
              {activeSection > 0 ? (
                <button
                  onClick={() => setActiveSection(activeSection - 1)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" /> {DOC_SECTIONS[activeSection - 1].label}
                </button>
              ) : <div />}
              {activeSection < DOC_SECTIONS.length - 1 ? (
                <button
                  onClick={() => setActiveSection(activeSection + 1)}
                  className="flex items-center gap-2 text-sm font-medium hover:transition-colors"
                  style={{ color: "#239999" }}
                >
                  {DOC_SECTIONS[activeSection + 1].label} <ChevronRight className="w-4 h-4" />
                </button>
              ) : <div />}
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-sm">© 2026 DocFind. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
