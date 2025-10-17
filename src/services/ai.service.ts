import { GoogleGenAI } from "@google/genai";

export type ToCsvType = {
  inputLanguage: string;
  outputLanguage: string;
  originalSubtitles: string[];
};

export class AiService {
  private apiKey: string;
  private model: string;
  private ai: GoogleGenAI;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model || "gemini-2.5-flash";
    this.ai = new GoogleGenAI({
      apiKey: this.apiKey,
    });
  }
}
