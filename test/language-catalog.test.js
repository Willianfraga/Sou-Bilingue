const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

test('o catálogo de idiomas mantém espanhol, inglês, francês, italiano e mandarim', () => {
  const typeFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'types.ts'), 'utf8');
  const selectorFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'aluno', 'SeletorIdioma.tsx'), 'utf8');

  assert.equal(typeFile.includes('frances'), true);
  assert.equal(typeFile.includes('italiano'), true);
  assert.equal(selectorFile.includes('Francês'), true);
  assert.equal(selectorFile.includes('Italiano'), true);

  assert.equal(typeFile.includes('espanhol'), true);
  assert.equal(typeFile.includes('ingles'), true);
  assert.equal(typeFile.includes('mandarim'), true);
  assert.equal(selectorFile.includes('Espanhol'), true);
  assert.equal(selectorFile.includes('Inglês'), true);
  assert.equal(selectorFile.includes('Mandarim'), true);
});
