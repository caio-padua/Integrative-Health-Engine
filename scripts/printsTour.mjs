import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const EMAIL = 'ceo@pawards.com.br';
const SENHA = 'senha123';
const OUT = path.resolve('screenshots');

const TELAS = [
  { nome: '1-login-master',           rota: '/admin/login',            autenticada: false },
  { nome: '2-dashboard-global-ceo',   rota: '/admin/dashboard-global', autenticada: true  },
  { nome: '3-pacientes',              rota: '/pacientes',              autenticada: true  },
  { nome: '4-farmacias-parmavault',   rota: '/admin/farmacias',        autenticada: true  },
  { nome: '5-agenda-semanal',         rota: '/agenda',                 autenticada: true  },
];

await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PW_EXEC || undefined,
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

// Login REST → pega o token e injeta no localStorage
const loginRes = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, senha: SENHA }),
});
if (!loginRes.ok) {
  console.error('login falhou', loginRes.status, await loginRes.text());
  process.exit(1);
}
const { token, usuario } = await loginRes.json();
console.log(`✓ login ok como ${usuario.nome}`);

// Página leva o token e seeda localStorage para sessões autenticadas
await ctx.addInitScript(({ token, usuario }) => {
  localStorage.setItem('pawards.auth.token', token);
  localStorage.setItem('pawards.auth.user', JSON.stringify(usuario));
}, { token, usuario });

for (const t of TELAS) {
  const page = await ctx.newPage();
  const url = `${BASE}${t.rota}`;
  console.log(`→ ${t.nome}  ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
  await page.waitForTimeout(2500);
  const file = path.join(OUT, `${t.nome}.jpeg`);
  await page.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 92 });
  const stat = await fs.stat(file);
  console.log(`   ✓ ${file}  (${(stat.size / 1024).toFixed(0)} KB)`);
  await page.close();
}
await browser.close();
console.log('done');
