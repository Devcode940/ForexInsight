
'use server';
/**
 * @fileOverview A Genkit flow for converting trade analysis text to speech using Gemini 2.5 TTS.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import wav from 'wav';
import { Readable } from 'stream';

const AnalysisTTSInputSchema = z.object({
  text: z.string().describe('The trade analysis text to convert to speech.'),
  voice: z.enum(['Algenib', 'Achernar', 'Sirius', 'Canopus']).optional().default('Algenib'),
});

const AnalysisTTSOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio as a data URI.'),
});

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

export async function generateAnalysisAudio(input: z.infer<typeof AnalysisTTSInputSchema>) {
  return analysisTTSFlow(input);
}

const analysisTTSFlow = ai.defineFlow(
  {
    name: 'analysisTTSFlow',
    inputSchema: AnalysisTTSInputSchema,
    outputSchema: AnalysisTTSOutputSchema,
  },
  async (input) => {
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
      prompt: input.text,
    });

    if (!media || !media.url) {
      throw new Error('No media returned from TTS model');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    const wavBase64 = await toWav(audioBuffer);

    return {
      audioDataUri: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);
