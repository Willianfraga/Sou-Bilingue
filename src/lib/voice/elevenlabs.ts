const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

export const VOZ_POR_TUTOR: Record<string, string> = {
  "e315b919-9faf-4ebb-a786-db46a676c01e": "FGY2WhTYpPnrIDTdsKH5", // Clara — Laura, mais viva e comunicativa
  "2dff69b8-0df7-4740-b67e-4caa7bf38ecc": "bIHbv24MWmeRgasZH58o", // Diego — Will
  "2fbd2c7b-8613-44c1-961c-542b72f250e7": "cgSgspJ2msm6clMCkdW9", // Mei — Jessica
  "3af0510b-a5b5-40d9-9772-fd0fb6ba6943": "pqHfZKP75CvOlQylNhV4", // Seu Antônio — Bill
  "41396d05-5d7d-4913-866b-109f441b2e0b": "FGY2WhTYpPnrIDTdsKH5", // Luna — Laura
  "dbed74f6-38e3-414e-8ad7-4e508c73e839": "TX3LPaxmHKxFdv7VOQHJ", // Theo — Liam
};

const CLARA_ID = "e315b919-9faf-4ebb-a786-db46a676c01e";

function getVoiceSettings(tutorId: string) {
  if (tutorId === CLARA_ID) {
    return {
      stability: 0.3,
      similarity_boost: 0.8,
      style: 0.58,
      speed: 1.04,
      use_speaker_boost: true,
    };
  }

  return {
    stability: 0.52,
    similarity_boost: 0.78,
    style: 0.15,
    speed: 1,
    use_speaker_boost: true,
  };
}

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
        voice_settings: getVoiceSettings(tutorId),
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!resposta.ok || !resposta.body) {
    throw new Error(`Falha na ElevenLabs (${resposta.status}).`);
  }

  return resposta.body;
}
