import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppStep, Poem, RandomSeed } from "./types";
import { POEMS } from "./constants";
import {
  generateInterpretationAudio,
  generatePoemImage,
  getGeminiInterpretation,
} from "./services/geminiService";
import { unlock, playSfx, getAudioContext } from "./services/AudioGate";
import { SettingsModal } from "./components/SettingsModal";
import { findProgramById, PROGRAM_OPTIONS } from "./programs";
import logoUrl from "./logo.webp";

const FALLBACK_QUESTION_PLACEHOLDERS = [
  "教授如果問我『你為什麼適合這個科系？』我該怎麼回答？ / ถ้าอาจารย์ถามว่าทำไมฉันเหมาะกับสาขานี้ ฉันควรตอบอย่างไร?",
  "我現在最需要補強的是表達、邏輯，還是自信？ / ตอนนี้ฉันควรเสริมเรื่องการพูด ตรรกะ หรือความมั่นใจมากที่สุด?",
  "這次面試我該走穩重路線，還是主動出擊？ / สัมภาษณ์ครั้งนี้ฉันควรนิ่งไว้หรือรุกให้ชัด?",
];

const LOADING_MESSAGES = [
  "大師正在幫你調整面試氣場... / อาจารย์กำลังปรับสนามพลังสำหรับการสัมภาษณ์ของคุณ...",
  "正在把籤意翻成教授聽得懂的答案節奏... / กำลังแปลความหมายเซียมซีให้เป็นจังหวะคำตอบที่กรรมการเข้าใจ...",
  "正在對齊你的第一志願與你的說話方式... / กำลังจับจูนสาขาอันดับหนึ่งของคุณเข้ากับสไตล์การตอบ...",
  "正在檢查你該放大哪一種優勢... / กำลังดูว่าคุณควรขยายจุดเด่นแบบไหนในห้องสัมภาษณ์...",
];

const LINE_GROUP_URL =
  "https://line.me/ti/g2/BxpTQiXVr_u7P9FW0enF5QuyPT5VcpYs59n92g?utm_source=invitation&utm_medium=link_copy&utm_campaign=default";

const qrImageUrl = (size: number) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=6&qzone=2&data=${encodeURIComponent(LINE_GROUP_URL)}`;

const LineQrCard: React.FC<{ size?: "sm" | "lg" }> = ({ size = "sm" }) => {
  const px = size === "lg" ? 320 : 180;
  return (
    <a
      href={LINE_GROUP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center text-center"
      title="ISU Thailand 2026 - Freshmen Connect"
    >
      <div
        className="rounded-[2rem] p-[3px] shadow-[0_12px_60px_rgba(14,165,233,0.25)] group-hover:scale-[1.03] transition-transform duration-500"
        style={{
          background:
            "linear-gradient(135deg,#f59e0b,#fb7185,#38bdf8,#34d399,#facc15)",
        }}
      >
        <div className="bg-white rounded-[1.7rem] p-3 sm:p-4">
          <img
            src={qrImageUrl(px * 2)}
            alt="LINE QR Code - ISU Thailand 2026 Freshmen Connect"
            width={px}
            height={px}
            className="block"
            style={{ width: `${px}px`, height: `${px}px` }}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-cyan-200 font-bold tracking-wide">
        <span className="inline-block w-6 h-6 rounded-md bg-[#06C755] flex items-center justify-center text-white text-xs font-black">
          L
        </span>
        <span className={size === "lg" ? "text-lg" : "text-sm"}>
          ISU Thailand 2026 · Freshmen Connect
        </span>
      </div>
      <p
        className={`mt-1 ${
          size === "lg" ? "text-sm" : "text-xs"
        } text-slate-300`}
      >
        加入 LINE 社群，我們會把面試版籤詩結果傳給你！
      </p>
      <p
        className={`${size === "lg" ? "text-sm" : "text-xs"} text-slate-400`}
      >
        สแกนเข้ากลุ่ม LINE แล้วเราจะส่งผลเซียมซีเวอร์ชันสัมภาษณ์ให้คุณ
      </p>
    </a>
  );
};

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split("\n");
  return (
    <div className="interpretation-content text-slate-300">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) {
          return <h3 key={i}>{line.replace("### ", "")}</h3>;
        }
        if (line.startsWith("## ")) {
          return <h2 key={i}>{line.replace("## ", "")}</h2>;
        }
        if (line.startsWith("# ")) {
          return <h1 key={i}>{line.replace("# ", "")}</h1>;
        }
        const processedLine = line.split("**").map((part, index) =>
          index % 2 === 1 ? <strong key={index}>{part}</strong> : part,
        );
        return <p key={i}>{processedLine}</p>;
      })}
    </div>
  );
};

const AppIndex2: React.FC = () => {
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("GEMINI_API_KEY") || process.env.API_KEY || "",
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [step, setStep] = useState<AppStep>(AppStep.QUESTION);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [question, setQuestion] = useState("");
  const [currentPlaceholder, setCurrentPlaceholder] = useState("");
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [randomSeeds, setRandomSeeds] = useState<RandomSeed[]>([]);
  const [showSeeds, setShowSeeds] = useState(false);
  const [poemResult, setPoemResult] = useState<Poem | null>(null);
  const [thaiPoem, setThaiPoem] = useState<string[]>([]);
  const [interpretation, setInterpretation] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [poemImage, setPoemImage] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [customStyle, setCustomStyle] = useState("");
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);

  const selectedProgram = useMemo(
    () => findProgramById(selectedProgramId),
    [selectedProgramId],
  );
  const selectedSummaryTags = useMemo(
    () =>
      selectedProgram?.summary
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 5) || [],
    [selectedProgram],
  );

  useEffect(() => {
    generateNewSeeds();
  }, []);

  useEffect(() => {
    const pool = selectedProgram?.starterQuestions || FALLBACK_QUESTION_PLACEHOLDERS;
    setCurrentPlaceholder(pool[Math.floor(Math.random() * pool.length)]);
  }, [selectedProgramId]);

  const generateNewSeeds = () => {
    const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    const cardOptions = Array.from({ length: 22 }, (_, i) =>
      String.fromCharCode(65 + i),
    );

    const seeds: RandomSeed[] = Array.from({ length: 22 }, (_, i) => ({
      letter: cardOptions[i],
      number: numbers[i],
    }));
    setRandomSeeds(seeds);
  };

  const resetApp = () => {
    setQuestion("");
    setPoemResult(null);
    setThaiPoem([]);
    setInterpretation("");
    setPoemImage("");
    setCustomStyle("");
    setAudioBuffer(null);
    setAudioBlob(null);
    if (audioSourceRef.current) audioSourceRef.current.stop();
    setIsPlaying(false);
    generateNewSeeds();
    const pool = selectedProgram?.starterQuestions || FALLBACK_QUESTION_PLACEHOLDERS;
    setCurrentPlaceholder(pool[Math.floor(Math.random() * pool.length)]);
    setStep(AppStep.QUESTION);
  };

  const startVoiceInput = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    if (!("webkitSpeechRecognition" in window)) {
      alert(
        "您的瀏覽器不支援語音輸入功能。 / เบราว์เซอร์ของคุณไม่รองรับการป้อนเสียง",
      );
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = "th-TH";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setQuestion((prev) => prev + finalTranscript);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleNextStep = () => {
    if (isRecording) recognitionRef.current?.stop();
    if (!selectedProgram) {
      alert(
        "請先選擇申請系所（第一志願）。 / กรุณาเลือกสาขาอันดับหนึ่งก่อน",
      );
      return;
    }
    if (!question.trim()) {
      alert(
        "請先輸入你想問的面試問題。 / กรุณาพิมพ์คำถามเกี่ยวกับการสัมภาษณ์ก่อน",
      );
      return;
    }
    if (!apiKey) {
      alert(
        "請先設定 Google API Key 才能進行解籤。 / กรุณาตั้งค่า Google API Key ก่อนเริ่มดูเซียมซี",
      );
      setIsSettingsOpen(true);
      return;
    }
    setStep(AppStep.PICKER);
  };

  const handlePick = async (letter: string) => {
    if (!selectedProgram) return;

    const shuffleSoundUrl = new URL("./sound/shuffle.mp3", import.meta.url).href;

    await unlock();
    playSfx(shuffleSoundUrl, { volume: 0.8 });

    const seed = randomSeeds.find((item) => item.letter === letter);
    if (!seed) return;

    const poem = POEMS.find((item) => item.id === seed.number) || POEMS[0];
    setPoemResult(poem);
    setStep(AppStep.RESULT);

    setIsAnalyzing(true);
    setCurrentLoadingMessage(
      LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)],
    );
    const result = await getGeminiInterpretation(
      apiKey,
      question,
      poem,
      selectedProgram,
    );
    setThaiPoem(result.thaiPoem);
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
      setIsGeneratingAudio(false);
      playMasterVoice(audioResult.buffer);
    } else {
      setIsGeneratingAudio(false);
    }
  };

  const playMasterVoice = (passedBuffer?: AudioBuffer) => {
    const targetBuffer = passedBuffer || audioBuffer;
    if (!targetBuffer) return;

    if (isPlaying && !passedBuffer) {
      audioSourceRef.current?.stop();
      setIsPlaying(false);
      return;
    }

    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
    }

    if (!audioContextRef.current) {
      audioContextRef.current = getAudioContext();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = targetBuffer;
    source.connect(ctx.destination);
    source.onended = () => setIsPlaying(false);
    source.start();
    audioSourceRef.current = source;
    setIsPlaying(true);
  };

  const downloadAudio = () => {
    if (!audioBlob || !selectedProgram) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ISU_${selectedProgram.id}_interview_oracle_${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateImage = async () => {
    if (!poemResult || !selectedProgram) return;
    setIsGeneratingImage(true);
    const style =
      customStyle.trim() ||
      `stylized illustrated interview oracle poster for ${selectedProgram.shortCode}, symbolic, cinematic, editorial, non-photorealistic`;
    const img = await generatePoemImage(
      apiKey,
      poemResult,
      interpretation,
      style,
      logoUrl,
      selectedProgram,
    );
    setPoemImage(img);
    setIsGeneratingImage(false);
  };

  const downloadResult = () => {
    if (!selectedProgram) return;

    const formattedInterpretation = interpretation
      .split("\n")
      .map((line) => {
        if (line.startsWith("### ")) {
          return `<h3 style="color: #fcd34d; margin-top: 24px; font-size: 1.1rem; letter-spacing: 0.05em;">${line.replace("### ", "")}</h3>`;
        }
        if (line.startsWith("## ")) {
          return `<h2 style="color: #38bdf8; border-left: 4px solid #38bdf8; padding-left: 12px; margin-top: 32px; font-size: 1.4rem;">${line.replace("## ", "")}</h2>`;
        }
        if (line.trim() === "") return "<br>";
        const bolded = line.replace(
          /\*\*(.*?)\*\*/g,
          '<strong style="color: #f8fafc;">$1</strong>',
        );
        return `<p style="margin-bottom: 16px; line-height: 1.8; color: #cbd5e1;">${bolded}</p>`;
      })
      .join("");

    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ISU Interview Oracle - ${selectedProgram.shortCode}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap');
    body {
      font-family: 'Noto Sans TC', system-ui, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 30%),
        radial-gradient(circle at top right, rgba(251, 191, 36, 0.18), transparent 35%),
        linear-gradient(180deg, #07111f 0%, #0f172a 100%);
      color: #f1f5f9;
      margin: 0;
      padding: 24px;
      display: flex;
      justify-content: center;
    }
    .container {
      width: 100%;
      max-width: 860px;
      background: rgba(15, 23, 42, 0.88);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 36px;
      padding: 48px 40px;
      box-shadow: 0 24px 80px rgba(2, 6, 23, 0.55);
    }
    .eyebrow {
      display: inline-block;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(56, 189, 248, 0.12);
      color: #7dd3fc;
      font-size: 12px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 2.4rem;
      color: #f8fafc;
    }
    .program {
      color: #fcd34d;
      font-weight: 700;
      margin-bottom: 24px;
    }
    .question-box, .interpretation-section {
      border: 1px solid rgba(148, 163, 184, 0.18);
      background: rgba(15, 23, 42, 0.68);
      border-radius: 24px;
      padding: 24px;
    }
    .question-box { margin-bottom: 40px; }
    .poem-section { text-align: center; margin-bottom: 48px; }
    .poem-no {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 999px;
      background: rgba(251, 191, 36, 0.12);
      color: #fcd34d;
      margin-bottom: 24px;
      font-size: 0.85rem;
      font-weight: 700;
    }
    .poem-line {
      font-size: 2rem;
      font-weight: 700;
      margin: 12px 0 4px;
      letter-spacing: 0.15em;
    }
    .poem-line-thai {
      font-size: 1.05rem;
      color: #bae6fd;
      font-style: italic;
      margin-bottom: 18px;
    }
    .interpretation-section { margin-top: 40px; }
    .image-section { text-align: center; margin-top: 40px; }
    .poem-img {
      width: 100%;
      max-width: 500px;
      border-radius: 24px;
      border: 6px solid rgba(56, 189, 248, 0.15);
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.6);
    }
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid rgba(148, 163, 184, 0.16);
      color: #94a3b8;
      font-size: 0.9rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="eyebrow">Interview Edition</div>
    <h1>第一志願面試籤</h1>
    <div class="program">${selectedProgram.firstChoiceLabel}</div>

    <div class="question-box">
      <strong>我想最快在台灣完成什麼事情？ / ฉันอยากทำอะไรให้สำเร็จเร็วที่สุดที่ไต้หวัน?</strong><br><br>
      「${question}」
    </div>

    <div class="poem-section">
      <div class="poem-no">觀音靈籤 第 ${poemResult?.id} 籤 / เซียมซีใบที่ ${poemResult?.id}</div>
      ${poemResult?.content
        .map(
          (line, idx) => `
        <div class="poem-line">${line}</div>
        ${thaiPoem[idx] ? `<div class="poem-line-thai">${thaiPoem[idx]}</div>` : ""}
      `,
        )
        .join("")}
    </div>

    <div class="interpretation-section">
      ${formattedInterpretation}
    </div>

    ${
      poemImage
        ? `
    <div class="image-section">
      <img class="poem-img" src="${poemImage}" alt="Interview Oracle Art">
    </div>
    `
        : ""
    }

    <div class="footer">
      <p>ISU Interview Oracle · ${selectedProgram.shortCode}</p>
      <p>Powered by Gemini AI</p>
    </div>
  </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ISU_${selectedProgram.id}_interview_oracle_${new Date()
      .toISOString()
      .slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("GEMINI_API_KEY", key);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 min-h-screen flex flex-col items-center relative">
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="absolute top-6 right-6 p-3 text-slate-300 hover:text-cyan-300 transition-colors z-40 bg-slate-900/60 rounded-full backdrop-blur-sm border border-slate-700/50"
        title="設定 API Key / ตั้งค่า API Key"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSave={saveApiKey}
      />

      <header className="text-center mb-10 w-full">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-200 tracking-[0.25em] uppercase text-xs font-bold mb-5">
          <span>Interview Edition</span>
          <span className="text-cyan-500/70">001</span>
        </div>
        <a
          href="https://oica.ishouuniversity.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block group mb-5"
          title="義守大學國際事務處 / สำนักงานกิจการต่างประเทศ ISU"
        >
          <img
            src={logoUrl}
            alt="I-Shou University Logo"
            className="w-48 md:w-64 mx-auto drop-shadow-[0_0_40px_rgba(56,189,248,0.28)] group-hover:scale-105 transition-transform duration-500"
          />
        </a>
        <h1 className="text-5xl md:text-7xl font-black tracking-[0.08em] text-slate-50">
          第一志願面試籤
        </h1>
        <p className="mt-3 text-cyan-200/80 tracking-[0.35em] uppercase text-sm">
          ISU Interview Oracle
        </p>
        <p className="mt-4 text-slate-300 text-lg">
          你不是來選科系，你是來確認自己該怎麼被看見。
        </p>
        <p className="mt-1 text-slate-400">
          คุณไม่ได้มาเลือกสาขาอีกแล้ว แต่กำลังหาวิธีให้กรรมการเห็นตัวตนของคุณชัดขึ้น
        </p>
      </header>

      <main className="w-full bg-slate-900/55 backdrop-blur-2xl rounded-[2.8rem] p-8 md:p-10 border border-slate-700/50 shadow-[0_30px_120px_rgba(2,6,23,0.45)]">
        {step === AppStep.QUESTION && (
          <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
              <section className="rounded-[2rem] border border-slate-700/60 bg-[linear-gradient(135deg,rgba(8,47,73,0.88),rgba(15,23,42,0.78))] p-7">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/75 mb-4">
                  申請系所 (第一志願)
                </p>
                <div className="relative">
                  <select
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    className="w-full appearance-none rounded-[1.5rem] border border-cyan-300/20 bg-slate-950/70 px-5 py-5 pr-14 text-base text-slate-100 outline-none transition-all focus:border-cyan-300/55 focus:ring-2 focus:ring-cyan-300/15"
                  >
                    <option value="">請選擇你的第一志願 / เลือกสาขาอันดับหนึ่ง</option>
                    {PROGRAM_OPTIONS.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.firstChoiceLabel}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-cyan-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-400">
                  先把第一志願鎖定，後面的籤詩解讀與圖片都會照這個學程的氣質去生成。
                </p>
              </section>

              <section className="rounded-[2rem] border border-amber-300/15 bg-[linear-gradient(160deg,rgba(120,53,15,0.35),rgba(15,23,42,0.82))] p-7">
                <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70 mb-4">
                  面試前你要帶進場的氣質
                </p>
                {selectedProgram ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-black text-amber-100">
                          {selectedProgram.shortCode}
                        </h2>
                        <p className="text-slate-300 mt-1">{selectedProgram.degreeTitle}</p>
                      </div>
                      <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] bg-amber-400/10 text-amber-200 border border-amber-300/20">
                        {selectedProgram.heroTitle}
                      </span>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {selectedSummaryTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-slate-600/80 bg-slate-950/40 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-cyan-100/85"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="mt-5 text-sm leading-7 text-slate-300">
                      {selectedProgram.interviewFocus}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400 leading-7">
                    先選擇你的第一志願，這裡會立刻切換成對應的面試氣質與能力關鍵字。
                  </p>
                )}
              </section>
            </div>

            <section className="rounded-[2rem] border border-slate-700/60 bg-slate-950/40 p-7">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70 mb-3">
                    你現在最想問的
                  </p>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-50 leading-tight">
                    我想最快在台灣完成什麼事情？
                  </h2>
                </div>
                <p className="text-sm text-slate-400 max-w-xl">
                  直接問你現在最想趕快做到的目標就可以。
                  系統會用中泰雙語把籤意轉成你現在用得上的方向。
                </p>
              </div>

              <div className="relative group">
                <textarea
                  className="w-full h-52 p-7 rounded-[1.8rem] bg-slate-950/70 border border-slate-700 focus:border-cyan-300/55 focus:ring-2 focus:ring-cyan-300/15 outline-none text-lg transition-all text-slate-100 placeholder:text-slate-600 shadow-inner resize-none"
                  placeholder={currentPlaceholder}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                <button
                  onClick={startVoiceInput}
                  className={`absolute bottom-5 right-5 p-4 rounded-full transition-all shadow-lg ${
                    isRecording
                      ? "bg-rose-500 text-white animate-pulse scale-110"
                      : "bg-cyan-300 text-slate-950 hover:bg-cyan-200 hover:scale-105"
                  }`}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
                  </svg>
                </button>
              </div>
            </section>

            <div className="flex justify-center">
              <button
                onClick={handleNextStep}
                className="px-14 py-5 bg-[linear-gradient(90deg,#f59e0b,#facc15,#67e8f9)] text-slate-950 rounded-full text-xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(103,232,249,0.25)]"
              >
                進入抽牌場 / เข้าสู่การจับไพ่
              </button>
            </div>

            <div className="pt-8 border-t border-slate-700/50 flex flex-col items-center">
              <LineQrCard size="sm" />
            </div>
          </div>
        )}

        {step === AppStep.PICKER && selectedProgram && (
          <div className="space-y-10 animate-in zoom-in duration-700 text-center">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/75 mb-4">
                {selectedProgram.shortCode} Interview Field
              </p>
              <h2 className="text-4xl font-black text-amber-100 mb-3">
                把問題交給手，讓直覺替你選一張牌
              </h2>
              <p className="text-slate-300 mb-2">
                你選的不是科系，是你今天要帶進面試室的能量。
              </p>
              <p className="text-slate-500">
                คุณไม่ได้เลือกสาขาอีกแล้ว แต่กำลังเลือกพลังที่อยากพาเข้าไปในห้องสัมภาษณ์
              </p>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
              {randomSeeds.map((seed) => (
                <button
                  key={seed.letter}
                  onClick={() => handlePick(seed.letter)}
                  className="aspect-square flex items-center justify-center border border-cyan-300/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),rgba(15,23,42,0.92))] rounded-[1.6rem] text-2xl font-black text-cyan-100 hover:bg-cyan-300 hover:text-slate-950 hover:border-cyan-200 transition-all transform hover:scale-110 hover:-rotate-6 shadow-[0_8px_24px_rgba(2,6,23,0.35)]"
                >
                  {seed.letter}
                </button>
              ))}
            </div>

            <div className="pt-10 border-t border-slate-700/50 flex flex-col items-center gap-4">
              <div className="flex gap-4">
                <button
                  onClick={generateNewSeeds}
                  className="px-4 py-2 bg-slate-800 text-cyan-200 rounded-full text-xs hover:bg-slate-700 transition-all flex items-center border border-slate-700"
                >
                  <span className="mr-1">🔄</span> 重排牌面 / สุ่มใหม่
                </button>
                <button
                  onClick={() => setShowSeeds(!showSeeds)}
                  className="text-xs text-slate-500 hover:text-cyan-300 transition-colors italic border-b border-transparent hover:border-cyan-300"
                >
                  {showSeeds
                    ? "收起底牌 / ซ่อนเลขสุ่ม"
                    : "查看抽籤隨機數 / ดูเลขสุ่ม"}
                </button>
              </div>
              {showSeeds && (
                <div className="mt-6 grid grid-cols-5 text-[10px] gap-2 text-slate-400 bg-slate-950/60 p-6 rounded-2xl border border-slate-700/30">
                  {randomSeeds.map((seed) => (
                    <span key={seed.letter} className="bg-slate-800/50 p-1 rounded">
                      {seed.letter}: {seed.number}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === AppStep.RESULT && poemResult && selectedProgram && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="text-center space-y-4">
              <div className="inline-flex flex-wrap items-center justify-center gap-3">
                <span className="inline-block px-5 py-2 bg-cyan-300/10 text-cyan-200 border border-cyan-300/20 rounded-full text-sm font-bold uppercase tracking-widest">
                  {selectedProgram.shortCode}
                </span>
                <span className="inline-block px-5 py-2 bg-amber-400/10 text-amber-200 border border-amber-300/20 rounded-full text-sm font-bold uppercase tracking-widest">
                  Oracle No. {poemResult.id}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-50">
                {selectedProgram.firstChoiceLabel}
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                這張牌不是要你轉彎，而是幫你找出該怎麼進場、怎麼說話、怎麼讓教授記住你。
              </p>
            </div>

            <div className="space-y-6 text-center">
              {poemResult.content.map((line, idx) => (
                <div key={idx} className="space-y-2">
                  <p className="text-4xl md:text-5xl font-serif text-amber-100 tracking-[0.2em] drop-shadow-lg">
                    {line}
                  </p>
                  {thaiPoem[idx] && (
                    <p className="text-lg md:text-xl font-light text-cyan-100/75 tracking-wide italic">
                      {thaiPoem[idx]}
                    </p>
                  )}
                </div>
              ))}
              {isAnalyzing && thaiPoem.length === 0 && (
                <p className="text-sm text-slate-500 italic animate-pulse">
                  กำลังแต่งบทกลอนไทยให้เข้ากับพลังสัมภาษณ์...
                </p>
              )}
            </div>

            <div className="p-8 md:p-10 bg-slate-950/55 rounded-[2rem] border border-slate-700/50 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.4)]"></div>
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h3 className="text-2xl font-black text-cyan-200 flex items-center italic">
                  <span className="text-3xl mr-3">🧭</span> 面試對照 / Interview Read
                </h3>

                {(audioBuffer || isGeneratingAudio) && (
                  <div className="flex gap-2">
                    {audioBlob && !isGeneratingAudio && (
                      <button
                        onClick={downloadAudio}
                        className="flex items-center justify-center w-10 h-10 rounded-full border border-cyan-300/30 bg-slate-800 text-cyan-200 hover:bg-slate-700 transition-all"
                        title="下載泰文音檔 / ดาวน์โหลดเสียงภาษาไทย"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => playMasterVoice()}
                      disabled={isGeneratingAudio}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-full border border-cyan-300/30 transition-all ${
                        isPlaying
                          ? "bg-cyan-300 text-slate-950"
                          : "bg-slate-800 text-cyan-200 hover:bg-slate-700"
                      }`}
                    >
                      {isGeneratingAudio ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : isPlaying ? (
                        <>
                          <span className="text-xl">⏸️</span>
                          <span className="text-sm font-bold">停止播放 / หยุด</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xl">🔊</span>
                          <span className="text-sm font-bold">播放泰文總結 / เล่นเสียงไทย</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {isAnalyzing ? (
                <div className="flex flex-col items-center py-16 space-y-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-cyan-300/20 border-t-cyan-300 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">🜂</div>
                  </div>
                  <p className="text-cyan-200/80 font-light italic animate-pulse">
                    {currentLoadingMessage}
                  </p>
                </div>
              ) : (
                <MarkdownRenderer content={interpretation} />
              )}
            </div>

            <div className="space-y-6">
              {poemImage && (
                <div className="flex flex-col items-center space-y-4">
                  <div
                    className="relative p-2 bg-[linear-gradient(180deg,#67e8f9,#0f766e)] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-zoom-in"
                    onClick={() => setIsImageZoomed(true)}
                  >
                    <img
                      src={poemImage}
                      alt="面試籤詩意象"
                      className="max-w-md w-full rounded-2xl grayscale-[0.12] hover:grayscale-0 transition-all duration-700"
                    />
                  </div>
                  <p className="text-slate-500 text-xs tracking-widest uppercase">
                    Interview Oracle Art
                  </p>
                </div>
              )}

              <div className="flex flex-col items-center space-y-4 max-w-xl mx-auto">
                <div className="w-full relative">
                  <input
                    type="text"
                    placeholder={`自訂圖片風格，例如 ${selectedProgram.shortCode} illustrated poster / ใส่สไตล์ภาพเพิ่ม`}
                    value={customStyle}
                    onChange={(e) => setCustomStyle(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-950/80 border border-slate-700 rounded-2xl text-cyan-50 placeholder:text-slate-600 focus:border-cyan-300 outline-none transition-all shadow-inner"
                  />
                </div>

                <button
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage}
                  className="group flex items-center space-x-3 px-10 py-4 bg-slate-950 border border-slate-700 text-cyan-200 rounded-full hover:bg-cyan-300 hover:text-slate-950 transition-all disabled:opacity-50 shadow-xl w-full justify-center"
                >
                  {isGeneratingImage ? (
                    <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span className="text-2xl group-hover:rotate-12 transition-transform">
                      🎨
                    </span>
                  )}
                  <span className="font-bold">
                    {poemImage
                      ? "調整風格重新生成 / สร้างภาพใหม่"
                      : `生成 ${selectedProgram.shortCode} 面試籤詩卡 / สร้างภาพเซียมซีสัมภาษณ์`}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center pt-10 border-t border-slate-700/50 gap-6">
              <button
                onClick={downloadResult}
                className="w-full sm:w-auto px-10 py-4 bg-cyan-300 text-slate-950 rounded-full font-black hover:bg-cyan-200 transition-all flex items-center justify-center shadow-lg"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                存檔帶走 / บันทึกผล
              </button>
              <button
                onClick={resetApp}
                className="w-full sm:w-auto px-10 py-4 bg-slate-700 text-slate-100 rounded-full font-bold hover:bg-slate-600 transition-all border border-slate-600 shadow-md"
              >
                再問一次 / ถามใหม่อีกครั้ง
              </button>
            </div>

            <div className="mt-12 pt-10 border-t border-slate-700/50">
              <div className="text-center mb-6 space-y-1">
                <h3 className="text-2xl md:text-3xl font-black text-cyan-200">
                  我們也可以把這張結果傳給你 📲
                </h3>
                <p className="text-slate-300">
                  掃 QR 加入 LINE 社群，之後你可以把這張面試版籤詩帶去跟學生討論。
                </p>
                <p className="text-slate-400 text-sm">
                  สแกน QR เข้ากลุ่ม LINE แล้วเราจะส่งผลเวอร์ชันสัมภาษณ์ให้ทางแชท
                </p>
              </div>
              <div className="flex justify-center">
                <LineQrCard size="lg" />
              </div>
            </div>
          </div>
        )}
      </main>

      {isImageZoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300"
          onClick={() => setIsImageZoomed(false)}
        >
          <div className="relative max-w-full max-h-full flex flex-col items-center">
            <img
              src={poemImage}
              alt="面試籤詩意象大圖"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border-2 border-slate-700"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-cyan-200/80 mt-4 font-light tracking-widest uppercase text-sm">
              Interview Oracle Art
            </p>
            <button
              className="absolute -top-12 right-0 text-slate-400 hover:text-white p-2"
              onClick={() => setIsImageZoomed(false)}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <footer className="mt-14 text-slate-500 text-sm text-center space-y-2">
        <p className="tracking-widest">© ISU Interview Oracle · Powered by Gemini AI</p>
        <p className="hover:text-cyan-300 transition-colors">
          <a
            href="https://weisfx0705.github.io/chiawei/"
            target="_blank"
            rel="noopener noreferrer"
          >
            義守大學陳嘉暐老師開發
          </a>
        </p>
        <p className="opacity-40 italic">
          「這版不是幫你換志願，而是幫你把第一志願說得更像你自己。」
        </p>
        <p className="opacity-30 text-xs">Version: 04/27/2026 · index2 interview edition</p>
      </footer>
    </div>
  );
};

export default AppIndex2;
