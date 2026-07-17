# Burn-Ex AI Setup (Groq + Hugging Face)

## Step 1: Environment & packages

### Backend (`burn-ex/backend`)

1. Copy env template:
   ```bash
   cp .env.example .env
   ```
2. Set in `.env` (never commit real keys):
   - `GROQ_API_KEY` — [Groq Console](https://console.groq.com/keys)
   - `HF_API_TOKEN` — [Hugging Face tokens](https://huggingface.co/settings/tokens)
   - Optional: `GROQ_MODEL=llama-3.3-70b-versatile`, `HF_FOOD_MODEL=nateraw/food`
3. Install & run:
   ```bash
   npm install
   npm run dev
   ```

### Frontend (`burn-ex/frontend`)

```bash
npm install
# Optional: @tensorflow-models/mobilenet (browser fallback for food photos)
npm install @tensorflow-models/mobilenet
npm run dev
```

Set `VITE_API_URL=http://localhost:5000` in `frontend/.env` if needed.

---

## Step 2: Architecture

| Feature | Where it runs | Technology |
|---------|---------------|------------|
| Pose, reps, angles | Browser | MediaPipe Pose |
| Form score | Browser | Rule-based depth + alignment |
| Live calories | Browser | MET × weight × hybrid multiplier |
| Food photo | Server → fallback browser | HF `nateraw/food` → MobileNet |
| Nutrition tips | Server | Groq LLM |
| Workout summary & form tips | Server | Groq LLM |

**Privacy:** Camera and pose stay on-device. Images for food go to your backend → HF only when using server vision. Groq receives text context only (no video).

---

## Step 3: API routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/ai/status` | Groq/HF configured |
| POST | `/api/ai/nutrition/analyze-photo` | `{ imageBase64 }` |
| GET | `/api/ai/nutrition/suggestions` | Groq meal advice |
| POST | `/api/ai/workout/summary` | Post-workout narrative |
| POST | `/api/ai/workout/form-tip` | Short live coaching line |

Existing `/api/nutrition/suggestions` also uses Groq when configured, with rule-based fallback.

---

## Step 4: Testing checklist

- [ ] `GET /api/ai/status` returns `{ groq: true, huggingface: true }` when keys are set
- [ ] **Live Workout Tracker:** camera, skeleton, reps, form score, calories, muscle SVG, fatigue, injury risk
- [ ] Stop workout → session saves + **Groq post-workout summary** appears
- [ ] Low form reps → **AI coach tip** (voice + blue banner), throttled
- [ ] **Nutrition:** photo upload → HF labels (or MobileNet fallback) → log entry
- [ ] **Nutrition:** suggestions show **Groq AI** badge when powered
- [ ] Backend offline → graceful fallbacks (no crash)

---

## Step 5: Demo tips

1. Complete profile with **weight** for calorie estimates.
2. Run `npm run seed:met` once for MET values.
3. Use good lighting for food photos.
4. For fastest Groq responses during demo, use `llama-3.1-8b-instant` as `GROQ_MODEL`.

Local TF.js models in `public/models/` are **optional**; the app no longer depends on them for the live coach.
