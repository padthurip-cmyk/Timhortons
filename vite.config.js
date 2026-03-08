import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()]
})
```
4. Click **Commit changes**

---

## Step 5 — Delete the old flat files

The old `App.jsx` and `main.jsx` sitting in the root folder need to go:

1. Click **`App.jsx`** in the root
2. Click the **trash icon 🗑️** (top right)
3. Click **Commit changes**
4. Repeat for **`main.jsx`** in the root

---

## Your repo should now look like this
```
Timhortons/
├── src/
│   ├── App.jsx        ✓
│   ├── main.jsx       ✓
│   └── supabase.js    ✓
├── index.html         ✓
├── package.json       ✓
├── vite.config.js     ✓
├── netlify.toml       ✓
└── schema.sql         ✓
