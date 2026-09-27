const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

test('a rota pública /cadastro existe e usa Supabase signUp para registrar o aluno', () => {
  const cadastroFile = path.join(__dirname, '..', 'src', 'app', 'cadastro', 'page.tsx');
  assert.equal(fs.existsSync(cadastroFile), true);

  const cadastroPage = fs.readFileSync(cadastroFile, 'utf8');
  assert.equal(cadastroPage.includes('signUp'), true);
  assert.equal(cadastroPage.includes('nome'), true);
  assert.equal(cadastroPage.includes('email'), true);
  assert.equal(cadastroPage.includes('senha'), true);
});

test('o onboarding do aluno expõe o endpoint POST com idioma, plano e tutorId', () => {
  const onboardingFile = path.join(__dirname, '..', 'src', 'app', 'api', 'cadastro', 'onboarding', 'route.ts');
  assert.equal(fs.existsSync(onboardingFile), true);

  const onboardingRoute = fs.readFileSync(onboardingFile, 'utf8');
  assert.equal(onboardingRoute.includes('export async function POST'), true);
  assert.equal(onboardingRoute.includes('idioma'), true);
  assert.equal(onboardingRoute.includes('plano'), true);
  assert.equal(onboardingRoute.includes('tutorId'), true);
});

test('a tela de cadastro encaminha o novo usuário para o onboarding de aluno', () => {
  const cadastroPageFile = path.join(__dirname, '..', 'src', 'app', 'cadastro', 'page.tsx');
  const cadastroPage = fs.readFileSync(cadastroPageFile, 'utf8');
  assert.equal(cadastroPage.includes('/cadastro/onboarding'), true);
});
