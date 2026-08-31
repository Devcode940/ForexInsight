'use server';
/**
 * @fileOverview A Genkit flow for converting trade analysis text to speech using Gemini TTS.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import wav from 'wav';

// --- Constants ---
const MAX_TEXT_LENGTH = 2000;
const AUDIO_SAMPLE_RATE = 24000;
const AUDIO_CHANNELS = 1;
const AUDIO_SAMPLE_WIDTH = 2; // bytes per sample (16-bit PCM)

// --- Schemas ---
const AnalysisTTSInputSchema = z.object({
  text: z
    .string()
    .max(MAX_TEXT_LENGTH, `Text must be ${MAX_TEXT_LENGTH} characters or less`)
    .describe('The trade analysis text to convert to speech.'),
  voice: z
    .enum(['Algenib', 'Achernar', 'Sirius', 'Canopus'])
    .optional()
    .default('Algenib'),
});

const AnalysisTTSOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio as a base64 data URI (WAV format).'),
});

export type AnalysisTTSInput = z.infer<typeof AnalysisTTSInputSchema>;
export type AnalysisTTSOutput = z.infer<typeof AnalysisTTSOutputSchema>;

// --- Helpers ---

/**
 * Convert raw PCM buffer to a WAV-formatted base64 string.
 * The WAV header allows browsers to decode and play the audio correctly.
 */
function pcmToWavBase64(
  pcmData: Buffer,
  channels: number = AUDIO_CHANNELS,
  sampleRate: number = AUDIO_SAMPLE_RATE,
  sampleWidth: number = AUDIO_SAMPLE_WIDTH
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!pcmData || pcmData.length === 0) {
      reject(new Error('Empty PCM buffer provided'));
      return;
    }

    const writer = new wav.Writer({
      channels,
      sampleRate,
      bitDepth: sampleWidth * 8,
    });

    const chunks: Buffer[] = [];

    writer.on('error', (err: Error) => {
      reject(new Error(`WAV encoding failed: ${err.message}`));
    });

    writer.on('data', (d: Buffer) => {
      chunks.push(d);
    });

    writer.on('end', () => {
      try {
        resolve(Buffer.concat(chunks).toString('base64'));
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Buffer concat failed'));
      }
    });

    try {
      writer.write(pcmData);
      writer.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error('WAV write failed'));
    }
  });
}

/**
 * Extract base64 PCM data from a data URI.
 * Handles both standard "data:audio/pcm;base64,..." and other formats.
 */
function extractBase64FromDataUri(uri: string): string {
  const commaIndex = uri.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('Invalid data URI: missing comma separator');
  }
  const base64 = uri.substring(commaIndex + 1);
  if (!base64 || base64.length < 4) {
    throw new Error('Invalid data URI: empty base64 payload');
  }
  return base64;
}

// --- Flow Definition ---
const analysisTTSFlow = ai.defineFlow(
  {
    name: 'analysisTTSFlow',
    inputSchema: AnalysisTTSInputSchema,
    outputSchema: AnalysisTTSOutputSchema,
  },
  async (input): Promise<AnalysisTTSOutput> => {
    // Trim and guard against empty input
    const trimmedText = input.text.trim();
    if (!trimmedText) {
      throw new Error('Empty text provided for TTS generation');
    }

    try {
      const { media } = await ai.generate({
        model: googleAI.model('gemini-2.5-flash-preview-tts'),
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: input.voice },
            },
          },
        },
        prompt: trimmedText,
      });

      if (!media || !media.url) {
        throw new Error('TTS model returned no audio media');
      }

      const base64Pcm = extractBase64FromDataUri(media.url);
      const pcmBuffer = Buffer.from(base64Pcm, 'base64');

      if (pcmBuffer.length === 0) {
        throw new Error('Decoded PCM buffer is empty');
      }

      const wavBase64 = await pcmToWavBase64(pcmBuffer);

      return {
        audioDataUri: `data:audio/wav;base64,${wavBase64}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[AnalysisTTS] Generation failed: ${message}`);
      throw new Error(`Audio generation failed: ${message}`);
    }
  }
);

export async function generateAnalysisAudio(
  input: AnalysisTTSInput
): Promise<AnalysisTTSOutput> {
  return analysisTTSFlow(input);
}
