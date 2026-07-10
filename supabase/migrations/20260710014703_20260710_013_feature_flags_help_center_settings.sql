/*
# Feature Flags, Help Center, and Expanded System Settings

## Overview
This migration adds three new capabilities:
1. A feature flag system for toggling modules on/off without code changes
2. A help center with categories, articles, and user feedback
3. Expanded default platform settings for the system configuration panel

## New Tables
- feature_flags: DB-backed toggles for modules (key, label, description, is_enabled, category, is_system)
- help_categories: Help center category navigation (slug, name, description, icon, display_order)
- help_articles: Help articles with markdown content (category_id, slug, title, content, summary, tags, is_published, view_count)
- help_feedback: User feedback on articles (article_id, is_helpful, comment, user_identifier)

## Security
- feature_flags: anon + authenticated SELECT; admin-only INSERT/UPDATE/DELETE (via admin_roles check)
- help_categories: anon + authenticated SELECT; admin-only write
- help_articles: published articles readable by anon + authenticated; admin can see all; admin-only write
- help_feedback: anon + authenticated INSERT; admin-only SELECT/DELETE

## Default Data
- 15 feature flags covering all major modules
- 13 help categories
- ~25 help articles covering all requested topics
- 20 expanded platform_settings defaults (values as JSON)
*/

-- ============================================================
-- FEATURE FLAGS
-- ============================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT false,
  category text NOT NULL DEFAULT 'General',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_feature_flags" ON feature_flags;
CREATE POLICY "select_feature_flags" ON feature_flags FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_feature_flags" ON feature_flags;
CREATE POLICY "anon_select_feature_flags" ON feature_flags FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "insert_feature_flags_admin" ON feature_flags;
CREATE POLICY "insert_feature_flags_admin" ON feature_flags FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admin_roles WHERE admin_roles.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_feature_flags_admin" ON feature_flags;
CREATE POLICY "update_feature_flags_admin" ON feature_flags FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_roles WHERE admin_roles.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admin_roles WHERE admin_roles.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_feature_flags_admin" ON feature_flags;
CREATE POLICY "delete_feature_flags_admin" ON feature_flags FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_roles WHERE admin_roles.user_id = auth.uid())
  );

-- ============================================================
-- HELP CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS help_categories (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'BookOpen',
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_help_categories" ON help_categories;
CREATE POLICY "anon_select_help_categories" ON help_categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_help_categories_admin" ON help_categories;
CREATE POLICY "insert_help_categories_admin" ON help_categories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admin_roles WHERE admin_roles.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_help_categories_admin" ON help_categories;
CREATE POLICY "update_help_categories_admin" ON help_categories FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_roles WHERE admin_roles.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admin_roles WHERE admin_roles.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_help_categories_admin" ON help_categories;
CREATE POLICY "delete_help_categories_admin" ON help_categories FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_roles WHERE admin_roles.user_id = auth.uid())
  );

-- ============================================================
-- HELP ARTICLES
-- ============================================================

CREATE TABLE IF NOT EXISTS help_articles (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  category_id uuid REFERENCES help_categories(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  summary text,
  tags text[] DEFAULT '{}',
  display_order int DEFAULT 0,
  is_published boolean DEFAULT true,
  view_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_published_help_articles" ON help_articles;
CREATE POLICY "anon_select_published_help_articles" ON help_articles FOR SELECT
  TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "admin_select_all_help_articles" ON help_articles;
CREATE POLICY "admin_select_all_help_articles" ON help_articles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_roles WHERE admin_roles.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_help_articles_admin" ON help_articles;
CREATE POLICY "insert_help_articles_admin" ON help_articles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admin_roles WHERE admin_roles.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_help_articles_admin" ON help_articles;
CREATE POLICY "update_help_articles_admin" ON help_articles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_roles WHERE admin_roles.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admin_roles WHERE admin_roles.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_help_articles_admin" ON help_articles;
CREATE POLICY "delete_help_articles_admin" ON help_articles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_roles WHERE admin_roles.user_id = auth.uid())
  );

-- ============================================================
-- HELP FEEDBACK
-- ============================================================

CREATE TABLE IF NOT EXISTS help_feedback (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  article_id uuid REFERENCES help_articles(id) ON DELETE CASCADE,
  is_helpful boolean NOT NULL,
  comment text,
  user_identifier text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE help_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_help_feedback" ON help_feedback;
CREATE POLICY "anon_insert_help_feedback" ON help_feedback FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_select_help_feedback" ON help_feedback;
CREATE POLICY "admin_select_help_feedback" ON help_feedback FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_roles WHERE admin_roles.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_delete_help_feedback" ON help_feedback;
CREATE POLICY "admin_delete_help_feedback" ON help_feedback FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_roles WHERE admin_roles.user_id = auth.uid())
  );

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_help_categories_slug ON help_categories(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_published ON help_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_help_feedback_article ON help_feedback(article_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_help_categories_updated_at ON help_categories;
CREATE TRIGGER update_help_categories_updated_at BEFORE UPDATE ON help_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_help_articles_updated_at ON help_articles;
CREATE TRIGGER update_help_articles_updated_at BEFORE UPDATE ON help_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DEFAULT FEATURE FLAGS
-- ============================================================

INSERT INTO feature_flags (key, label, description, is_enabled, category, is_system) VALUES
  ('booking_enabled', 'Online Booking', 'Allow patients to book appointments online', true, 'Booking', true),
  ('chat_enabled', 'Doctor-Patient Chat', 'Enable direct messaging between doctors and patients', true, 'Communication', true),
  ('subscriptions_enabled', 'Subscription Plans', 'Enable paid subscription plans for doctors', true, 'Billing', true),
  ('featured_listings_enabled', 'Featured Listings', 'Allow doctors to purchase featured placement', true, 'Billing', true),
  ('guest_booking_enabled', 'Guest Booking', 'Allow booking without an account (OTP verification)', true, 'Booking', true),
  ('patient_accounts_enabled', 'Patient Accounts', 'Allow patients to create accounts', true, 'Authentication', true),
  ('doctor_signup_enabled', 'Doctor Sign-Up', 'Allow new doctors to register', true, 'Authentication', true),
  ('reviews_enabled', 'Patient Reviews', 'Allow patients to leave reviews after appointments', true, 'Engagement', true),
  ('broadcasts_enabled', 'Broadcast Messages', 'Allow doctors to send broadcast messages to patients', true, 'Communication', true),
  ('auto_confirm_bookings', 'Auto-Confirm Bookings', 'Automatically confirm bookings without doctor approval', false, 'Booking', false),
  ('push_notifications_enabled', 'Push Notifications', 'Enable push notifications for mobile devices', true, 'Notifications', true),
  ('email_notifications_enabled', 'Email Notifications', 'Enable email notifications for all users', true, 'Notifications', true),
  ('analytics_dashboard_enabled', 'Analytics Dashboard', 'Show analytics dashboard in admin panel', true, 'Admin', true),
  ('help_center_enabled', 'Help Center', 'Enable public help center and documentation', true, 'Admin', true),
  ('maintenance_mode', 'Maintenance Mode', 'Put the platform in maintenance mode (blocks non-admin access)', false, 'System', true)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- DEFAULT HELP CATEGORIES
-- ============================================================

INSERT INTO help_categories (slug, name, description, icon, display_order) VALUES
  ('getting-started', 'Getting Started', 'New to DocFind? Start here to learn the basics', 'Rocket', 1),
  ('sign-up-login', 'Sign Up & Login', 'Account creation, authentication, and password help', 'LogIn', 2),
  ('doctor-guide', 'Doctor Guide', 'Everything doctors need to manage their practice', 'Stethoscope', 3),
  ('patient-guide', 'Patient Guide', 'How patients can find and book doctors', 'User', 4),
  ('booking-guide', 'Booking Guide', 'Step-by-step appointment booking instructions', 'Calendar', 5),
  ('chat-guide', 'Chat Guide', 'Using the doctor-patient messaging system', 'MessageCircle', 6),
  ('subscription-guide', 'Subscription Guide', 'Plans, billing, and subscription management', 'CreditCard', 7),
  ('featured-guide', 'Featured Guide', 'How to get featured placement on DocFind', 'Star', 8),
  ('verification-guide', 'Verification Guide', 'Doctor verification process and requirements', 'FileCheck', 9),
  ('troubleshooting', 'Troubleshooting', 'Common issues and how to fix them', 'Wrench', 10),
  ('notifications', 'Notifications', 'Managing your notification preferences', 'Bell', 11),
  ('security', 'Security', 'Account security and data protection', 'Shield', 12),
  ('contact-support', 'Contact Support', 'Get help from our support team', 'Headphones', 13)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- DEFAULT HELP ARTICLES
-- ============================================================

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'what-is-docfind', 'What is DocFind?', 'An overview of the DocFind healthcare booking platform',
'# What is DocFind?

DocFind is a healthcare booking platform that connects patients with verified doctors. Our mission is to make healthcare accessible by allowing patients to find doctors, check real-time availability, and book appointments instantly — no waiting rooms, no phone calls.

## Key Features

- **Search & Find**: Search for doctors by specialization, city, or name
- **Real-Time Availability**: See live appointment slots
- **Instant Booking**: Book appointments in seconds
- **Doctor-Patient Chat**: Message your doctor before or after visits
- **Reviews & Ratings**: Read reviews from verified patients
- **Featured Listings**: Discover top-rated featured doctors

## Who Can Use DocFind?

- **Patients**: Anyone looking to book a medical appointment
- **Doctors**: Healthcare professionals wanting to manage their practice online
- **Guests**: You can book without an account using OTP verification

Get started by visiting our [Find a Doctor](/patient) page or [sign up as a doctor](/doctor/signup).',
  ARRAY['overview', 'introduction', 'basics'], 1, true
FROM help_categories c WHERE c.slug = 'getting-started'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'how-to-book-first-appointment', 'How to Book Your First Appointment', 'A step-by-step guide to booking your first appointment',
'# How to Book Your First Appointment

Booking an appointment on DocFind is quick and easy. Follow these steps:

## Step 1: Find a Doctor

Go to [Find a Doctor](/patient) and use the search bar to search by:
- Doctor name
- Specialization (e.g., Cardiology, Dermatology)
- City or location

## Step 2: View Doctor Profile

Click on a doctor card to see their profile, including:
- Qualifications and experience
- Clinic location and consultation fee
- Available time slots
- Patient reviews

## Step 3: Select a Time Slot

Choose an available slot from the calendar. Slots are shown in real-time, so you only see slots that are actually open.

## Step 4: Enter Your Details

Fill in your information:
- Full name
- Phone number (for OTP verification)
- Reason for visit (optional)
- Any notes for the doctor

## Step 5: Verify with OTP

You will receive a one-time password (OTP) on your phone. Enter it to confirm your booking.

## Step 6: Confirmation

Once verified, your appointment is confirmed. You will receive a booking reference ID that you can use to manage your appointment.

> **Tip**: You can view all your appointments in the [Patient Portal](/patient/appointments).',
  ARRAY['booking', 'appointment', 'first-time', 'guide'], 2, true
FROM help_categories c WHERE c.slug = 'getting-started'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'create-patient-account', 'How to Create a Patient Account', 'Sign up as a patient to manage appointments and chat with doctors',
'# How to Create a Patient Account

Creating a patient account on DocFind gives you access to:
- Appointment management
- Doctor messaging
- Favorite doctors list
- Notification preferences
- Booking history

## Do I Need an Account?

No! You can book appointments as a **guest** using OTP verification. However, an account gives you a centralized dashboard to manage everything.

## How to Sign Up

1. Go to the [Patient Portal](/patient)
2. Click on "Sign Up" or "Create Account"
3. Enter your name, email, and phone number
4. Verify your phone number with OTP
5. Set a password
6. Start booking!

## Account Features

- **Appointments**: View, cancel, or reschedule upcoming appointments
- **Chat**: Message your doctors directly
- **Favorites**: Save doctors for quick access
- **Reviews**: Leave reviews after completed appointments
- **Notifications**: Get alerts for appointments and messages',
  ARRAY['account', 'signup', 'patient', 'registration'], 1, true
FROM help_categories c WHERE c.slug = 'sign-up-login'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'doctor-signup-guide', 'How to Sign Up as a Doctor', 'Complete guide to registering your doctor account on DocFind',
'# How to Sign Up as a Doctor

Join DocFind to grow your practice and manage appointments online.

## Step 1: Create Your Account

1. Go to [Doctor Sign Up](/doctor/signup)
2. Enter your full name, email, and password
3. Verify your email address
4. Complete the onboarding process

## Step 2: Complete Onboarding

During onboarding, you will provide:
- **Specialization**: Choose from 100+ specializations
- **Qualifications**: Your medical degrees and certifications
- **Experience**: Years of practice
- **License Number**: Your medical license
- **Bio**: A professional description for your profile

## Step 3: Add Your Clinic

After onboarding, add your clinic details:
- Clinic name and address
- Consultation fee
- Slot duration (15, 30, or 60 minutes)
- Booking mode (auto-confirm or manual approval)
- Working hours and availability

## Step 4: Submit Verification

To get a verified badge, submit:
- Medical license
- Certificates
- Clinic proof documents
- Profile photo

Our admin team reviews verification requests within 1-2 business days.

## Step 5: Start Accepting Patients

Once verified, your profile becomes visible to patients. You will start receiving bookings and can chat with patients directly.',
  ARRAY['doctor', 'signup', 'registration', 'onboarding'], 1, true
FROM help_categories c WHERE c.slug = 'doctor-guide'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'managing-availability', 'Managing Your Availability', 'Set working hours, breaks, and holidays for your clinic',
'# Managing Your Availability

Control when patients can book appointments with you.

## Working Hours

Go to [Availability](/doctor/availability) to set your weekly schedule:
1. For each day of the week, set your start and end time
2. Toggle days on/off (e.g., weekends off)
3. Set slot duration (how long each appointment lasts)
4. Set buffer time between appointments

## Breaks

Add recurring breaks (like lunch or prayer breaks):
1. Go to [Breaks](/doctor/breaks)
2. Select the day and time range
3. Choose break type (lunch, prayer, custom)
4. Breaks automatically block those slots from booking

## Holidays

Mark days when you are completely unavailable:
1. Go to [Holidays](/doctor/holidays)
2. Add a title (e.g., "Eid Holiday")
3. Set start and end dates
4. All slots during that period are blocked

## Availability Overrides

Need a one-time change? Use overrides:
1. Go to [Overrides](/doctor/availability/overrides)
2. Select a specific date
3. Set custom hours or mark as unavailable
4. This overrides your regular schedule for that day only',
  ARRAY['availability', 'schedule', 'hours', 'breaks', 'holidays'], 2, true
FROM help_categories c WHERE c.slug = 'doctor-guide'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'doctor-dashboard-guide', 'Understanding Your Doctor Dashboard', 'Navigate the doctor dashboard and use all its features',
'# Understanding Your Doctor Dashboard

The doctor dashboard is your command center for managing your practice.

## Dashboard Overview

The [Dashboard](/doctor/dashboard) shows:
- **Today''s Appointments**: Upcoming and completed appointments for the day
- **Quick Stats**: Total patients, appointments, and revenue
- **Recent Activity**: Latest bookings, messages, and reviews

## Key Sections

### Appointments
- View all upcoming, pending, and past appointments
- Confirm or reject pending bookings (if manual mode)
- Mark no-shows or completed appointments
- Cancel or reschedule appointments

### Patients
- View your patient list
- See patient history and medical notes
- Filter by recent visits

### Chat / Inbox
- Message patients directly
- View conversation history
- Get notified of new messages

### Analytics
- View booking trends
- See revenue reports
- Track patient demographics

### Reviews
- Read patient reviews
- Respond to feedback
- Track your average rating

### Settings
- Update your profile
- Change your password
- Manage notification preferences',
  ARRAY['dashboard', 'doctor', 'overview', 'navigation'], 3, true
FROM help_categories c WHERE c.slug = 'doctor-guide'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'finding-the-right-doctor', 'Finding the Right Doctor', 'Tips for searching and choosing the best doctor for your needs',
'# Finding the Right Doctor

DocFind helps you find the right healthcare professional quickly.

## Search Options

Use the [Search](/search) page to filter by:
- **Specialization**: Cardiology, Dermatology, Pediatrics, and more
- **Location**: Filter by city
- **Consultation Type**: In-person, online, or both
- **Fee Range**: Find doctors within your budget

## Understanding Doctor Profiles

Each doctor profile shows:
- **Qualifications**: Medical degrees and certifications
- **Experience**: Years in practice
- **Specialization**: Area of expertise
- **Clinic Info**: Location, hours, and consultation fee
- **Reviews**: Ratings and comments from verified patients
- **Languages**: Languages spoken by the doctor

## Featured Doctors

Featured listings are doctors who have purchased premium placement. They appear at the top of search results with a "Featured" badge. Featured status does not affect review scores — it only affects visibility.

## Tips for Choosing

1. Check the doctor''s specialization matches your needs
2. Read patient reviews for real experiences
3. Consider the clinic location and hours
4. Compare consultation fees
5. Check if they offer online consultations
6. Look at the doctor''s bio and experience',
  ARRAY['search', 'find-doctor', 'specialization', 'tips'], 1, true
FROM help_categories c WHERE c.slug = 'patient-guide'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'manage-your-appointments', 'Managing Your Appointments', 'How to view, cancel, and reschedule your appointments',
'# Managing Your Appointments

Keep track of all your appointments in one place.

## Viewing Appointments

Go to [My Appointments](/patient/appointments) to see:
- **Upcoming**: Confirmed appointments
- **Pending**: Awaiting doctor confirmation
- **Past**: Completed or cancelled appointments

## Cancelling an Appointment

To cancel:
1. Find the appointment in your list
2. Click "Cancel"
3. Provide a reason (optional)
4. Confirm cancellation

You will receive a cancellation confirmation. The doctor will be notified automatically.

## Rescheduling

To reschedule:
1. Find the appointment
2. Click "Reschedule"
3. Select a new date and time
4. Confirm the new slot

The doctor will need to confirm the rescheduled time if they use manual approval.

## Booking Reference

Every booking has a unique reference ID. You can use it to:
- Look up your appointment on the [Booking Lookup](/booking/pending) page
- Share with support if you need help
- Verify your appointment details

## Notifications

You will receive notifications for:
- Booking confirmation
- Reminder 24 hours before appointment
- Reminder 2 hours before appointment
- Cancellation or rescheduling
- New messages from your doctor',
  ARRAY['appointments', 'cancel', 'reschedule', 'manage'], 2, true
FROM help_categories c WHERE c.slug = 'patient-guide'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'booking-modes-explained', 'Booking Modes Explained', 'Understanding auto-confirm vs manual approval bookings',
'# Booking Modes Explained

DocFind supports two booking modes for doctors:

## Auto-Confirm Mode

When a doctor enables auto-confirm:
1. Patient selects a time slot
2. Booking is **instantly confirmed**
3. Both patient and doctor get a confirmation notification
4. The slot is immediately blocked

This is ideal for doctors who want to minimize administrative work.

## Manual Approval Mode

When a doctor uses manual approval:
1. Patient selects a time slot
2. Booking status is **pending**
3. Doctor receives a notification
4. Doctor reviews and confirms or rejects
5. Patient is notified of the decision

This is ideal for doctors who want to screen appointments before confirming.

## How to Change Your Mode

Doctors can change their booking mode in:
1. Go to [Clinic Settings](/doctor/settings)
2. Find "Booking Mode"
3. Select "Auto Confirm" or "Manual Approval"
4. Save changes

## What Patients See

- **Auto-Confirm**: Slots show as "Available" and booking is instant
- **Manual**: Slots show as "Available" but booking says "Pending Confirmation"

In both cases, the patient sees real-time availability.',
  ARRAY['booking', 'auto-confirm', 'manual', 'approval'], 1, true
FROM help_categories c WHERE c.slug = 'booking-guide'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'otp-verification-process', 'OTP Verification Process', 'How phone verification works for guest bookings',
'# OTP Verification Process

DocFind uses OTP (One-Time Password) verification to secure bookings.

## When OTP is Used

OTP verification is required for:
- **Guest bookings**: When booking without an account
- **Appointment cancellation**: To verify identity
- **Rescheduling**: To confirm changes
- **Booking lookup**: To access appointment details

## How It Works

1. You enter your phone number
2. DocFind sends a 6-digit OTP via SMS
3. You enter the code within 10 minutes
4. Your action is confirmed

## Troubleshooting OTP

**Didn''t receive the OTP?**
- Check your phone number is correct (include country code)
- Wait 30 seconds — SMS can be delayed
- Click "Resend OTP"
- Ensure you have mobile signal

**OTP expired?**
- OTP codes expire after 10 minutes
- Request a new one by clicking "Resend"

**Wrong code?**
- Double-check the 6-digit code
- Make sure you are entering the most recent code
- Don''t share your OTP with anyone',
  ARRAY['otp', 'verification', 'phone', 'sms'], 2, true
FROM help_categories c WHERE c.slug = 'booking-guide'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'how-to-use-chat', 'How to Use Doctor-Patient Chat', 'Messaging your doctor or patient on DocFind',
'# How to Use Doctor-Patient Chat

DocFind includes a built-in messaging system for direct communication between doctors and patients.

## Starting a Conversation

### As a Patient
1. Find your doctor''s profile or go to your appointments
2. Click "Chat" or "Message"
3. Start typing your message
4. The doctor will be notified

### As a Doctor
1. Go to [Inbox](/doctor/inbox)
2. Select a conversation
3. Reply to the patient
4. View conversation history

## Chat Features

- **Text Messages**: Send text messages instantly
- **File Attachments**: Share documents, images, or reports
- **Read Receipts**: See when messages are read
- **Typing Indicators**: Know when the other person is typing
- **Real-Time**: Messages appear instantly without refreshing

## Chat Etiquette

- Be respectful and professional
- Don''t share sensitive medical information over chat
- Use chat for questions, follow-ups, and clarifications
- For emergencies, call your local emergency number

## Blocking Users

If you receive inappropriate messages:
- Doctors can block patients from the chat
- Patients can block doctors from the chat
- Blocked users cannot send new messages
- Report abuse through the [Support](/support) page',
  ARRAY['chat', 'messaging', 'communication', 'doctor-patient'], 1, true
FROM help_categories c WHERE c.slug = 'chat-guide'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'chat-troubleshooting', 'Chat Troubleshooting', 'Fix common chat issues on DocFind',
'# Chat Troubleshooting

Common chat issues and how to fix them.

## Messages Not Sending

**Check your internet connection**
- Ensure you have a stable internet connection
- Try refreshing the page

**Check if you are blocked**
- If the other party blocked you, messages won''t deliver
- You will see an error notification

## Messages Not Appearing

**Real-time not working?**
- Refresh the page
- Check your internet connection
- Clear browser cache
- Try a different browser

## File Upload Issues

**Can''t upload files?**
- Maximum file size: 10MB
- Allowed types: JPEG, PNG, PDF
- Check your internet connection
- Try a smaller file

## Notifications Not Working

**Not getting chat notifications?**
1. Check [Notification Preferences](/patient/notifications/preferences)
2. Ensure push notifications are enabled
3. Check your browser/device notification settings
4. Verify your push token is registered

## Still Having Issues?

Contact our [Support Team](/support) with:
- A description of the problem
- Screenshots if possible
- Your device and browser information',
  ARRAY['chat', 'troubleshooting', 'issues', 'fix'], 2, true
FROM help_categories c WHERE c.slug = 'chat-guide'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'subscription-plans-overview', 'Subscription Plans Overview', 'Understanding doctor subscription plans and pricing',
'# Subscription Plans Overview

DocFind offers subscription plans for doctors to unlock premium features.

## Available Plans

### Trial (Free)
- **Duration**: 14 days
- **Features**:
  - Basic profile
  - Up to 50 appointments per month
  - Standard support
  - Manual booking mode

### Basic Plan
- **Monthly**: $19.99/month
- **Yearly**: $199.99/year
- **Features**:
  - Full profile
  - Unlimited appointments
  - Doctor-patient chat
  - Auto-confirm booking
  - Email notifications
  - Standard support

### Pro Plan
- **Monthly**: $49.99/month
- **Yearly**: $499.99/year
- **Features**:
  - Everything in Basic
  - Analytics dashboard
  - Broadcast messages
  - Priority support
  - Custom branding

### Featured Add-On
- **Monthly**: $9.99/month
- **Yearly**: $99.99/year
- **Features**:
  - Featured placement in search results
  - "Featured" badge on profile
  - Top of search results for 30 days
  - Can be added to any plan

## Managing Your Subscription

1. Go to [Billing](/doctor/billing)
2. View your current plan and status
3. Upgrade or downgrade
4. Cancel subscription
5. View billing history

## Trial Period

New doctors get a 14-day free trial with Basic features. No credit card required. When the trial ends, you can choose a paid plan or continue with limited features.',
  ARRAY['subscription', 'plans', 'pricing', 'billing'], 1, true
FROM help_categories c WHERE c.slug = 'subscription-guide'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'manage-subscription', 'Managing Your Subscription', 'How to upgrade, downgrade, or cancel your subscription',
'# Managing Your Subscription

Control your subscription at any time.

## Viewing Your Plan

Go to [Billing](/doctor/billing) to see:
- Current plan name and status
- Billing cycle (monthly/yearly)
- Next billing date
- Trial end date (if on trial)
- Payment method

## Upgrading Your Plan

1. Go to [Billing](/doctor/billing)
2. Click "Upgrade"
3. Select your new plan
4. Choose billing cycle (monthly/yearly)
5. Complete payment

Upgrades take effect immediately. You will be charged a prorated amount for the remainder of the billing period.

## Downgrading

1. Go to [Billing](/doctor/billing)
2. Click "Change Plan"
3. Select a lower plan
4. Confirm the change

Downgrades take effect at the end of your current billing period.

## Cancelling

1. Go to [Billing](/doctor/billing)
2. Click "Cancel Subscription"
3. Confirm cancellation
4. Your subscription remains active until the end of the billing period
5. After cancellation, you will be moved to the free tier

## Grace Period

If a payment fails, you get a 7-day grace period to update your payment method. During grace period, all features remain active. After grace period ends, your account is moved to the free tier.

## Refunds

Refund requests can be submitted through our [Refund Policy](/refund) page or by contacting [Support](/support).',
  ARRAY['subscription', 'upgrade', 'cancel', 'manage'], 2, true
FROM help_categories c WHERE c.slug = 'subscription-guide'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'how-featured-listings-work', 'How Featured Listings Work', 'Get your doctor profile featured in search results',
'# How Featured Listings Work

Featured listings give doctors premium placement in search results.

## What is a Featured Listing?

A featured listing places your doctor profile at the top of search results with a "Featured" badge. This increases visibility and helps you attract more patients.

## How to Get Featured

1. Go to [Billing](/doctor/billing)
2. Find the "Featured Listing" add-on
3. Choose monthly ($9.99) or yearly ($99.99)
4. Complete payment
5. Your profile is instantly featured for 30 days (monthly) or 365 days (yearly)

## Featured Badge

Once featured, your profile shows:
- A "Featured" badge on your profile card
- Priority placement in search results
- A star icon next to your name

## Managing Featured Status

- **Active**: Your listing is currently featured
- **Expired**: Your featured period has ended (renew to continue)
- **Inactive**: You cancelled featured status

## Renewing

When your featured period ends:
1. You will receive a notification
2. Go to [Billing](/doctor/billing) to renew
3. Choose your billing cycle
4. Your featured status is restored

## Does Featured Affect Reviews?

No. Featured status only affects visibility in search results. It does not affect review scores, verification status, or patient experience. All reviews are from verified patients regardless of featured status.',
  ARRAY['featured', 'listing', 'premium', 'visibility'], 1, true
FROM help_categories c WHERE c.slug = 'featured-guide'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'verification-requirements', 'Verification Requirements', 'What documents you need to get verified on DocFind',
'# Verification Requirements

Verification on DocFind confirms that a doctor is a legitimate healthcare professional.

## Why Get Verified?

- **Trust**: Verified badge shows patients you are authentic
- **Visibility**: Verified doctors appear higher in search results
- **Features**: Some features require verification
- **Credibility**: Patients are more likely to book verified doctors

## Required Documents

### 1. Medical License (Required)
- Clear photo or scan of your medical license
- Must show your name and license number
- Must be currently valid

### 2. Certificates (Required)
- Medical degree certificates
- Specialization certificates
- Any board certifications

### 3. Clinic Proof (Required)
- Clinic registration document
- Business license
- Or a utility bill with clinic address

### 4. Profile Photo (Recommended)
- Professional headshot
- Clear face photo
- Helps patients recognize you

### 5. ID Card (Optional)
- National ID or passport
- For identity verification

## How to Submit

1. Go to [Onboarding](/doctor/onboarding) or [Settings](/doctor/settings)
2. Upload each document
3. Submit for verification
4. Wait for admin review (1-2 business days)

## Review Process

1. **Submitted**: Your documents are uploaded
2. **Under Review**: Admin is checking your documents
3. **Approved**: You are verified! Badge appears on profile
4. **Rejected**: See rejection reason and resubmit
5. **Resubmit**: Fix issues and resubmit documents

## Tips for Quick Approval

- Ensure all documents are clear and readable
- Include all required document types
- Make sure names match across documents
- Upload high-quality images or scans',
  ARRAY['verification', 'documents', 'license', 'requirements'], 1, true
FROM help_categories c WHERE c.slug = 'verification-guide'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'verification-status-explained', 'Verification Status Explained', 'Understanding the different verification states',
'# Verification Status Explained

Your verification goes through several stages.

## Status Flow

### Pending
- Your documents have been submitted
- Waiting in the admin queue
- No action needed from you

### Under Review
- An admin is actively reviewing your documents
- This usually takes a few hours
- You will be notified when the review is complete

### Approved
- Your verification is complete
- A verified badge appears on your profile
- Patients can see you are verified
- You have access to all features

### Rejected
- Your documents were not accepted
- Check the rejection reason
- Fix the issues and resubmit
- Common reasons: blurry image, expired license, missing documents

### Resubmit
- Admin requested specific changes
- See what needs to be fixed
- Upload corrected documents
- Resubmit for review

### Suspended
- Your verification was revoked
- This happens if false information is discovered
- Contact support to appeal

## Checking Your Status

1. Go to [Doctor Dashboard](/doctor/dashboard)
2. Look for the verification badge
3. Or check [Settings](/doctor/settings) for detailed status

## Getting Help

If your verification is taking longer than expected or you have questions:
- Contact [Support](/support)
- Include your doctor ID and submission date',
  ARRAY['verification', 'status', 'review', 'process'], 2, true
FROM help_categories c WHERE c.slug = 'verification-guide'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'login-issues', 'Can''t Log In? Fix Login Issues', 'Solutions for common login and authentication problems',
'# Can''t Log In? Fix Login Issues

Having trouble signing in? Here are common solutions.

## Forgot Password

1. Go to the login page
2. Click "Forgot Password"
3. Enter your email
4. Check your email for a reset link
5. Click the link and set a new password

> **Note**: Reset links expire after 1 hour. Request a new one if expired.

## Wrong Email or Password

- Double-check your email address for typos
- Ensure caps lock is off
- Try copying and pasting your password
- If you are a doctor, use the [Doctor Login](/doctor/login) page
- If you are an admin, use the [Admin Login](/admin/login) page

## Email Not Verified

If you see "Email not verified":
1. Check your email for a verification link
2. Click the link to verify
3. Try logging in again

## Account Suspended

If your account is suspended:
- You will see a suspension message
- Contact [Support](/support) to resolve
- Suspensions happen for policy violations

## Browser Issues

- **Clear cache**: Clear browser cache and cookies
- **Incognito mode**: Try logging in incognito/private mode
- **Different browser**: Try a different browser
- **Disable extensions**: Some extensions block login

## Still Can''t Log In?

Contact [Support](/support) with:
- Your email address
- Error message you are seeing
- Browser and device information',
  ARRAY['login', 'password', 'forgot', 'troubleshoot'], 1, true
FROM help_categories c WHERE c.slug = 'troubleshooting'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'booking-problems', 'Common Booking Problems', 'Fix issues with booking, cancelling, or rescheduling appointments',
'# Common Booking Problems

Solutions for the most common booking issues.

## No Available Slots

**All slots show as unavailable?**
- The doctor may be fully booked for the selected period
- Try a different date range
- Try a different doctor
- Check if the doctor is on holiday

**Slots show but can''t book?**
- Another patient may have booked the slot
- Refresh the page to see updated availability
- The slot may have just been taken

## Booking Confirmation Not Received

**Booked but no confirmation?**
1. Check [My Appointments](/patient/appointments) for the booking status
2. If "Pending", the doctor uses manual approval — wait for confirmation
3. Check your notifications
4. Use your booking reference ID to look it up

## Can''t Cancel Appointment

**Cancel button not working?**
- You may be trying to cancel a past appointment
- The appointment may already be cancelled
- Try refreshing the page
- Contact support with your reference ID

## OTP Not Working

**OTP verification failing?**
- Check you entered the correct 6-digit code
- Ensure the OTP hasn''t expired (10 minute window)
- Request a new OTP
- Check your phone number is correct

## Double Booking

**Booked twice by mistake?**
- Cancel one of the duplicate bookings
- Use the reference ID to identify each booking
- Contact support if you can''t cancel

## Payment Issues

**Subscription payment failing?**
- Check your payment method is valid
- Try a different payment method
- Contact your bank if the transaction is blocked
- Contact support for billing help',
  ARRAY['booking', 'problems', 'issues', 'troubleshoot'], 2, true
FROM help_categories c WHERE c.slug = 'troubleshooting'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'notification-preferences', 'Managing Notification Preferences', 'Control which notifications you receive and how',
'# Managing Notification Preferences

Customize your notification settings on DocFind.

## Notification Types

### Appointment Notifications
- Booking confirmed
- Booking pending (manual mode)
- Booking rejected
- Booking cancelled
- Appointment completed
- No-show marked
- Appointment rescheduled
- 24-hour reminder
- 2-hour reminder

### Chat Notifications
- New message received
- Chat reply

### Account Notifications
- Doctor verified
- Review submitted
- Subscription updated
- Featured status changed

## Managing Preferences

### As a Patient
1. Go to [Notification Preferences](/patient/notifications/preferences)
2. Toggle notification types on/off
3. Choose delivery channels (push, email)
4. Save changes

### As a Doctor
1. Go to [Doctor Settings](/doctor/settings)
2. Find "Notifications" section
3. Toggle notification types
4. Choose delivery channels
5. Save changes

## Delivery Channels

### Push Notifications
- Sent to your mobile device
- Requires push token registration
- Works on supported browsers and PWA

### In-App Notifications
- Shown in the notification bell icon
- Always enabled
- View at [Notifications](/patient/notifications) page

### Email Notifications
- Sent to your registered email
- Can be toggled on/off
- Includes appointment summaries and important alerts',
  ARRAY['notifications', 'preferences', 'settings', 'alerts'], 1, true
FROM help_categories c WHERE c.slug = 'notifications'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'push-notification-setup', 'Setting Up Push Notifications', 'Enable push notifications on your device',
'# Setting Up Push Notifications

Get real-time alerts on your mobile device or browser.

## How Push Notifications Work

DocFind uses web push notifications (PWA). When you install DocFind as an app or use a supported browser, you can receive push notifications even when the app is not open.

## Enabling Push Notifications

### On Mobile (PWA)
1. Open DocFind in your mobile browser
2. Tap "Add to Home Screen" or "Install App"
3. Open the installed app
4. Allow notifications when prompted
5. Your push token is automatically registered

### On Desktop Browser
1. Open DocFind in Chrome, Edge, or Firefox
2. Allow notifications when prompted
3. Click the notification bell icon
4. Enable push notifications in preferences

## Troubleshooting

**Not receiving push notifications?**
- Check browser notification permissions
- Ensure DocFind is allowed to send notifications
- Try reinstalling the PWA
- Check your device notification settings
- Verify your push token is registered

**Notifications delayed?**
- Check your internet connection
- Background app refresh may be disabled
- Some platforms limit background notifications

**Notifications stopped?**
- Your push token may have expired
- Revisit the app to re-register
- Check if you have disabled notifications in settings',
  ARRAY['push', 'notifications', 'pwa', 'mobile'], 2, true
FROM help_categories c WHERE c.slug = 'notifications'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'account-security', 'Keeping Your Account Secure', 'Best practices for account security on DocFind',
'# Keeping Your Account Secure

Protect your DocFind account with these security best practices.

## Strong Passwords

- Use at least 8 characters
- Include uppercase, lowercase, numbers, and symbols
- Don''t reuse passwords from other sites
- Use a password manager
- Change your password if you suspect a breach

## Two-Factor Authentication

Admins can enable 2FA for additional security. If available:
1. Go to Settings
2. Enable 2FA
3. Follow the setup instructions
4. Use an authenticator app

## Recognizing Phishing

- DocFind will **never** ask for your password by email or phone
- Always check the URL before logging in
- Official emails come from @docfind.com
- Don''t click suspicious links
- Report phishing to [Support](/support)

## Data Protection

### What We Store
- Your name, email, and phone number
- Appointment history and medical notes (patients)
- Professional credentials (doctors)
- Chat messages between doctors and patients

### What We Don''t Store
- Full credit card numbers (processed by payment provider)
- Your password in plain text (encrypted)
- Sensitive medical documents beyond what you upload

### Data Encryption
- All data is encrypted in transit (HTTPS)
- Passwords are hashed using industry standards
- Database access is protected by RLS policies

## Privacy Rights

You have the right to:
- Access your data
- Request data deletion
- Export your data
- Correct inaccurate information

See our [Privacy Policy](/privacy) for details.

## Reporting Security Issues

If you discover a security vulnerability:
1. Do not exploit it
2. Report it to security@docfind.com
3. Include a detailed description
4. We will investigate and respond',
  ARRAY['security', 'password', 'privacy', 'protection'], 1, true
FROM help_categories c WHERE c.slug = 'security'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'data-privacy-guide', 'Data Privacy Guide', 'How DocFind handles your personal and medical data',
'# Data Privacy Guide

Your privacy is important to us. Here is how we handle your data.

## What Data We Collect

### Patient Data
- Name, email, phone number
- Date of birth, gender (optional)
- Address (optional)
- Medical history notes
- Appointment records
- Chat messages
- Reviews submitted

### Doctor Data
- Name, email, phone number
- Professional credentials
- License and certificate documents
- Clinic information
- Appointment records
- Chat messages
- Subscription and billing info

### Usage Data
- Page visits and actions
- Device and browser information
- IP address
- Cookies (with consent)

## How We Use Your Data

- To provide booking and chat services
- To send appointment notifications
- To verify doctor credentials
- To improve our services
- To prevent fraud and abuse

## Data Sharing

We **never** sell your data. We share data only with:
- You (your own data)
- Doctors/patients you interact with (relevant info only)
- Payment processors (for billing)
- Authorities if legally required

## Your Rights

- **Access**: Request a copy of your data
- **Deletion**: Request account deletion
- **Correction**: Fix inaccurate data
- **Export**: Download your data
- **Opt-out**: Unsubscribe from marketing

## Cookies

We use cookies for:
- Authentication (keeping you logged in)
- Preferences (remembering settings)
- Analytics (understanding usage)

We use a consent banner to comply with GDPR. You can manage cookie preferences at any time.

See our full [Privacy Policy](/privacy) for details.',
  ARRAY['privacy', 'data', 'gdpr', 'rights'], 2, true
FROM help_categories c WHERE c.slug = 'security'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'how-to-contact-support', 'How to Contact Support', 'Get help from the DocFind support team',
'# How to Contact Support

We are here to help. Here is how to reach us.

## Support Channels

### Support Tickets
1. Go to [Support](/support) page
2. Fill out the support form
3. Choose a category and priority
4. Submit your ticket
5. You will receive a response via email

### Direct Contact
- **Email**: support@docfind.com
- **Contact Form**: [Contact Page](/contact)
- **Help Center**: You are here! Browse articles

## Response Times

| Priority | Response Time |
|----------|--------------|
| Urgent | Within 2 hours |
| High | Within 8 hours |
| Normal | Within 24 hours |
| Low | Within 48 hours |

## What to Include

For faster resolution, include:
- Your name and email
- Account type (patient/doctor)
- Detailed description of the issue
- Screenshots if applicable
- Error messages
- Steps to reproduce
- Browser and device info

## Support Categories

- **Account Issues**: Login, registration, password
- **Booking Problems**: Can''t book, cancel, or reschedule
- **Payment/Billing**: Subscription, refunds, invoices
- **Technical Issues**: Bugs, errors, broken features
- **Verification**: Doctor verification questions
- **Report Abuse**: Report inappropriate behavior
- **General**: Anything else

## Before Contacting Support

Check these resources first:
- [FAQ](/faq) — Common questions
- [Troubleshooting](/help/troubleshooting) — Self-service fixes
- [Help Center](/help) — Browse all articles

You might find your answer faster!',
  ARRAY['support', 'contact', 'help', 'ticket'], 1, true
FROM help_categories c WHERE c.slug = 'contact-support'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'reporting-abuse', 'Reporting Abuse or Inappropriate Behavior', 'How to report users, content, or behavior that violates our policies',
'# Reporting Abuse or Inappropriate Behavior

Help keep DocFind safe for everyone.

## What to Report

- **Inappropriate Messages**: Harassment, spam, or offensive content in chat
- **Fake Profiles**: Profiles impersonating other doctors or using false credentials
- **Fraudulent Bookings**: Fake appointments or booking manipulation
- **Misleading Information**: False claims in doctor profiles or reviews
- **Policy Violations**: Any behavior that violates our [Terms](/terms)

## How to Report

### Report a User
1. Go to the user''s profile or chat
2. Click "Report" or "Block"
3. Select a reason
4. Provide a description
5. Submit the report

### Report a Review
1. Find the review
2. Click "Report"
3. Select a reason (fake, offensive, irrelevant)
4. Submit

### Report via Support
1. Go to [Support](/support)
2. Choose "Report Abuse" category
3. Provide details and evidence
4. Submit a ticket

## What Happens After Reporting

1. **Submitted**: Your report is received
2. **Investigating**: Admin reviews the report
3. **Resolved**: Action taken (warning, suspension, or removal)
4. **Dismissed**: No violation found

You will be notified of the outcome.

## Blocking Users

If you don''t want to interact with someone:
- **Block from chat**: Prevents further messages
- **Block from booking**: Prevents bookings (doctors only)
- Blocked users are not notified

## Protection

- Reports are confidential
- Retaliation is prohibited
- False reports may result in account action
- Serious violations may involve legal authorities',
  ARRAY['report', 'abuse', 'block', 'safety'], 2, true
FROM help_categories c WHERE c.slug = 'contact-support'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'doctor-prescriptions', 'Managing Prescriptions', 'How doctors can manage patient prescriptions',
'# Managing Prescriptions

Doctors can manage patient prescriptions through DocFind.

## Viewing Prescriptions

Go to [Prescriptions](/doctor/prescriptions) to:
- View all prescriptions you have issued
- See patient details and medication history
- Filter by date or patient

## Creating a Prescription

1. Go to [Prescriptions](/doctor/prescriptions)
2. Click "New Prescription"
3. Select the patient
4. Add medications, dosage, and instructions
5. Save the prescription

## Patient Records

Access patient medical records at [Records](/doctor/records):
- View patient medical history
- See past appointments and notes
- Review previous prescriptions
- Add medical notes

## Privacy

- Prescription data is protected by RLS policies
- Only the prescribing doctor and the patient can view prescriptions
- Data is encrypted in transit and at rest
- Access is logged for audit purposes',
  ARRAY['prescriptions', 'records', 'doctor', 'medication'], 4, true
FROM help_categories c WHERE c.slug = 'doctor-guide'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'patient-favorites', 'Saving Favorite Doctors', 'Bookmark doctors for quick access later',
'# Saving Favorite Doctors

Bookmark your preferred doctors for easy access.

## How to Favorite a Doctor

1. Find a doctor on the [Search](/search) page or their profile
2. Click the heart icon on their card
3. The doctor is added to your favorites

## Managing Favorites

Go to [Favorites](/patient/favorites) to:
- View all saved doctors
- Remove doctors from favorites
- Quick book an appointment with a favorite doctor
- See if your favorite doctor has new availability

## Why Use Favorites?

- **Quick Access**: No need to search each time
- **Track Availability**: See when your preferred doctor has openings
- **Multiple Doctors**: Keep a list of specialists you visit regularly
- **Easy Rebooking**: Book follow-ups with one click',
  ARRAY['favorites', 'bookmark', 'save', 'patient'], 3, true
FROM help_categories c WHERE c.slug = 'patient-guide'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (category_id, slug, title, summary, content, tags, display_order, is_published)
SELECT c.id, 'leaving-reviews', 'Leaving Reviews After Appointments', 'How to rate and review your doctor after a completed appointment',
'# Leaving Reviews After Appointments

Share your experience to help other patients.

## When Can You Review?

You can leave a review after an appointment is marked as **completed**. Reviews help:
- Other patients choose the right doctor
- Doctors improve their practice
- Build trust in the DocFind community

## How to Leave a Review

1. Go to [My Appointments](/patient/appointments)
2. Find the completed appointment
3. Click "Leave Review"
4. Rate from 1 to 5 stars
5. Write your experience (optional)
6. Submit

Or go to [Reviews](/patient/reviews) to:
- See reviews you have left
- Edit existing reviews
- Check doctor ratings

## Review Guidelines

- Be honest and respectful
- Focus on the medical experience
- Don''t include personal medical details
- Don''t use offensive language
- Only review appointments you actually attended

## Verified Reviews

All reviews on DocFind are from verified patients — meaning the reviewer actually had an appointment with the doctor. This ensures authenticity and prevents fake reviews.

## Can Doctors See My Review?

Yes, doctors can see reviews left for them. They can also respond. However, they cannot delete reviews or edit your review.

## Reporting a Review

If a review is fake, offensive, or violates guidelines:
1. Find the review
2. Click "Report"
3. Select a reason
4. Submit the report for admin review',
  ARRAY['reviews', 'rating', 'feedback', 'patient'], 4, true
FROM help_categories c WHERE c.slug = 'patient-guide'
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- EXPAND PLATFORM_SETTINGS DEFAULTS (values as JSON)
-- ============================================================

INSERT INTO platform_settings (key, value, description) VALUES
  ('trial_days', '"14"', 'Number of free trial days for new doctors'),
  ('booking_min_notice_hours', '"2"', 'Minimum hours notice required for booking'),
  ('booking_max_advance_days', '"90"', 'Maximum days in advance a booking can be made'),
  ('cancellation_cutoff_hours', '"4"', 'Hours before appointment to allow free cancellation'),
  ('reminder_hours_before', '"24,2"', 'Hours before appointment to send reminders (comma-separated)'),
  ('featured_duration_days', '"30"', 'Duration of featured listing in days'),
  ('max_appointments_per_day', '"100"', 'Maximum appointments per doctor per day'),
  ('platform_name', '"DocFind"', 'Platform display name'),
  ('support_email', '"support@docfind.com"', 'Support contact email'),
  ('support_phone', '""', 'Support contact phone number'),
  ('maintenance_message', '"We are performing scheduled maintenance. Please check back soon."', 'Message shown during maintenance mode'),
  ('notification_email_enabled', 'true', 'Enable email notifications globally'),
  ('notification_push_enabled', 'true', 'Enable push notifications globally'),
  ('notification_sms_enabled', 'false', 'Enable SMS notifications globally'),
  ('max_file_upload_mb', '"10"', 'Maximum file upload size in MB'),
  ('session_timeout_minutes', '"60"', 'Session timeout in minutes for inactive users'),
  ('rate_limit_api_per_minute', '"60"', 'API rate limit per minute per user'),
  ('otp_expiry_minutes', '"10"', 'OTP code expiry time in minutes'),
  ('default_slot_duration', '"30"', 'Default slot duration in minutes'),
  ('default_booking_mode', '"auto"', 'Default booking mode for new clinics (auto/manual)')
ON CONFLICT (key) DO NOTHING;
