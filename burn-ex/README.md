# Burn-Ex — AI Fitness Platform

Hackathon-ready fitness app with **MediaPipe live pose coaching**, **Groq AI** text features, and **Hugging Face** food vision.

## Quick start

### 1. Backend
```bash
cd burn-ex/backend
cp .env.example .env   # add GROQ_API_KEY + HF_API_TOKEN
npm install
npm run seed:met       # once — seeds MET values
npm run dev            # http://localhost:5000
```

### 2. Frontend
```bash
cd burn-ex/frontend
npm install
npm run dev            # http://localhost:5173
```

### 3. Register & test
- Create account with **weight, height, age, goal**
- **Live Workout Tracker** — camera, reps, form score, Groq summary on Stop
- **Nutrition** — food photo (HF → MobileNet fallback), Groq meal suggestions

See **[AI_SETUP.md](./AI_SETUP.md)** for API keys, architecture, and demo checklist.

## Stack

| Layer | Tech |
|-------|------|
| Pose / reps | MediaPipe (browser) |
| Form & calories | Rule-based (browser) |
| Coaching text | Groq API (server) |
| Food photos | Hugging Face `nateraw/food` + MobileNet fallback |
| API | Express + MongoDB + JWT |

## Privacy

Camera and pose processing stay **on-device**. Groq receives text context only. Food images are sent to your backend → HF when server vision is used.
