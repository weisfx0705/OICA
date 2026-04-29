export interface ProgramOption {
  id: string;
  shortCode: string;
  degreeTitle: string;
  firstChoiceLabel: string;
  heroTitle: string;
  summary: string;
  interviewFocus: string;
  imageDirection: string;
  starterQuestions: string[];
}

export const PROGRAM_OPTIONS: ProgramOption[] = [
  {
    id: "iba",
    shortCode: "IBA",
    degreeTitle: "Bachelor of Business Administration",
    firstChoiceLabel:
      "IBA (English Taught) (Bachelor of Business Administration)",
    heroTitle: "Global Business Track",
    summary:
      "international business, cross-cultural communication, presentation confidence, teamwork, and practical market thinking",
    interviewFocus:
      "Frame the student as globally minded, articulate, proactive, collaborative, and capable of turning ideas into workable business actions.",
    imageDirection:
      "editorial business future, boardroom glow, strategy wall, aviation routes, market dashboards, polished confidence, Kaohsiung harbor international energy",
    starterQuestions: [
      "如果教授問我為什麼適合 IBA，我最該強調哪一面？ / ถ้าอาจารย์ถามว่าทำไมฉันเหมาะกับ IBA ฉันควรเน้นจุดไหน?",
      "我在面試裡應該展現企圖心、團隊感，還是國際溝通能力？ / ในสัมภาษณ์ฉันควรโชว์ความมุ่งมั่น การทำงานเป็นทีม หรือการสื่อสารนานาชาติดี?",
      "這個籤會怎麼提醒我面對商管面試的氣場？ / เซียมซีนี้จะเตือนฉันอย่างไรสำหรับบรรยากาศสัมภาษณ์สายบริหาร?"
    ]
  },
  {
    id: "imba",
    shortCode: "IMBA",
    degreeTitle: "Master of Business Administration",
    firstChoiceLabel:
      "IMBA (English Taught) (Master of Business Administration)",
    heroTitle: "Leadership & Strategy Track",
    summary:
      "strategic thinking, leadership presence, managerial maturity, analytical judgment, and global decision-making",
    interviewFocus:
      "Frame the student as reflective, leadership-ready, strategically aware, disciplined, and able to connect experience with future management goals.",
    imageDirection:
      "executive strategy chamber, midnight city skyline, decision maps, disciplined luxury, leadership aura, sophisticated global management mood",
    starterQuestions: [
      "教授會怎麼看我的領導感與成熟度？ / อาจารย์จะมองภาวะผู้นำและความเป็นผู้ใหญ่ของฉันอย่างไร?",
      "如果我要說服 IMBA 面試官，我該強調經驗、視野，還是目標感？ / ถ้าจะโน้มน้าวกรรมการ IMBA ฉันควรเน้นประสบการณ์ วิสัยทัศน์ หรือเป้าหมาย?",
      "這支籤比較像在提醒我穩住氣場，還是放大野心？ / เซียมซีนี้กำลังบอกให้ฉันนิ่งไว้หรือกล้าแสดงความทะเยอทะยานมากขึ้น?"
    ]
  },
  {
    id: "ai",
    shortCode: "Artificial Intelligence Technology (B)",
    degreeTitle: "Bachelor of AI",
    firstChoiceLabel:
      "Artificial Intelligence Technology (B) (English Taught) (Bachelor of AI)",
    heroTitle: "AI Builder Track",
    summary:
      "logic, curiosity, technical resilience, experimentation, ethical thinking, and the ability to learn fast in emerging technology",
    interviewFocus:
      "Frame the student as analytical, curious, future-facing, willing to solve hard problems, and motivated to connect AI with real-world applications.",
    imageDirection:
      "futuristic AI laboratory, neural light lattice, robotics silhouettes, semiconductor shimmer, code-inspired geometry, high-focus innovation energy",
    starterQuestions: [
      "我在 AI 面試裡最該讓教授看見什麼特質？ / ในสัมภาษณ์สาย AI ฉันควรทำให้อาจารย์เห็นคุณสมบัติอะไรชัดที่สุด?",
      "如果我還沒有很強的技術經歷，這支籤會怎麼教我說服教授？ / ถ้าฉันยังไม่มีประสบการณ์เทคนิคเยอะ เซียมซีนี้จะช่วยให้ฉันพูดอย่างไร?",
      "我適合走 AI 的研究型、應用型，還是實作型路線？ / ฉันเหมาะกับเส้นทาง AI แบบวิจัย แบบประยุกต์ หรือแบบลงมือทำมากกว่า?"
    ]
  }
];

export function findProgramById(programId: string): ProgramOption | undefined {
  return PROGRAM_OPTIONS.find((program) => program.id === programId);
}
