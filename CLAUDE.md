# Finance Track — Claude Code Instructions

This file tells Claude Code how this project is structured, what the migration targets are, and how to set up the development environment after export from Replit.

---

## Project Overview

**Finance Track** is a business finance and accounting tracker built for:
- Small businesses (US LLCs, Canadian corporations)
- Rental property businesses
- Cross-border Canada/US tax preparation

**Stack:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + wouter + recharts + lucide-react

**Current persistence:** `localStorage` via a thin `storageService` abstraction — intentionally designed to be swapped for Firebase Firestore with minimal changes.

---

## Environment Setup (VSCode + Local Dev)

### Prerequisites
- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- VSCode with extensions: ESLint, Prettier, Tailwind CSS IntelliSense, TypeScript Vue/React

### First-time setup
```bash
pnpm install
pnpm run dev
```

App runs at `http://localhost:5173` by default.

### VSCode settings (add to `.vscode/settings.json`)
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "tailwindCSS.experimental.classRegex": [["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]]
}
```

### Path aliases
The project uses `@/` for `src/` and `@assets/` for `src/assets/`. These are configured in `vite.config.ts` and `tsconfig.json`. If VSCode IntelliSense doesn't resolve them, restart the TS server (`Cmd+Shift+P → TypeScript: Restart TS Server`).

---

## Firebase Migration Guide

All persistence lives in `src/services/`. The migration is **service-by-service** — each service file has `// TODO: Firebase` comments marking exact swap points.

### Step 1 — Firebase project setup
1. Create a Firebase project at console.firebase.google.com
2. Enable **Authentication** (Email/Password + Google)
3. Enable **Firestore** (production mode, then set rules)
4. Enable **Storage** (for document/receipt file uploads)
5. Copy the Firebase config to `.env.local`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Step 2 — Install Firebase SDK
```bash
pnpm add firebase
```

### Step 3 — Create `src/lib/firebase.ts`
```typescript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

### Step 4 — Replace `storageService.ts`

The current `storageService` is the single abstraction layer all services use. Replace the implementation while keeping the same interface:

```typescript
// src/services/storageService.ts — Firebase version
import { db, auth } from "@/lib/firebase";
import {
  collection, doc, getDocs, setDoc, deleteDoc, query, where
} from "firebase/firestore";

// Each "key" becomes a Firestore subcollection under /users/{uid}/{key}
function userCollection(key: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return collection(db, "users", uid, key);
}

export const storageService = {
  async get<T>(key: string): Promise<T | null> {
    const snap = await getDocs(userCollection(key));
    if (snap.empty) return null;
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as T;
  },
  async set<T extends { id: string }[]>(key: string, value: T): Promise<void> {
    // Full replace — write each item as its own document
    const col = userCollection(key);
    for (const item of value) {
      await setDoc(doc(col, item.id), item);
    }
  },
  async remove(key: string): Promise<void> {
    const snap = await getDocs(userCollection(key));
    for (const d of snap.docs) await deleteDoc(d.ref);
  }
};
```

> **Note:** After replacing `storageService`, all service methods (`businessService`, `transactionService`, etc.) become async. Update callers to use `await` and switch `useState` initialisations to use `useEffect` + loading states.

### Step 5 — Firestore data model

```
/users/{uid}/
  businesses/{businessId}    ← Business documents
  transactions/{txId}        ← Transaction documents
  documents/{docId}          ← BusinessDocument metadata
  exchangeRates/{rateId}     ← ExchangeRate overrides
  settings/user              ← Settings document
```

### Step 6 — Firebase Storage (document/receipt uploads)

Replace the file upload placeholder in `Documents.tsx`:

```typescript
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";

async function uploadFile(file: File, documentId: string): Promise<string> {
  const uid = auth.currentUser?.uid;
  const path = `users/${uid}/documents/${documentId}/${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
```

Store the returned URL in `BusinessDocument.receiptUrl` (already in the type).

### Step 7 — Firestore security rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Step 8 — Authentication

Add `src/contexts/AuthContext.tsx` with `onAuthStateChanged` and wrap `App.tsx`. Gate all routes behind auth. Remove the sample data auto-init in `App.tsx` — it only makes sense for the localStorage demo.

---

## Vercel Deployment

### Step 1 — Connect repo
1. Push the project to GitHub
2. Import into Vercel at vercel.com/new
3. Framework preset: **Vite**
4. Build command: `pnpm run build`
5. Output directory: `dist`
6. Install command: `pnpm install`

### Step 2 — Environment variables
Add all `VITE_FIREBASE_*` variables in Vercel → Project → Settings → Environment Variables. They must be prefixed `VITE_` to be exposed to the browser build.

### Step 3 — SPA routing
Create `public/vercel.json` (or `vercel.json` at root):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

This ensures wouter client-side routes don't return 404 on hard reload.

### Step 4 — Custom domain (optional)
Vercel → Project → Settings → Domains → Add your domain. DNS records are shown automatically.

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/services/storageService.ts` | **Primary swap point** — replace with Firebase |
| `src/services/businessService.ts` | Business CRUD — add async/await after Firebase swap |
| `src/services/transactionService.ts` | Transaction CRUD — same |
| `src/services/documentService.ts` | Document metadata CRUD + file upload placeholder |
| `src/services/exchangeRateService.ts` | FX rates — manual overrides + (TODO) live API |
| `src/types/index.ts` | All TypeScript interfaces — source of truth |
| `src/data/sampleData.ts` | Demo data — remove or gate behind a dev flag after Firebase |
| `src/App.tsx` | Route definitions + sync localStorage init (remove init after Firebase) |
| `src/components/Layout.tsx` | Sidebar, nav, mobile header |
| `src/pages/` | One file per page — all read from services |

---

## What's Already Firebase-Ready

- All data types in `src/types/index.ts` use string IDs (compatible with Firestore document IDs)
- Every entity has `createdAt` and `updatedAt` ISO strings
- No computed cross-document joins — each entity is self-contained
- `storageService` is the single persistence abstraction — only that file needs to change for basic read/write
- `receiptUrl` and `fileName` fields already exist on `Transaction` and `BusinessDocument` for Storage URLs
- File upload UI placeholder is already wired in `Documents.tsx` — just needs the `uploadFile` function

---

## Branding

- Logo: `src/assets/luxor-logo.png` (Luxor Developments — transparent background)
- Primary brand colours: deep navy sidebar (`#1e2433`), gold accent
- App name: **Finance Track** by Luxor Developments LLC
- Favicon: `public/favicon.svg` — update to match logo if desired

---

## Notes for Claude Code

- **Do not** use `console.log` for debug output in production code — use a logger utility or remove before shipping
- The app is intentionally dense/compact (Excel-style UI). Maintain `text-xs`, `h-7` inputs, `py-1` table cells
- All monetary amounts are stored in **both** USD and CAD (`amountUSD`, `amountCAD`) with the `exchangeRateToUSD` recorded at transaction time — never recompute historical FX
- Tax categories are defined in `src/data/taxCategories.ts` — these are static lookup tables, not user-editable
- The `reimbursement_received` transaction type links back to an original expense via `linkedTransactionId`
- Sample data lives in `src/data/sampleData.ts` — business `biz-001` "Luxor Developments LLC", owner A (60%), owner B (40%), property RIV317
