# Dash Dashboard 🦞

A high-performance Threat Intelligence Indexer for storing, searching, and managing IP addresses and Hashes. Designed for speed, portability, and professional use.

## Features
- **Smart Search:** Real-time filtering with prefix prioritization (searching `192.` shows exact/starting matches first).
- **Auto-Detection:** Automatically identifies IPv4, IPv6, MD5, SHA1, and SHA256 during upload.
- **Bulk Import:** Seamlessly parse large CSV and XLSX files.
- **Standalone Engine:** Powered by SQLite + Drizzle ORM for zero-setup local storage.
- **Cinematic UI:** Premium dark-mode dashboard with live statistics.

## Getting Started

### 1. Installation
```bash
npm install
```

### 2. Development
```bash
npm run dev
```
*Backend runs on port 5000, Frontend on port 3000.*

### 3. CSV/Excel Format
Your spreadsheet should have columns named like:
- `IP` or `Hash` (The value to index)
- `Remark` or `Notes` (Optional description)

## Tech Stack
- **Backend:** Node.js, Express, TypeScript
- **Database:** SQLite, Drizzle ORM
- **Frontend:** React, Vite, TailwindCSS, Framer Motion
- **Icons:** Lucide React
