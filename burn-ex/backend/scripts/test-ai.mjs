import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE = 'http://localhost:5000';
const email = 'demo_ai_test@burnex.local';
const password = 'TestPass123!';

const log = (label, data) => {
  console.log(`\n=== ${label} ===`);
  console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
};

async function getToken() {
  try {
    const { data } = await axios.post(`${BASE}/api/auth/register`, {
      name: 'Demo User',
      email,
      password,
      weight: 70,
      height: 175,
      age: 25,
      gender: 'male',
      goal: 'muscle_gain',
      activityLevel: 'moderate',
    });
    return data.token;
  } catch {
    const { data } = await axios.post(`${BASE}/api/auth/login`, { email, password });
    return data.token;
  }
}

async function main() {
  const health = await axios.get(`${BASE}/api/health`);
  log('HEALTH', health.data);

  const token = await getToken();
  log('AUTH', 'Token obtained');

  const headers = { Authorization: `Bearer ${token}` };

  const status = await axios.get(`${BASE}/api/ai/status`, { headers });
  log('AI STATUS', status.data);

  const summary = await axios.post(
    `${BASE}/api/ai/workout/summary`,
    {
      exerciseType: 'pushup',
      exerciseLabel: 'Push-up',
      reps: 12,
      durationSeconds: 180,
      formScore: 78,
      fatigueScore: 35,
      injuryRisk: 15,
      riskFactors: [],
    },
    { headers }
  );
  log('WORKOUT SUMMARY', summary.data);

  const tip = await axios.post(
    `${BASE}/api/ai/workout/form-tip`,
    {
      exerciseLabel: 'Push-up',
      lastRepScore: 62,
      formIssue: 'Go lower',
      fatigueLevel: 'moderate',
    },
    { headers }
  );
  log('FORM TIP', tip.data);

  const sugg = await axios.get(`${BASE}/api/nutrition/suggestions`, { headers });
  log('NUTRITION SUGGESTIONS', sugg.data);

  console.log('\n✅ All AI endpoint checks completed.');
}

main().catch((err) => {
  console.error('\n❌ Test failed:', err.response?.status, err.response?.data || err.message);
  if (err.code) console.error('code:', err.code);
  process.exit(1);
});
