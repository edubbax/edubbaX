# EdubbaX

**EdubbaX is a next-generation EdTech platform designed to make learning more measurable, interactive, and outcome-oriented.**

## Overview

EdubbaX connects teaching, assessment, real-time learning data, and student progress in one integrated education ecosystem.

The platform is designed to help teachers:

* monitor student understanding in real time;
* identify learning gaps;
* make immediate teaching interventions;
* reassess students after intervention;
* track learning progress through data;
* provide clearer visibility into student development.

## Problem

Traditional education tools often separate teaching, assessment, communication, and analytics.

Teachers may know that a student performed poorly, but they do not always have an integrated workflow that shows **what the student does not understand, what intervention should happen next, and whether that intervention actually worked.**

EdubbaX is being developed to address this gap.

## Core Product

The initial product focuses on:

* Teacher Dashboard
* Class Management
* Structured Lessons
* Live Quizzes
* Real-Time Results
* Learning Gap Detection
* Teaching Intervention
* Reassessment
* Progress Reports

## Product Roadmap

### V0.1 — Learning Intelligence

Core teacher workflow, real-time assessment, learning-gap detection, intervention, and reassessment.

### V1 — AI-Assisted Teaching

AI quiz generation, lesson materials, presentations, interactive activities, and deeper analytics.

### V2 — Student Ecosystem

Personalized learning, self-study, gamification, rewards, and learning pathways.

### V3 — Global Learning Marketplace

Tutors, courses, lesson packages, subscriptions, and a global learning community.

## Technology

The technology stack is currently under active development and may evolve as the product is validated and improved.

## Project Status

EdubbaX is currently in the **early-stage product development and validation phase**.

The project is being developed by a student founder with the goal of building a scalable education technology platform and validating its value with early users.

## Vision

The long-term vision of EdubbaX is to create a connected and intelligent education ecosystem where teaching decisions, assessment data, student progress, and AI assistance work together.

> More learning activity → more educational data → better product intelligence → stronger learning outcomes.

## Development

This repository is part of the ongoing development of EdubbaX. Features, architecture, and implementation details will evolve as the product progresses through validation and MVP development.
## Site build (SEO and shared layout)

Static pages share one header, footer and SEO block. After editing page text or `tools/build.py`:

1. `python3 tools/build.py` — writes the head tags (title, description, canonical, hreflang, Open Graph, JSON-LD), the shared header/footer, `sitemap.xml` and `robots.txt`.
2. Serve the folder with clean URLs on `localhost:8766` and run `node tools/bake.js` — pre-renders the Azerbaijani text into the HTML so search engines see it without JavaScript.

When the site moves to its own domain, change `SITE` in `tools/build.py` and in `assets/i18n.js`, then repeat both steps.

## Açıq profil (public teacher / course profiles)
- App section: `tools/app/public-profile.js` + `.css`, injected into `index.html` with `python3 tools/app/inject.py` (re-run after editing).
- Public page: `api/profile.js` (Vercel function), served at `/t/<slug>`; sitemap at `/profiles-sitemap.xml` (`api/profiles-sitemap.js`).
- Database (Supabase): `profile_requests`, `profiles`, `profile_leads`, `profile_payments`, `profile_admins`; RPCs `profile_*`, `public_profile*`; storage bucket `profile-media`.
- Flow: verification request → admin approves in "Profil istəkləri" → owner fills profile → payment (manual "Ödəniş alındı" until a payment gateway is connected) → public for 1 year.
- Prices: teacher 9.99 AZN/year (AZ) or $9.99 abroad; course 59.99 AZN/year or $59.99 abroad (set on approval from the request's country).

### Themes and notifications
- `lib/profile-render.js` renders the public page (8 themes × any colour × 4 fonts × light/dark/auto); used by `api/profile.js` and by the app's live preview.
- Notifications: DB triggers queue events in `private.notify_queue` and wake the Supabase function `notify` (pg_net); a daily cron sends expiry reminders.
  Secrets to set in Supabase → Edge Functions → Secrets: `TELEGRAM_BOT_TOKEN` (from @BotFather), `RESEND_API_KEY` (resend.com), optional `EMAIL_FROM`.
  Then press "Qurulumu yoxla" in the app (Profil istəkləri). Function sources: `supabase/functions/notify`, `supabase/functions/telegram-bot`.
