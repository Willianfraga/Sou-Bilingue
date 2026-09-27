const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

test('a resolução de voz não deve usar fallback silencioso para Clara nem duplicar o mesmo voice id na Luna', () => {
  const voiceFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'voice', 'elevenlabs.ts'), 'utf8');

  assert.equal(voiceFile.includes('"41396d05-5d7d-4913-866b-109f441b2e0b": "FGY2WhTYpPnrIDTdsKH5"'), false);
  assert.equal(voiceFile.includes('"41396d05-5d7d-4913-866b-109f441b2e0b": "EXAVITQu4vr4xnSDxMaL"'), true);
  assert.equal(voiceFile.includes('throw new Error(`Nenhuma voz ElevenLabs compatível foi encontrada para o tutor ${tutorId}.`)'), true);

  const uniqueVoiceIds = Array.from(voiceFile.matchAll(/\"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\": \"([A-Za-z0-9]{10,})\"/g)).map((match) => match[1]);
  assert.equal(uniqueVoiceIds.length, new Set(uniqueVoiceIds).size);
});
