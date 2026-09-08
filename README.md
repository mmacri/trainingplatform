# GridGuard Learning

GridGuard Learning is a GitHub Pages-ready NERC CIP training, course-authoring, certification, and compliance-readiness platform. It runs entirely in the browser using React, Vite, Tailwind CSS, React Router HashRouter, Dexie, IndexedDB, Recharts, and local PWA caching.

## Features

- Demo login with learner, manager, author, reviewer, compliance, and administrator perspectives.
- Browser-local users, roles, teams, groups, course access grants, assignments, progress, assessments, certificates, evidence, reviews, standards, audit events, notifications, backups, and settings.
- NERC CIP academy seed content from CIP-002 through CIP-015.
- Fully populated flagship courses for CIP-004 Personnel & Training and Annual NERC CIP Cybersecurity Awareness.
- Course Management for creating, editing, reviewing, publishing, assigning, monitoring, duplicating, archiving, exporting, and restricting courses.
- Access request workflow with owner approval and automatic user grants.
- Compliance dashboards, standards registry, evidence records, reports, and audit log.
- Full backup export/import, demo restore, browser storage health, dark mode, offline indicator, and installable PWA manifest.

## Architecture

The production architecture is static:

GitHub repository -> GitHub Actions -> Vite static build -> GitHub Pages -> Browser app -> IndexedDB application database.

GridGuard GitHub Edition implements browser-level role and course access behavior for demos, development, local training, and portfolio use. Because GitHub Pages is static hosting, this edition is not intended for storing confidential regulated content.

## Local Development

```bash
npm ci
npm run dev
```

Open `http://localhost:3000/#/home`.

## GitHub Pages Deployment

The app uses hash routing and relative asset paths, so it works at:

`https://USERNAME.github.io/REPOSITORY/`

Enable GitHub Pages with GitHub Actions as the source. The deploy workflow builds `dist` and publishes it using official Pages actions.

## Demo Users

All demo users use:

`GridGuard-Local-2026!`

- `learner@gridguard.local`
- `manager@gridguard.local`
- `author@gridguard.local`
- `compliance@gridguard.local`
- `admin@gridguard.local`

## Data Storage

GridGuardDB is a Dexie-managed IndexedDB database. First load seeds the application once. Normal CRUD workflows persist locally. Backups export the complete database as JSON and can be restored through Administration.

## Testing

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
npm run verify
```

## Project Structure

- `src/data`: IndexedDB schema, Dexie setup, seed data.
- `src/services`: auth, authorization, search, backup, and workflow services.
- `src/ui`: React application routes and views.
- `public`: PWA manifest, service worker, icons.
- `.github/workflows`: CI and GitHub Pages deployment.
