import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateHealingMessage(context: { time: string; location?: string; weather?: string }) {
  const prompt = `为一名感到孤独或被忽视的年轻职场人或实习生生成一段温暖、感性的治愈寄语。
  背景信息：
  - 当前时间：${context.time}
  - 地点：${context.location || "某处工位"}
  - 天气：${context.weather || "平静"}
  
  要求：
  - 语言：简体中文。
  - 长度：1-2句话。
  - 核心：体现“我看见你了”或类似的认可感。
  - 自然融入背景（如时间或天气）。
  - 语气：像手写便条一样亲切、温暖。
  
  范例：“在这深夜23点的寂静里，你的努力比灯光更耀眼。别太累了，早点回家，注意安全。”`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text?.trim() || "I see you. You are doing great.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The silence of the night is your witness. You've done enough for today.";
  }
}
