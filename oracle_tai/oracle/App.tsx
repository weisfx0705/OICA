
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppStep, Poem, RandomSeed, InterpretationResult } from './types';
import { POEMS, SVGS } from './constants';
import { getGeminiInterpretation, generatePoemImage, generateInterpretationAudio } from './services/geminiService';
import { unlock, playSfx, getAudioContext } from './services/AudioGate';
import { SettingsModal } from './components/SettingsModal';
import logoUrl from './logo.webp';

// 隨機範例清單
const QUESTION_PLACEHOLDERS = [
  "我適合去台灣讀什麼科系？ / ฉันเหมาะกับเรียนสาขาอะไรที่ไต้หวัน?",
  "我該選商管、媒體、工程還是觀光？ / ควรเลือกบริหาร สื่อ วิศวะ หรือท่องเที่ยวดี?",
  "如果我中文不好，還能去義守大學嗎？ / ถ้าภาษาจีนยังไม่ดี จะไปเรียนที่ ISU ได้ไหม?",
  "我想在台灣找工作，該走哪條路？ / ถ้าอยากทำงานที่ไต้หวัน ควรเลือกทางไหน?",
  "我適合半導體、AI 或工程嗎？ / ฉันเหมาะกับสายเซมิคอนดักเตอร์ AI หรือวิศวะไหม?",
  "我適合媒體、設計或娛樂產業嗎？ / ฉันเหมาะกับสายสื่อ ดีไซน์ หรือบันเทิงไหม?",
  "我想讀餐旅觀光，未來有發展嗎？ / ถ้าเรียนการโรงแรมและท่องเที่ยว อนาคตดีไหม?",
  "我想去高雄讀書，這個決定對嗎？ / การไปเรียนที่เกาสงเป็นทางเลือกที่ใช่ไหม?"
];

// LINE 社群連結（ISU Thailand 2026 - Freshmen Connect）
const LINE_GROUP_URL = "https://line.me/ti/g2/BxpTQiXVr_u7P9FW0enF5QuyPT5VcpYs59n92g?utm_source=invitation&utm_medium=link_copy&utm_campaign=default";

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
        className="rounded-3xl p-[3px] shadow-[0_10px_50px_rgba(34,197,94,0.35)] group-hover:scale-[1.03] transition-transform duration-500"
        style={{ background: 'linear-gradient(135deg,#22c55e,#34d399,#22d3ee,#a78bfa,#f472b6)' }}
      >
        <div className="bg-white rounded-[22px] p-3 sm:p-4">
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
      <div className="mt-4 flex items-center gap-2 text-green-300 font-bold tracking-wide">
        <span className="inline-block w-6 h-6 rounded-md bg-[#06C755] flex items-center justify-center text-white text-xs font-black">L</span>
        <span className={size === "lg" ? "text-lg" : "text-sm"}>ISU Thailand 2026 · Freshmen Connect</span>
      </div>
      <p className={`mt-1 ${size === "lg" ? "text-sm" : "text-xs"} text-slate-300`}>
        加入 LINE 社群，我們會把籤詩結果傳給你！
      </p>
      <p className={`${size === "lg" ? "text-sm" : "text-xs"} text-slate-400`}>
        สแกนเข้ากลุ่ม LINE แล้วเราจะส่งผลเซียมซีให้คุณ
      </p>
    </a>
  );
};

const LOADING_MESSAGES = [
  "大師正在把籤詩翻成泰文招生雷達... / กำลังแปลเซียมซีเป็นเรดาร์แนะแนวภาษาไทย...",
  "正在比對你的問題與義守大學科系地圖... / กำลังจับคู่คำถามของคุณกับแผนที่สาขาของ ISU...",
  "正在連線高雄、泰國與觀音的三方會議... / กำลังเชื่อมสัญญาณ เกาสง ไทย และเจ้าแม่กวนอิม...",
  "正在檢查你適合工程、商管、媒體還是餐旅... / กำลังดูว่าคุณเหมาะกับวิศวะ บริหาร สื่อ หรือการโรงแรม...",
  "大師正在用很認真的表情做招生匹配... / อาจารย์กำลังจับคู่สาขาให้ด้วยสีหน้าจริงจังมาก..."
];

// 簡單的 Markdown 渲染組件 (手動轉換基本的 ## 和 ** )
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  return (
    <div className="interpretation-content text-slate-300">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) {
          return <h3 key={i}>{line.replace('### ', '')}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i}>{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={i}>{line.replace('# ', '')}</h1>;
        }
        // 處理粗體
        const processedLine = line.split('**').map((part, index) =>
          index % 2 === 1 ? <strong key={index}>{part}</strong> : part
        );
        return <p key={i}>{processedLine}</p>;
      })}
    </div>
  );
};

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [step, setStep] = useState<AppStep>(AppStep.QUESTION);
  const [question, setQuestion] = useState('');
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [randomSeeds, setRandomSeeds] = useState<RandomSeed[]>([]);
  const [showSeeds, setShowSeeds] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [poemResult, setPoemResult] = useState<Poem | null>(null);
  const [thaiPoem, setThaiPoem] = useState<string[]>([]);
  const [interpretation, setInterpretation] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [poemImage, setPoemImage] = useState<string>('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [customStyle, setCustomStyle] = useState<string>('');
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  // Audio states
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    generateNewSeeds();
    setCurrentPlaceholder(QUESTION_PLACEHOLDERS[Math.floor(Math.random() * QUESTION_PLACEHOLDERS.length)]);
    return () => {
      if (audioSourceRef.current) audioSourceRef.current.stop();
    };
  }, []);

  const generateNewSeeds = useCallback(() => {
    // 產生 1-100 的數字陣列
    const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
    // Fisher-Yates shuffle 洗牌算法
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    // Tiangan (10) and Dizhi (12)
    const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const CARD_OPTIONS = [...TIANGAN, ...DIZHI]; // Total 22

    // 取前 22 個不重複的數字配對給 Tiangan/Dizhi
    const seeds: RandomSeed[] = Array.from({ length: 22 }, (_, i) => ({
      letter: CARD_OPTIONS[i],
      number: numbers[i]
    }));
    setRandomSeeds(seeds);
  }, []);

  const resetApp = () => {
    setQuestion('');
    setPoemResult(null);
    setThaiPoem([]);
    setInterpretation('');
    setPoemImage('');
    setSelectedLetter(null);
    setCustomStyle('');
    setAudioBuffer(null);
    setAudioBlob(null);
    if (audioSourceRef.current) audioSourceRef.current.stop();
    setIsPlaying(false);
    generateNewSeeds();
    setCurrentPlaceholder(QUESTION_PLACEHOLDERS[Math.floor(Math.random() * QUESTION_PLACEHOLDERS.length)]);
    setStep(AppStep.QUESTION);
  };

  const startVoiceInput = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    if (!('webkitSpeechRecognition' in window)) {
      alert('您的瀏覽器不支援語音輸入功能。 / เบราว์เซอร์ของคุณไม่รองรับการป้อนเสียง');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setQuestion(prev => prev + finalTranscript);
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
    if (!question.trim()) {
      alert('請先輸入或訴說您的問題。 / กรุณาพิมพ์หรือพูดคำถามของคุณก่อน');
      return;
    }
    if (!apiKey) {
      alert('請先設定 Google API Key 才能進行解籤。 / กรุณาตั้งค่า Google API Key ก่อนเริ่มดูเซียมซี');
      setIsSettingsOpen(true);
      return;
    }
    setStep(AppStep.PICKER);
  };

  const handlePick = async (letter: string) => {
    // 1. Play sound immediately on user interaction
    // Using import.meta.url to ensure correct path resolution for assets
    const shuffleSoundUrl = new URL('./sound/shuffle.mp3', import.meta.url).href;

    // Unlock and play sound (await unlock ensures context is valid)
    // We await here to catch the user gesture for the AudioContext resume
    await unlock();
    playSfx(shuffleSoundUrl, { volume: 0.8 });

    setSelectedLetter(letter);
    const seed = randomSeeds.find(s => s.letter === letter);
    if (!seed) return;

    const poem = POEMS.find(p => p.id === seed.number) || POEMS[0];
    setPoemResult(poem);
    setStep(AppStep.RESULT);

    setIsAnalyzing(true);
    setCurrentLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    const result = await getGeminiInterpretation(apiKey, question, poem);
    setThaiPoem(result.thaiPoem);
    setInterpretation(result.markdown);
    setIsAnalyzing(false);


    // Initialize/Get AudioContext via AudioGate
    // Sync local ref with AudioGate's context
    if (!audioContextRef.current) {
      audioContextRef.current = getAudioContext();
    }

    setIsGeneratingAudio(true);
    const audioResult = await generateInterpretationAudio(apiKey, result.markdown, audioContextRef.current);

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

    // Use persistent AudioContext from AudioGate if available, or fallback to ref
    if (!audioContextRef.current) {
      audioContextRef.current = getAudioContext();
    }
    const ctx = audioContextRef.current;

    // 移動端瀏覽器可能會暫停 AudioContext，需要手動恢復
    if (ctx.state === 'suspended') {
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
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ISU_Thai_Oracle_TTS_${new Date().getTime()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateImage = async () => {
    if (!poemResult) return;
    setIsGeneratingImage(true);
    const style = customStyle.trim() || "Thai-Taiwan fusion recruitment oracle card, cinematic paper cut collage";
    const img = await generatePoemImage(apiKey, poemResult, interpretation, style, logoUrl);
    setPoemImage(img);
    setIsGeneratingImage(false);
  };

  const downloadResult = () => {
    const formattedInterpretation = interpretation.split('\n').map(line => {
      if (line.startsWith('### ')) return `<h3 style="color: #fde68a; margin-top: 24px; font-size: 1.1rem; letter-spacing: 0.05em;">${line.replace('### ', '')}</h3>`;
      if (line.startsWith('## ')) return `<h2 style="color: #fbbf24; border-left: 4px solid #fbbf24; padding-left: 12px; margin-top: 32px; font-size: 1.4rem;">${line.replace('## ', '')}</h2>`;
      if (line.trim() === '') return '<br>';
      const bolded = line.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fcd34d;">$1</strong>');
      return `<p style="margin-bottom: 16px; line-height: 1.8; color: #cbd5e1;">${bolded}</p>`;
    }).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>靈曦籤苑 - ISU 泰文招生解籤</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap');
        body { 
            font-family: 'Noto Sans TC', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'noto sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; 
            padding: 20px; 
            background: #020617; 
            color: #f1f5f9; 
            margin: 0;
            display: flex;
            justify-content: center;
        }
        .container { 
            max-width: 800px; 
            width: 100%;
            background: #0f172a; 
            border: 1px solid #1e293b;
            border-radius: 40px; 
            padding: 60px 40px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            margin: 20px auto;
        }
        .header { text-align: center; margin-bottom: 60px; }
        .lotus { color: #f9a8d4; font-size: 2rem; margin-bottom: 16px; opacity: 0.6; }
        h1 { color: #fbbf24; font-size: 2.5rem; margin: 0; letter-spacing: 0.2em; font-weight: 900; }
        .sub-header { color: #94a3b8; font-size: 0.9rem; letter-spacing: 0.3em; margin-top: 8px; text-transform: uppercase; }
        
        .question-box { 
            background: #1e293b; 
            padding: 24px; 
            border-radius: 20px; 
            margin-bottom: 48px; 
            border-left: 6px solid #fbbf24;
            font-style: italic;
            color: #94a3b8;
        }
        
        .poem-section { text-align: center; margin-bottom: 64px; }
        .poem-no { display: inline-block; padding: 4px 16px; background: rgba(251, 191, 36, 0.1); color: #fbbf24; border-radius: 20px; font-size: 0.8rem; font-weight: bold; margin-bottom: 24px; border: 1px solid rgba(251, 191, 36, 0.2); }
        .poem-line { font-size: 2rem; font-weight: bold; margin: 12px 0 4px; color: #f8fafc; letter-spacing: 0.15em; }
        .poem-line-thai { font-size: 1.05rem; font-style: italic; color: #fde68a; margin: 0 0 20px; opacity: 0.85; }
        
        .interpretation-section { 
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid #334155;
            padding: 40px;
            border-radius: 32px;
            margin-bottom: 48px;
        }
        
        .image-section { text-align: center; margin-top: 48px; }
        .poem-img { width: 100%; max-width: 500px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); border: 8px solid #1e293b; }
        .img-caption { margin-top: 16px; font-size: 0.75rem; color: #64748b; letter-spacing: 0.1em; }
        
        .footer { text-align: center; margin-top: 64px; padding-top: 32px; border-top: 1px solid #1e293b; color: #475569; font-size: 0.8rem; }
        a { color: #fbbf24; text-decoration: none; }
        @media (max-width: 640px) {
            .container { padding: 40px 24px; border-radius: 24px; }
            .poem-line { font-size: 1.5rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="lotus">❀</div>
            <h1>靈曦籤苑</h1>
            <div class="sub-header">ISU Thai-Taiwan Oracle</div>
        </div>
        
        <div class="question-box">
            <strong>您所問之事 / คำถามของคุณ：</strong><br>
            「${question}」
        </div>
        
        <div class="poem-section">
            <div class="poem-no">觀音靈籤 第 ${poemResult?.id} 籤 / เซียมซีใบที่ ${poemResult?.id}</div>
            ${poemResult?.content.map((line, idx) => `
              <div class="poem-line">${line}</div>
              ${thaiPoem[idx] ? `<div class="poem-line-thai">${thaiPoem[idx]}</div>` : ''}
            `).join('')}
        </div>
        
        <div class="interpretation-section">
            ${formattedInterpretation}
        </div>
        
        ${poemImage ? `
        <div class="image-section">
            <img class="poem-img" src="${poemImage}" alt="籤詩意象">
            <div class="img-caption">ISU ORACLE RECRUITMENT ART GENERATED BY AI</div>
        </div>
        ` : ''}
        
        <div class="footer">
            <p>© 靈曦籤苑 · ISU Thai-Taiwan Oracle · 由 Gemini AI 驅動</p>
            <p><a href="https://weisfx0705.github.io/chiawei/">義守大學陳嘉暐老師開發</a></p>
            <p style="font-style: italic; opacity: 0.6; margin-top: 16px;">「一切法從心想生，解籤僅供參考，未來掌握在您手中。」</p>
            <p style="opacity: 0.4; margin-top: 8px; font-size: 0.7rem;">Version: 12/20/2025</p>
        </div>
    </div>
</body>
</html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ISU_Thai_Oracle_Result_${new Date().toLocaleDateString()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('GEMINI_API_KEY', key);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 min-h-screen flex flex-col items-center relative">
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="absolute top-6 right-6 p-3 text-slate-400 hover:text-amber-400 transition-colors z-40 bg-slate-800/50 rounded-full backdrop-blur-sm"
        title="設定 API Key / ตั้งค่า API Key"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      {/* Header */}
      <header className="text-center mb-12 w-full">
        <a
          href="https://oica.ishouuniversity.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block group mb-6"
          title="義守大學國際事務處 / สำนักงานกิจการต่างประเทศ ISU"
        >
          <img
            src={logoUrl}
            alt="I-Shou University Logo"
            className="w-48 md:w-64 mx-auto drop-shadow-[0_0_40px_rgba(251,191,36,0.45)] group-hover:scale-105 transition-transform duration-500"
          />
        </a>
        <h1 className="text-6xl md:text-7xl font-black font-serif mb-2 tracking-widest rainbow-text">靈曦籤苑</h1>
        <p className="text-amber-200/70 tracking-[0.3em] font-light uppercase">ISU Thai-Taiwan Oracle</p>
        <p className="mt-3 text-slate-300">中泰雙語解籤，幫你找到義守大學的命定科系。</p>
        <p className="mt-1 text-slate-400">เซียมซีสองภาษา ไทย-จีน เพื่อค้นหาสาขาที่เหมาะกับคุณที่ ISU</p>

        <a
          href="https://oica.ishouuniversity.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-8 py-4 rounded-full font-bold text-slate-900 shadow-[0_10px_40px_rgba(168,85,247,0.35)] hover:scale-105 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(90deg,#fbbf24,#f472b6,#a78bfa,#22d3ee,#34d399)', backgroundSize: '200% auto', animation: 'rainbow-shift 6s linear infinite' }}
        >
          <span className="text-xl">🌏</span>
          <span className="tracking-wide">義守大學國際事務處</span>
          <span className="opacity-80">·</span>
          <span className="tracking-wide">สำนักงานกิจการต่างประเทศ ISU</span>
          <span className="ml-1 opacity-80">↗</span>
        </a>
      </header>

      {/* Main Container */}
      <main className="w-full bg-slate-800/40 backdrop-blur-xl rounded-[2.5rem] p-10 sacred-glow border border-slate-700/50">

        {step === AppStep.QUESTION && (
          <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-amber-400 mb-4">今天想問什麼未來？🤔</h2>
              <p className="text-slate-400">請用中文或泰文輸入問題，系統會用中泰雙語解籤並推薦 ISU 科系。</p>
              <p className="text-slate-500 mt-2">พิมพ์คำถามเป็นภาษาไทยหรือจีน ระบบจะตีความเซียมซีสองภาษาและแนะนำสาขาที่ ISU</p>
            </div>

            <div className="relative group">
              <textarea
                className="w-full h-48 p-8 rounded-3xl bg-slate-900/50 border border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 outline-none text-xl transition-all text-amber-50 placeholder:text-slate-600 shadow-inner"
                placeholder={currentPlaceholder}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <button
                onClick={startVoiceInput}
                className={`absolute bottom-6 right-6 p-4 rounded-full transition-all shadow-lg ${isRecording ? 'bg-red-500 text-white animate-pulse scale-110' : 'bg-amber-500 text-slate-900 hover:bg-amber-400 hover:scale-105'}`}
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
                </svg>
              </button>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleNextStep}
                className="px-16 py-5 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-900 rounded-full text-xl font-black hover:from-amber-500 hover:to-amber-400 transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                誠心求籤 / ขอเซียมซี
              </button>
            </div>

            <div className="pt-8 border-t border-slate-700/50 flex flex-col items-center">
              <LineQrCard size="sm" />
            </div>
          </div>
        )}

        {step === AppStep.PICKER && (
          <div className="space-y-10 animate-in zoom-in duration-700 text-center">
            <div>
              <h2 className="text-3xl font-bold text-amber-400 mb-2">天意就在一念之間 ✨</h2>
              <p className="text-slate-400 mb-2">閉上眼睛，選一張牌，看看哪個 ISU 科系在向你招手。</p>
              <p className="text-slate-500 mb-8">หลับตา เลือกหนึ่งใบ แล้วดูว่าสาขาไหนของ ISU กำลังเรียกคุณอยู่</p>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
              {randomSeeds.map((seed) => (
                <button
                  key={seed.letter}
                  onClick={() => handlePick(seed.letter)}
                  className="aspect-square flex items-center justify-center border border-slate-700 bg-slate-900/30 rounded-2xl text-2xl font-black text-amber-200 hover:bg-amber-500 hover:text-slate-900 hover:border-amber-400 transition-all transform hover:scale-110 hover:-rotate-6 shadow-md"
                >
                  {seed.letter}
                </button>
              ))}
            </div>

            <div className="pt-10 border-t border-slate-700/50 flex flex-col items-center gap-4">
              <div className="flex gap-4">
                <button
                  onClick={generateNewSeeds}
                  className="px-4 py-2 bg-slate-800 text-amber-500/80 rounded-full text-xs hover:bg-slate-700 hover:text-amber-400 transition-all flex items-center border border-slate-700"
                >
                  <span className="mr-1">🔄</span> 重新洗牌 / สุ่มใหม่
                </button>
                <button
                  onClick={() => setShowSeeds(!showSeeds)}
                  className="text-xs text-slate-500 hover:text-amber-400 transition-colors italic border-b border-transparent hover:border-amber-400"
                >
                  {showSeeds ? '收起底牌 / ซ่อนเลขสุ่ม 🤫' : '查看抽籤隨機數 / ดูเลขสุ่ม 🔍'}
                </button>
              </div>
              {showSeeds && (
                <div className="mt-6 grid grid-cols-5 text-[10px] gap-2 text-slate-500 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/30">
                  {randomSeeds.map(s => <span key={s.letter} className="bg-slate-800/50 p-1 rounded">{s.letter}: {s.number}</span>)}
                </div>
              )}
            </div>
          </div>
        )}

        {step === AppStep.RESULT && poemResult && (
          <div className="space-y-14 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex flex-col items-center">
              <div className="inline-block px-6 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-sm font-bold mb-8 uppercase tracking-widest">
                Oracle No. {poemResult.id}
              </div>
              <div className="space-y-6 text-center">
                {poemResult.content.map((line, idx) => (
                  <div key={idx} className="space-y-2">
                    <p className="text-4xl md:text-5xl font-serif text-amber-100 tracking-[0.2em] drop-shadow-lg">{line}</p>
                    {thaiPoem[idx] && (
                      <p className="text-lg md:text-xl font-light text-amber-200/70 tracking-wide italic">{thaiPoem[idx]}</p>
                    )}
                  </div>
                ))}
                {isAnalyzing && thaiPoem.length === 0 && (
                  <p className="text-sm text-slate-500 italic animate-pulse">กำลังแต่งบทกลอนไทยที่คล้องจอง...</p>
                )}
              </div>
            </div>

            <div className="p-10 bg-slate-900/60 rounded-[2rem] border border-slate-700/50 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h3 className="text-2xl font-black text-amber-400 flex items-center italic">
                  <span className="text-3xl mr-3">🕶️</span> 大師開示 / คำทำนาย
                </h3>

                {(audioBuffer || isGeneratingAudio) && (
                  <div className="flex gap-2">
                    {audioBlob && !isGeneratingAudio && (
                      <button
                        onClick={downloadAudio}
                        className="flex items-center justify-center w-10 h-10 rounded-full border border-amber-500/30 bg-slate-800 text-amber-400 hover:bg-slate-700 transition-all"
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
                      className={`flex items-center space-x-2 px-4 py-2 rounded-full border border-amber-500/30 transition-all ${isPlaying ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-amber-400 hover:bg-slate-700'}`}
                    >
                      {isGeneratingAudio ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : isPlaying ? (
                        <><span className="text-xl">⏸️</span> <span className="text-sm font-bold">停止播放 / หยุด</span></>
                      ) : (
                        <><span className="text-xl">🔊</span> <span className="text-sm font-bold">播放泰文總結 / เล่นเสียงไทย</span></>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {isAnalyzing ? (
                <div className="flex flex-col items-center py-16 space-y-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">🔮</div>
                  </div>
                  <p className="text-amber-400/80 font-light italic animate-pulse">{currentLoadingMessage}</p>
                </div>
              ) : (
                <MarkdownRenderer content={interpretation} />
              )}
            </div>

            <div className="space-y-6">
              {poemImage && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative p-2 bg-gradient-to-b from-amber-500 to-amber-700 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-zoom-in" onClick={() => setIsImageZoomed(true)}>
                    <img src={poemImage} alt="籤詩意象" className="max-w-md w-full rounded-2xl grayscale-[0.2] hover:grayscale-0 transition-all duration-700" />
                  </div>
                  <p className="text-slate-500 text-xs tracking-widest uppercase">ISU Oracle Recruitment Art (點擊放大 / คลิกเพื่อขยาย)</p>
                </div>
              )}

              <div className="flex flex-col items-center space-y-4 max-w-md mx-auto">
                <div className="w-full relative">
                  <input
                    type="text"
                    placeholder="自訂圖片風格 / ใส่สไตล์ภาพเอง เช่น Thai temple cyberpunk..."
                    value={customStyle}
                    onChange={(e) => setCustomStyle(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-900/80 border border-slate-700 rounded-2xl text-amber-100 placeholder:text-slate-600 focus:border-amber-500 outline-none transition-all shadow-inner"
                  />
                </div>

                <button
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage}
                  className="group flex items-center space-x-3 px-10 py-4 bg-slate-900 border border-slate-700 text-amber-400 rounded-full hover:bg-amber-500 hover:text-slate-900 transition-all disabled:opacity-50 shadow-xl w-full justify-center"
                >
                  {isGeneratingImage ? (
                    <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span className="text-2xl group-hover:rotate-12 transition-transform">🎨</span>
                  )}
                  <span className="font-bold">{poemResult ? (poemImage ? '調整風格重新生成 / สร้างใหม่' : '生成 ISU 招生籤詩卡 / สร้างภาพเซียมซี ISU') : ''}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center pt-10 border-t border-slate-700/50 gap-6">
              <button
                onClick={downloadResult}
                className="w-full sm:w-auto px-10 py-4 bg-amber-500 text-slate-900 rounded-full font-black hover:bg-amber-400 transition-all flex items-center justify-center shadow-lg"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                存檔帶走 / บันทึกผล
              </button>
              <button
                onClick={resetApp}
                className="w-full sm:w-auto px-10 py-4 bg-slate-700 text-amber-100 rounded-full font-bold hover:bg-slate-600 transition-all border border-slate-600 shadow-md"
              >
                換個問題再抽一次 / ถามใหม่อีกครั้ง
              </button>
            </div>

            <div className="mt-12 pt-10 border-t border-slate-700/50">
              <div className="text-center mb-6 space-y-1">
                <h3 className="text-2xl md:text-3xl font-black text-green-300">我們會把籤詩結果傳給你 📲</h3>
                <p className="text-slate-300">掃 QR 加入 LINE 社群「ISU Thailand 2026 · Freshmen Connect」，我們會把你這次抽到的籤詩結果傳給你。</p>
                <p className="text-slate-400 text-sm">สแกน QR เข้ากลุ่ม LINE แล้วเราจะส่งผลเซียมซีของคุณไปให้ทางแชท</p>
              </div>
              <div className="flex justify-center">
                <LineQrCard size="lg" />
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Zoom Modal */}
      {isImageZoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300"
          onClick={() => setIsImageZoomed(false)}
        >
          <div className="relative max-w-full max-h-full flex flex-col items-center">
            <img
              src={poemImage}
              alt="籤詩意象大圖"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border-2 border-slate-700"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-amber-500/80 mt-4 font-light tracking-widest uppercase text-sm">ISU Oracle Recruitment Art</p>
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

      <footer className="mt-16 text-slate-500 text-sm text-center space-y-2">
        <p className="tracking-widest">© 靈曦籤苑 · ISU Thai-Taiwan Oracle · Powered by Gemini AI</p>
        <p className="hover:text-amber-400 transition-colors">
          <a href="https://weisfx0705.github.io/chiawei/" target="_blank" rel="noopener noreferrer">
            義守大學陳嘉暐老師開發
          </a>
        </p>
        <p className="opacity-40 italic">「解籤與科系推薦僅供參考，正式招生資訊請以義守大學公告為準。」</p>
        <p className="opacity-30 text-xs">Version: 12/20/2025</p>
      </footer>
    </div>
  );
};

export default App;
