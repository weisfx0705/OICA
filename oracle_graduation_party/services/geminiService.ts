import { GoogleGenAI, Modality, Type } from "@google/genai";
import { InterpretationResult, Poem } from "../types";

const ISU_GRADUATION_CONTEXT = `
I-Shou University is a comprehensive private university in Kaohsiung, Taiwan.
The audience is international graduates who are finishing their studies and
stepping into work, further study, family expectations, migration decisions,
relationships, identity shifts, and adult life. The current physical setting is
a 2026 graduation party, but the core purpose is a future-facing blessing and
life-direction oracle for graduates.

Event year: 2026. Treat this as the graduate's current transition year when
giving timing, first-year advice, and next-chapter blessings.

Use the Guanyin oracle poem as the symbolic source. Interpret it as a blessing
and a practical life memo, not as deterministic fortune telling.

Possible future directions to consider:
- Staying in Taiwan: suitable when the poem points to patience, local networks,
  industry paths, language growth, healthcare, hospitality, manufacturing,
  semiconductor, education, or relationships built during university.
- Going abroad: suitable when the poem points to travel, expansion, risk-taking,
  reinvention, graduate study, cross-border careers, or leaving a too-small pond.
- Returning home: suitable when the poem points to family duty, rootedness,
  leadership, accumulated knowledge, or bringing Taiwan experience back home.
- Hybrid life: suitable when the poem points to bridges, timing, alliances,
  remote work, multicultural identity, and careers across more than one place.

Tone:
- English only for interpretation, except the original Chinese poem lines.
- Warm, witty, ceremonial, practical, and emotionally generous.
- Can mention good signs and difficult signs, but always turn them into practical
  advice for the graduate's next chapter.
- Do not promise wealth, visas, jobs, admission, marriage, or guaranteed success.
`;

const EVENT_YEAR = "2026";

function enforceEventYear(text: string): string {
  return text.replace(/\b20(?!26)\d{2}\b/g, EVENT_YEAR);
}

function buildGraduationInterpretationPrompt(
  question: string,
  poem: Poem,
  englishPoem: string[],
): string {
  const poemLinesNumbered = poem.content
    .map((line, index) => `Line ${index + 1}: ${line}`)
    .join("\n");
  const englishLinesNumbered = englishPoem
    .map((line, index) => `Line ${index + 1}: ${line}`)
    .join("\n");

  return `
You are the English-speaking oracle guide for I-Shou University international
graduates in 2026. The reading may happen at a graduation party, but the party
is only the location. The important purpose is to give each graduate a warm,
funny, useful blessing and future-oriented life reading.

Graduate's question or intention:
"${question}"

Selected Guanyin oracle: No. ${poem.id}
Original Chinese poem:
${poemLinesNumbered}

Fixed English translation already provided by the app. Use this translation as
reference only. Do not translate the poem again.
${englishLinesNumbered}

Context:
${ISU_GRADUATION_CONTEXT}

Return a JSON object with exactly one field:

markdown: Markdown in English only, using this exact structure:

## Oracle Reading

### Line 1: {original Chinese line}
2-3 sentences explaining what this line means for the graduate's future, with a
clear callback to the graduate's actual question.

### Line 2: {original Chinese line}
2-3 sentences explaining what this line means for the graduate's future, with a
clear callback to the graduate's actual question.

### Line 3: {original Chinese line}
2-3 sentences explaining what this line means for the graduate's future, with a
clear callback to the graduate's actual question.

### Line 4: {original Chinese line}
2-3 sentences explaining what this line means for the graduate's future, with a
clear callback to the graduate's actual question.

## Future Direction
- **Best path:** Choose one of "Stay in Taiwan", "Go abroad", "Return home", or
  "Build a hybrid life". Give a clear reason based on both the poem and the
  graduate's question.
- **Question callback:** Quote or paraphrase the user's question in one sentence,
  then explain what the oracle is really answering.
- **Good sign:** One practical opportunity the graduate should notice, tied to
  the user's question.
- **Warning sign:** One risk or bad habit to avoid. Make it humorous but kind,
  and tie it to the user's question.
- **First move:** One concrete action to take in the next 30 days, tied to the
  user's question.
- **Graduate blessing:** One memorable, funny, warm sentence suitable for a new
  graduate stepping into the next chapter.

Rules:
- The answer must be English only, except when quoting the original Chinese poem.
- Do not translate the poem. The app already has a fixed English translation.
- You must respond to the user's exact question or intention every time. Even if
  the question is absurd, silly, impossible, supernatural, romantic, chaotic, or
  unrelated to career plans, treat it as symbolic material and connect it to a
  useful 2026 graduate life reading. Do not refuse, ignore, sanitize, or
  replace the question with a generic graduation topic.
- The reading should understand 2026 as the graduate's current year and the
  first year of the next chapter.
- Do not mention any calendar year except 2026.
- Keep it personal to the graduate's question.
- Do not over-explain Buddhism or temple ritual. This is a respectful symbolic
  oracle for graduates, not a formal religious service.
- Do not mention Thailand or Thai culture.
- Do not guarantee any result.
`;
}

export const getGeminiInterpretation = async (
  apiKey: string,
  question: string,
  poem: Poem,
  englishPoem: string[],
): Promise<InterpretationResult> => {
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: buildGraduationInterpretationPrompt(question, poem, englishPoem),
      config: {
        temperature: 0.88,
        topP: 0.95,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            markdown: { type: Type.STRING },
          },
          required: ["markdown"],
        },
      },
    });

    const raw = response.text || "";
    const parsed = JSON.parse(raw);

    return {
      markdown: enforceEventYear(typeof parsed.markdown === "string" ? parsed.markdown : ""),
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      markdown:
        "## Oracle Reading\n\nThe signal is unclear, which probably means the universe is checking the graduation seating chart. Please try again.\n\n## Future Direction\n- **First move:** Take a breath, ask again, and do not let one failed API call define your destiny.",
    };
  }
};

function extractFutureContext(interpretation: string): string {
  const match = interpretation.match(/## Future Direction([\s\S]*)/);
  return (match ? match[0] : interpretation.slice(-1800)).slice(0, 1800);
}

async function imageUrlToInlineData(
  url?: string,
): Promise<{ mimeType: string; data: string } | null> {
  if (!url) return null;

  if (url.startsWith("data:")) {
    const [metadata, data] = url.split(",");
    const mimeType = metadata.match(/^data:(.*?);base64$/)?.[1] || "image/webp";
    return { mimeType, data };
  }

  const response = await fetch(url);
  const blob = await response.blob();
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  return { mimeType: blob.type || "image/webp", data };
}

export const generatePoemImage = async (
  apiKey: string,
  poem: Poem,
  interpretation: string,
  customStyle = "ISU international graduation blessing oracle card, luminous editorial illustration",
  logoUrl?: string,
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  const poemText = poem.content.join(" ");
  const futureContext = extractFutureContext(interpretation);
  let logoInlineData: { mimeType: string; data: string } | null = null;

  try {
    logoInlineData = await imageUrlToInlineData(logoUrl);
  } catch (error) {
    console.warn("Logo load failed; generating image without logo reference.", error);
  }

  const prompt = `
Create a premium vertical oracle card for I-Shou University international
graduates in 2026. The card may be used at a graduation party, but the party is
only the location; the image should focus on future blessing, transition,
identity, courage, and next-chapter life direction.

Visual style: ${customStyle}.
Guanyin oracle poem meaning: "${poemText}".
Future reading context:
${futureContext}

The image should feel like a blessing for graduates: transition, courage,
friendship, Kaohsiung, campus memory, world paths, and a bright next chapter.
Reflect the symbolic meaning of the selected poem. Some cards may suggest
staying in Taiwan, some may suggest going abroad, returning home, or building a
cross-border life.

Composition:
- Vertical 3:4 poster/card.
- Refined, festive, ceremonial, youthful.
- Include visual hints of I-Shou University, graduation, international students,
  Kaohsiung light, paths, gates, ships, stars, mountains, books, or lantern-like
  abstract blessing elements when appropriate.
- No Thai landmarks, Thai flags, Thai script, Thai temple imagery, elephants,
  tuk-tuks, or Thai travel symbols.
- Avoid photorealistic real people. Use illustration, collage, painterly poster,
  symbolic editorial art, or fantasy poster style.

Logo rule:
- Incorporate the attached logo.webp as an official visual element. Preserve it
  exactly as provided. Do not redraw, restyle, crop, retype, or fake it.
- Place the logo naturally on a badge, ribbon, lower-corner seal, banner, or
  floating medallion. Keep it legible.
- The logo is the only readable/text-like element allowed.

Strict text rule:
- Apart from the attached ISU logo, the final image must contain zero text.
- No Chinese characters, no English words, no numbers, no signatures, no
  captions, no slogans, no watermarks, no fake letters.
- Do not render "2026" or any other digits. If the year matters, show it only
  through non-textual graduation mood, seasonal light, confetti, paths, or
  symbolic rainbow elements.
- Scrolls, books, plaques, certificates, and signs must be blank or carry only
  abstract ornamental patterns.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          { text: prompt },
          ...(logoInlineData ? [{ inlineData: logoInlineData }] : []),
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return "";
  } catch (error) {
    console.error("Image Generation Error:", error);
    return "";
  }
};

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function createWavBlob(samples: Uint8Array, sampleRate: number, numChannels: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length, true);

  const rawBytes = new Uint8Array(buffer);
  rawBytes.set(samples, 44);

  return new Blob([buffer], { type: "audio/wav" });
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateInterpretationAudio = async (
  apiKey: string,
  interpretation: string,
  existingContext?: AudioContext,
): Promise<{ buffer: AudioBuffer; blob: Blob } | null> => {
  const ai = new GoogleGenAI({ apiKey });

  const summaryResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Rewrite the following oracle reading into a spoken English graduation-oracle script, 120-160 words.
Requirements:
1. English only. No Markdown headings.
2. Warm, funny, and suitable for 2026 I-Shou University international graduates. The party is only the location; focus on the graduate's future direction.
3. Mention the core oracle reminder and the graduate's future direction.
4. Do not guarantee visas, jobs, money, love, or success.
5. Do not mention any calendar year except 2026.
Oracle reading: ${interpretation}`,
  });

  const summaryText =
    enforceEventYear(responseText(summaryResponse.text)) ||
    "This oracle says your next chapter is open, but your suitcase should contain courage, patience, and at least one practical plan. Choose the road that lets your talent breathe, and remember: graduation is not the end of homework, it is just life assigning a group project.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [
        {
          parts: [
            {
              text: `Read aloud in English only. Use a warm, witty 2026 graduation oracle voice. Clear pace, celebratory but not cheesy. The party is only the location; focus on the graduate's future blessing. Do not mention any calendar year except 2026. Do not read emoji or Markdown: ${summaryText}`,
            },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Puck" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const rawData = decodeBase64(base64Audio);
      const audioCtx =
        existingContext ||
        new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000,
        });

      const audioBuffer = await decodeAudioData(rawData, audioCtx, 24000, 1);
      const audioBlob = createWavBlob(rawData, 24000, 1);

      return { buffer: audioBuffer, blob: audioBlob };
    }
  } catch (error) {
    console.error("TTS Error:", error);
  }
  return null;
};

function responseText(text: string | undefined): string {
  return String(text || "").trim();
}
