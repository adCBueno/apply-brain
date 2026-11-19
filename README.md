# 🗂️ Apply Brain

**A local-first tracker for job *and* thesis applications.** Kanban board, automatic follow-ups, interviews in your calendar, the exact CV and cover letter you sent, and the job description saved before the posting disappears.

Sister app of [Thesis Brain](https://github.com/adCBueno/thesis-brain). UI in Spanish 🇪🇸.

## Why

Most people lose opportunities not because they're unqualified, but because the search gets chaotic:

| Problem | What Apply Brain does |
|---|---|
| **Forgetting to follow up** (the #1 mistake) | Moving a card to **Postulé** schedules a follow-up in 7 days. **Hoy** lists what's due, with ✓ Done / +3 days |
| **"Where did I already apply?"** | Kanban + list with search. Warns you when you add a company you already applied to |
| **"Which CV / cover letter did I send?"** | **Lo que envié** tab: CV version + the exact letter, copyable |
| **The posting disappeared before the interview** | **Descripción** tab: paste the full job description, searchable later |
| **Applications that silently die** | After 21 days without movement: "👻 no response". Send a last follow-up or close it |
| **Rewriting the same answers every time** | **Mi pitch**: a bank of reusable texts (elevator pitch, best project, availability…), insertable into any cover letter |
| **Forgetting who you met** | **Contactos** linked to applications (recruiters, talent-day contacts, referrals) |

## Features

- 🗂️ **Board** with drag & drop: Me interesa → Preparando → Postulé → En contacto → Entrevistas → Oferta (+ closed: rejected / no response / withdrew). Filter by 💼 job / 🎓 thesis / 🌱 internship
- 🌤️ **Hoy**: due next actions, upcoming interviews, deadlines within 7 days, silent applications, weekly stats and funnel
- 📊 **Table (overview)**: everything in one ordered table, grouped by priority (🔥 dream → good → plan B → closed) and then by how far each application got. Edit priority, stage and next step inline, choose columns, search inside saved job descriptions
- 📗 **Excel**: download a formatted `.xlsx` (Overview sorted by priority with filters and frozen header, Resumen, Historial, Contactos), or **connect an .xlsx file that rewrites itself after every change** (Chrome/Edge). Excel doesn't refresh an open file, and Windows locks it while open: the app tells you and retries when you come back
- 📤 CSV export
- 📥 **CSV import** from Excel / Google Sheets: recognises common Spanish and English headers (Company/Empresa, Role/Puesto, Status/Estado, Date applied/Fecha, Link…), maps statuses, detects thesis/internship, sends unknown columns to notes, skips duplicates
- 📅 **Calendar**: interviews and reminders as `.ics` (Google Calendar, Outlook, Apple Calendar)
- 🛂 Flags for "requires existing work permit" and "requires Swedish"
- 🧭 **Rastro**: activity log of everything you did
- 📲 Installable **PWA**, works offline · ⌨️ `N` new application · `Ctrl/⌘ + Enter` save · `Esc` close

## Your data (local-first)

No server, no account. Data lives in your browser (IndexedDB, in its own database, so it doesn't clash with Thesis Brain on the same `github.io` domain).

- **Sync to a JSON file** (Chrome / Edge): *⚙️ Datos y ajustes → Crear archivo nuevo*, then put it in iCloud Drive / Dropbox / OneDrive.
- **Backups**: download / import JSON anytime. **CSV export** for spreadsheets.

> ⚠️ `localhost` and your GitHub Pages URL are separate storages. Use the published, installed app for your real data.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (vitest)
npm run build      # production build in dist/
```

## Deploy to GitHub Pages

1. Push to GitHub (branch `main` or `master`).
2. **Settings → Pages → Source: GitHub Actions**.
3. The workflow tests, builds and publishes on every push → `https://<user>.github.io/<repo>/`.

## Project structure

```
src/
  App.tsx            # layout, #hash routing, modal host, shortcuts
  types.ts           # Application, Contact, Snippet, State
  lib/
    utils.ts         # stages + automatic follow-ups, overview order, dates, CSV, .ics  (+ tests)
    excel.ts         # formatted .xlsx + auto-updating Excel file  (+ tests)
    store.ts         # tiny global store (useSyncExternalStore + structuredClone)
    storage.ts       # IndexedDB + File System Access sync + backup
    pwa.ts           # install prompt
  components/        # Nav, cards, shared UI
  views/             # Hoy, Tablero, Tabla, Contactos, Pitch, Rastro
  modals/            # application (tabs), contact, snippet, CSV import, settings
```

## Roadmap

- [ ] Browser extension / bookmarklet: save a LinkedIn posting in one click
- [ ] Optional AI: tailor a cover letter from the saved job description + "Mi pitch"
- [ ] Interview prep notes per stage
- [ ] Google Sheets live sync (needs OAuth)
- [ ] Shared core package with Thesis Brain (storage, PWA, UI)

## License

MIT © Adriana Calvo Bueno
