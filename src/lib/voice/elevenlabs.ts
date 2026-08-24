const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

export const VOZ_POR_TUTOR: Record<string, string> = {
  "e315b919-9faf-4ebb-a786-db46a676c01e": "EXAVITQu4vr4xnSDxMaL", // Clara — Sarah
  "2dff69b8-0df7-4740-b67e-4caa7bf38ecc": "bIHbv24MWmeRgasZH58o", // Diego — Will
  "2fbd2c7b-8613-44c1-961c-542b72f250e7": "cgSgspJ2msm6clMCkdW9", // Mei — Jessica
  "3af0510b-a5b5-40d9-9772-fd0fb6ba6943": "pqHfZKP75CvOlQylNhV4", // Seu Antônio — Bill
};

export function getVoiceId(tutorId: string) {
  return VOZ_POR_TUTOR[tutorId] ?? VOZ_POR_TUTOR["e315b919-9faf-4ebb-a786-db46a676c01e"];
}

export async function sintetizarVoz({ texto, tutorId }: { texto: string; tutorId: string }) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY não configurada.");

  const resposta = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${getVoiceId(tutorId)}/stream?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: texto,
        model_id: "eleven_flash_v2_5",
        voice_settings: {
          stability: 0.52,
          similarity_boost: 0.78,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!resposta.ok || !resposta.body) {
    throw new Error(`Falha na ElevenLabs (${resposta.status}).`);
  }

  return resposta.body;
}
