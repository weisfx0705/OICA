import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppStep, Poem, RandomSeed } from "./types";
import { getEnglishPoem, POEMS } from "./constants";
import {
  generateInterpretationAudio,
  generatePoemImage,
  getGeminiInterpretation,
} from "./services/geminiService";
import { getAudioContext, playSfx, unlock } from "./services/AudioGate";
import { SettingsModal } from "./components/SettingsModal";
import logoUrl from "./logo.webp";

const EVENT_YEAR = "2026";

const QUESTION_PLACEHOLDERS = [
  "Should I stay in Taiwan after graduation, or should I take my next chance abroad?",
  "What should I focus on in my first year after leaving ISU?",
  "How do I choose between a stable job, graduate school, and a risky dream?",
  "What kind of future is calling me now?",
  "What should I let go of before I leave campus?",
  "Where will my international student experience become useful?",
];

const LOADING_MESSAGES = [
  "The oracle is comparing your future with your graduation photos...",
  "Reading the poem, checking the universe, and politely ignoring your panic...",
  "Turning ancient Chinese poetry into post-graduation life advice...",
  "Asking Guanyin whether your suitcase should stay in Taiwan or cross another border...",
  "Preparing a blessing with just enough comedy to survive adult life...",
];

const CARD_OPTIONS = Array.from({ length: 22 }, (_, index) =>
  String.fromCharCode(65 + index),
);

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split("\n");

  return (
    <div className="interpretation-content text-stone-100/85">
      {lines.map((line, index) => {
        if (line.startsWith("### ")) {
          return <h3 key={index}>{line.replace("### ", "")}</h3>;
        }
        if (line.startsWith("## ")) {
          return <h2 key={index}>{line.replace("## ", "")}</h2>;
        }
        if (line.trim().startsWith("- ")) {
          const body = line.trim().replace("- ", "");
          const processed = body.split("**").map((part, partIndex) =>
            partIndex % 2 === 1 ? <strong key={partIndex}>{part}</strong> : part,
          );
          return <p key={index} className="pl-4 border-l border-emerald-300/20">{processed}</p>;
        }
        const processedLine = line.split("**").map((part, partIndex) =>
          partIndex % 2 === 1 ? <strong key={partIndex}>{part}</strong> : part,
        );
        return line.trim() ? <p key={index}>{processedLine}</p> : <br key={index} />;
      })}
    </div>
  );
};

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("GEMINI_API_KEY") || process.env.API_KEY || "",
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [step, setStep] = useState<AppStep>(AppStep.QUESTION);
  const [question, setQuestion] = useState("");
  const [currentPlaceholder, setCurrentPlaceholder] = useState("");
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [randomSeeds, setRandomSeeds] = useState<RandomSeed[]>([]);
  const [showSeeds, setShowSeeds] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [poemResult, setPoemResult] = useState<Poem | null>(null);
  const [englishPoem, setEnglishPoem] = useState<string[]>([]);
  const [interpretation, setInterpretation] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [poemImage, setPoemImage] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [customStyle, setCustomStyle] = useState("");
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);

  const generateNewSeeds = useCallback(() => {
    const numbers = Array.from({ length: 100 }, (_, index) => index + 1);
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    const seeds: RandomSeed[] = CARD_OPTIONS.map((letter, index) => ({
      letter,
      number: numbers[index],
    }));
    setRandomSeeds(seeds);
  }, []);

  useEffect(() => {
    generateNewSeeds();
    setCurrentPlaceholder(
      QUESTION_PLACEHOLDERS[Math.floor(Math.random() * QUESTION_PLACEHOLDERS.length)],
    );

    return () => {
      audioSourceRef.current?.stop();
    };
  }, [generateNewSeeds]);

  const resetApp = () => {
    setQuestion("");
    setPoemResult(null);
    setEnglishPoem([]);
    setInterpretation("");
    setPoemImage("");
    setSelectedLetter(null);
    setCustomStyle("");
    setAudioBuffer(null);
    setAudioBlob(null);
    audioSourceRef.current?.stop();
    setIsPlaying(false);
    generateNewSeeds();
    setCurrentPlaceholder(
      QUESTION_PLACEHOLDERS[Math.floor(Math.random() * QUESTION_PLACEHOLDERS.length)],
    );
    setStep(AppStep.QUESTION);
  };

  const startVoiceInput = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    if (!("webkitSpeechRecognition" in window)) {
      alert("This browser does not support voice input.");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) setQuestion((prev) => `${prev}${finalTranscript}`);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleNextStep = () => {
    if (isRecording) recognitionRef.current?.stop();
    if (!question.trim()) {
      alert("Please write or speak your question first.");
      return;
    }
    if (!apiKey) {
      alert("Please set your Google Gemini API key first.");
      setIsSettingsOpen(true);
      return;
    }
    setStep(AppStep.PICKER);
  };

  const handlePick = async (letter: string) => {
    const shuffleSoundUrl = new URL("./sound/shuffle.mp3", import.meta.url).href;

    await unlock();
    playSfx(shuffleSoundUrl, { volume: 0.8 });

    setSelectedLetter(letter);
    const seed = randomSeeds.find((item) => item.letter === letter);
    if (!seed) return;

    const poem = POEMS.find((item) => item.id === seed.number) || POEMS[0];
    const fixedEnglishPoem = getEnglishPoem(poem.id);
    setPoemResult(poem);
    setEnglishPoem(fixedEnglishPoem);
    setStep(AppStep.RESULT);

    setIsAnalyzing(true);
    setCurrentLoadingMessage(
      LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)],
    );
    const result = await getGeminiInterpretation(apiKey, question, poem, fixedEnglishPoem);
    setInterpretation(result.markdown);
    setIsAnalyzing(false);

    if (!audioContextRef.current) {
      audioContextRef.current = getAudioContext();
    }

    setIsGeneratingAudio(true);
    const audioResult = await generateInterpretationAudio(
      apiKey,
      result.markdown,
      audioContextRef.current,
    );

    if (audioResult) {
      setAudioBuffer(audioResult.buffer);
      setAudioBlob(audioResult.blob);
      playMasterVoice(audioResult.buffer);
    }
    setIsGeneratingAudio(false);
  };

  const playMasterVoice = (passedBuffer?: AudioBuffer) => {
    const targetBuffer = passedBuffer || audioBuffer;
    if (!targetBuffer) return;

    if (isPlaying && !passedBuffer) {
      audioSourceRef.current?.stop();
      setIsPlaying(false);
      return;
    }

    audioSourceRef.current?.stop();
    if (!audioContextRef.current) audioContextRef.current = getAudioContext();

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = targetBuffer;
    source.connect(ctx.destination);
    source.onended = () => setIsPlaying(false);
    source.start();
    audioSourceRef.current = source;
    setIsPlaying(true);
  };

  const downloadAudio = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ISU_graduation_oracle_TTS_${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateImage = async () => {
    if (!poemResult) return;
    setIsGeneratingImage(true);
    const style =
      customStyle.trim() ||
      "cute rainbow ISU international graduation blessing oracle card, luminous editorial illustration, playful ceremonial colors";
    const img = await generatePoemImage(apiKey, poemResult, interpretation, style, logoUrl);
    setPoemImage(img);
    setIsGeneratingImage(false);
  };

  const downloadResult = () => {
    const formattedInterpretation = interpretation
      .split("\n")
      .map((line) => {
        if (line.startsWith("### ")) {
          return `<h3>${line.replace("### ", "")}</h3>`;
        }
        if (line.startsWith("## ")) {
          return `<h2>${line.replace("## ", "")}</h2>`;
        }
        if (line.trim() === "") return "<br>";
        const bolded = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        return `<p>${bolded}</p>`;
      })
      .join("");

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ISU Graduation Oracle Result</title>
  <style>
    body { margin: 0; padding: 28px; background: #12211f; color: #fff7df; font-family: Georgia, 'Times New Roman', serif; }
    .container { max-width: 840px; margin: 0 auto; border-radius: 28px; padding: 40px; background: linear-gradient(#172521,#172521) padding-box, linear-gradient(120deg,#ff7aa2,#ffb86b,#ffe66d,#7cf2bd,#69d7ff,#c69cff) border-box; border: 3px solid transparent; box-shadow: 0 28px 80px rgba(0,0,0,.35); }
    .eyebrow { color: #7cf2bd; letter-spacing: .24em; text-transform: uppercase; font: 700 12px system-ui, sans-serif; }
    h1 { margin: 12px 0 8px; font-size: 42px; }
    h2 { color: #ffe66d; border-left: 4px solid #69d7ff; padding-left: 12px; margin-top: 32px; }
    h3 { color: #7cf2bd; margin-top: 24px; }
    p { line-height: 1.75; color: #e8dfc8; }
    strong { color: #fff7cf; }
    .question, .reading { border: 1px solid rgba(255,255,255,.18); border-radius: 20px; padding: 22px; background: rgba(255,255,255,.05); }
    .poem { text-align: center; margin: 36px 0; }
    .chinese { font-size: 30px; letter-spacing: .18em; margin: 18px 0 4px; color: #fff7cf; }
    .english { font-size: 17px; color: #a7dbc1; font-style: italic; margin: 0 0 18px; }
    img { max-width: 520px; width: 100%; border-radius: 22px; display: block; margin: 32px auto 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(215,180,100,.22); color: #9b927a; text-align: center; font: 13px system-ui, sans-serif; }
  </style>
</head>
<body>
  <div class="container">
    <div class="eyebrow">${EVENT_YEAR} I-Shou University International Graduate Oracle</div>
    <h1>Graduation Oracle</h1>
    <p>Card ${selectedLetter || ""} selected Guanyin Oracle No. ${poemResult?.id}</p>
    <div class="question"><strong>Question:</strong><br>${question}</div>
    <div class="poem">
      ${poemResult?.content
        .map(
          (line, index) => `
        <div class="chinese">${line}</div>
        ${englishPoem[index] ? `<div class="english">${englishPoem[index]}</div>` : ""}
      `,
        )
        .join("")}
    </div>
    <div class="reading">${formattedInterpretation}</div>
    ${poemImage ? `<img src="${poemImage}" alt="Graduation Oracle Art">` : ""}
    <div class="footer">ISU Graduation Oracle ${EVENT_YEAR} · Powered by Gemini AI · For blessing and reflection only</div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ISU_graduation_oracle_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("GEMINI_API_KEY", key);
  };

  return (
    <div className="min-h-screen px-4 py-10 text-stone-100">
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="fixed right-5 top-5 z-40 rounded-full border border-white/20 bg-stone-950/55 p-3 text-stone-100 backdrop-blur transition hover:scale-105 hover:text-amber-100"
        title="Settings"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSave={saveApiKey}
      />

      <header className="mx-auto mb-10 max-w-5xl text-center">
        <a
          href="https://oica.ishouuniversity.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
          title="I-Shou University Office of International and Cross-Strait Affairs"
        >
          <img
            src={logoUrl}
            alt="I-Shou University Logo"
            className="mx-auto mb-6 w-40 rounded-[1.6rem] bg-white/90 p-2 shadow-[0_18px_70px_rgba(105,215,255,0.26)] ring-4 ring-white/15 md:w-56"
          />
        </a>
        <p className="mx-auto inline-flex rounded-full bg-white/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.26em] text-emerald-100 ring-1 ring-white/15">
          {EVENT_YEAR} Future Blessing Edition
        </p>
        <h1 className="rainbow-title mt-4 text-5xl font-black tracking-wide md:text-7xl">
          ISU Graduation Oracle
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-stone-300">
          Pick a letter, receive a Guanyin oracle poem, and turn it into a
          playful blessing for your next chapter after I-Shou University.
        </p>
      </header>

      <main className="rainbow-shell soft-confetti mx-auto max-w-5xl rounded-[2rem] bg-[#172521] p-6 shadow-[0_32px_120px_rgba(0,0,0,0.42)] backdrop-blur md:p-10">
        {step === AppStep.QUESTION && (
          <div className="space-y-8">
            <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rainbow-panel rounded-3xl p-7">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-100">
                  How it works
                </p>
                <div className="mt-6 space-y-5 text-stone-300">
                  <p>1. Ask one honest post-graduation question.</p>
                  <p>2. Pick one letter from A to V.</p>
                  <p>3. The letter maps to one of the 100 Guanyin oracle poems using the same shuffled random structure as the original project.</p>
                </div>
              </div>

              <div className="rainbow-panel rounded-3xl p-7">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-emerald-100">
                  Your question
                </p>
                <textarea
                  className="h-52 w-full resize-none rounded-3xl border border-white/15 bg-stone-950/60 p-6 text-lg text-stone-100 outline-none transition focus:border-sky-200/70 focus:ring-4 focus:ring-sky-200/10 placeholder:text-stone-500"
                  placeholder={currentPlaceholder}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                />
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={startVoiceInput}
                    className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition ${
                      isRecording
                        ? "bg-rose-500 text-white"
                        : "border border-white/15 bg-stone-900/80 text-stone-100 hover:border-pink-200/50 hover:text-pink-100"
                    }`}
                  >
                    {isRecording ? "Stop voice input" : "Use voice input"}
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="rounded-full bg-[linear-gradient(90deg,#ff7aa2,#ffb86b,#ffe66d,#7cf2bd,#69d7ff,#c69cff)] bg-[length:220%_auto] px-8 py-3 font-black text-stone-950 shadow-[0_12px_44px_rgba(255,122,162,0.22)] transition hover:scale-[1.02]"
                  >
                    Enter the oracle hall
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {step === AppStep.PICKER && (
          <div className="space-y-9 text-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.34em] text-emerald-100">
                Pick one letter · {EVENT_YEAR}
              </p>
              <h2 className="rainbow-title mt-3 text-4xl font-black">
                A small choice, a large excuse to receive advice.
              </h2>
              <p className="mt-3 text-stone-400">
                The letters are shuffled against the 100 Guanyin oracle poems.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
              {randomSeeds.map((seed) => (
                <button
                  key={seed.letter}
                  onClick={() => handlePick(seed.letter)}
                  className="aspect-square rounded-2xl border border-white/15 bg-[linear-gradient(145deg,rgba(255,122,162,0.18),rgba(255,230,109,0.12),rgba(105,215,255,0.16),rgba(10,18,16,0.92))] text-2xl font-black text-amber-50 shadow-[0_12px_28px_rgba(0,0,0,0.28)] transition hover:-rotate-3 hover:scale-105 hover:border-white/45 hover:bg-amber-200 hover:text-stone-950"
                >
                  {seed.letter}
                </button>
              ))}
            </div>

            <div className="border-t border-stone-100/10 pt-7">
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  onClick={generateNewSeeds}
                  className="rounded-full border border-white/15 bg-stone-950/55 px-5 py-2 text-sm text-stone-200 hover:text-amber-100"
                >
                  Shuffle again
                </button>
                <button
                  onClick={() => setShowSeeds(!showSeeds)}
                  className="text-sm italic text-stone-400 hover:text-sky-200"
                >
                  {showSeeds ? "Hide random map" : "Show random map"}
                </button>
              </div>
              {showSeeds && (
                <div className="mx-auto mt-5 grid max-w-2xl grid-cols-5 gap-2 rounded-2xl border border-stone-100/10 bg-stone-950/45 p-5 text-xs text-stone-400 sm:grid-cols-8">
                  {randomSeeds.map((seed) => (
                    <span key={seed.letter} className="rounded bg-stone-900/80 px-2 py-1">
                      {seed.letter}: {seed.number}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === AppStep.RESULT && poemResult && (
          <div className="space-y-11">
            <section className="text-center">
              <div className="inline-flex flex-wrap justify-center gap-3">
                <span className="rounded-full border border-emerald-200/25 bg-emerald-200/10 px-5 py-2 text-sm font-bold uppercase tracking-[0.22em] text-emerald-100">
                  Card {selectedLetter}
                </span>
                <span className="rounded-full border border-pink-200/25 bg-pink-200/10 px-5 py-2 text-sm font-bold uppercase tracking-[0.22em] text-pink-100">
                  {EVENT_YEAR}
                </span>
                <span className="rounded-full border border-amber-200/25 bg-amber-200/10 px-5 py-2 text-sm font-bold uppercase tracking-[0.22em] text-amber-100">
                  Guanyin Oracle No. {poemResult.id}
                </span>
              </div>

              <div className="mt-8 space-y-6">
                {poemResult.content.map((line, index) => (
                  <div key={line} className="space-y-2">
                    <p className="text-4xl font-bold tracking-[0.18em] text-amber-50 drop-shadow-[0_8px_24px_rgba(255,230,109,0.16)] md:text-5xl">
                      {line}
                    </p>
                    {englishPoem[index] && (
                      <p className="mx-auto max-w-2xl text-lg italic leading-8 text-emerald-100/75">
                        {englishPoem[index]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rainbow-panel relative overflow-hidden rounded-3xl p-7 md:p-9">
              <div className="absolute left-0 top-0 h-full w-2 bg-[linear-gradient(180deg,#ff7aa2,#ffe66d,#7cf2bd,#69d7ff,#c69cff)]"></div>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-black text-emerald-100">
                  The Reading
                </h2>
                {(audioBuffer || isGeneratingAudio) && (
                  <div className="flex gap-2">
                    {audioBlob && !isGeneratingAudio && (
                      <button
                        onClick={downloadAudio}
                        className="rounded-full border border-white/15 bg-stone-900 px-4 py-2 text-sm font-bold text-stone-100 hover:text-amber-100"
                      >
                        Download audio
                      </button>
                    )}
                    <button
                      onClick={() => playMasterVoice()}
                      disabled={isGeneratingAudio}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                        isPlaying
                          ? "bg-emerald-200 text-stone-950"
                          : "border border-white/15 bg-stone-900 text-stone-100 hover:text-emerald-100"
                      }`}
                    >
                    {isGeneratingAudio ? "Generating audio..." : isPlaying ? "Stop" : "Play oracle read"}
                    </button>
                  </div>
                )}
              </div>

              {isAnalyzing ? (
                <div className="flex flex-col items-center py-14">
                  <div className="h-14 w-14 animate-spin rounded-full border-4 border-sky-200/15 border-t-pink-200"></div>
                  <p className="mt-6 animate-pulse text-center text-emerald-100/75">
                    {currentLoadingMessage}
                  </p>
                </div>
              ) : (
                <MarkdownRenderer content={interpretation} />
              )}
            </section>

            <section className="space-y-6">
              {poemImage && (
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={() => setIsImageZoomed(true)}
                    className="rounded-3xl bg-[linear-gradient(135deg,#ff7aa2,#ffe66d,#7cf2bd,#69d7ff,#c69cff)] p-2 shadow-[0_22px_55px_rgba(0,0,0,0.45)]"
                  >
                    <img
                      src={poemImage}
                      alt="Graduation oracle card"
                      className="w-full max-w-md rounded-2xl"
                    />
                  </button>
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                    Generated graduation blessing card
                  </p>
                </div>
              )}

              <div className="mx-auto flex max-w-xl flex-col gap-4">
                <input
                  type="text"
                  placeholder="Optional image style, e.g. cinematic paper collage, Art Deco campus blessing"
                  value={customStyle}
                  onChange={(event) => setCustomStyle(event.target.value)}
                  className="rounded-2xl border border-white/15 bg-stone-950/65 px-5 py-4 text-stone-100 outline-none transition focus:border-sky-200/55 placeholder:text-stone-600"
                />
                <button
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage}
                  className="rounded-full border border-white/15 bg-[linear-gradient(90deg,#ff7aa2,#ffb86b,#ffe66d,#7cf2bd,#69d7ff,#c69cff)] bg-[length:220%_auto] px-8 py-4 font-black text-stone-950 transition hover:scale-[1.02] disabled:opacity-50"
                >
                  {isGeneratingImage
                    ? "Generating image..."
                    : poemImage
                      ? "Regenerate blessing card"
                      : "Generate ISU blessing card"}
                </button>
              </div>
            </section>

            <section className="flex flex-col justify-center gap-4 border-t border-stone-100/10 pt-8 sm:flex-row">
              <button
                onClick={downloadResult}
                className="rounded-full bg-emerald-200 px-8 py-4 font-black text-stone-950 hover:bg-emerald-100"
              >
                Save result as HTML
              </button>
              <button
                onClick={resetApp}
                className="rounded-full border border-white/15 bg-stone-900 px-8 py-4 font-bold text-stone-100 hover:text-amber-100"
              >
                Ask again
              </button>
            </section>
          </div>
        )}
      </main>

      {isImageZoomed && (
        <div
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/95 p-4"
          onClick={() => setIsImageZoomed(false)}
        >
          <img
            src={poemImage}
            alt="Graduation oracle card enlarged"
            className="max-h-[88vh] max-w-full rounded-2xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      <footer className="mx-auto mt-12 max-w-4xl text-center text-sm text-stone-500">
        <p>ISU Graduation Oracle {EVENT_YEAR} · Powered by Gemini AI · For reflection, blessing, and future direction.</p>
        <p className="mt-2">
          <a
            href="https://weisfx0705.github.io/chiawei/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-100"
          >
            Created by Chia-wei Chen, I-Shou University
          </a>
        </p>
      </footer>
    </div>
  );
};

export default App;
