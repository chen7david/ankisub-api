import { GoogleGenAI } from "@google/genai";
import { TRANSLATION_PAIR_PROMPT } from "../prompts/translation/ankisub.prompt.instructions";
import { getFormattedTranslationPrompt } from "../prompts/translation/translation.prompt.format";
import { translationPairSchema } from "../prompts/translation/translation.prompt.response-schema";

export type TranlateStringsInputType = {
  inputLanguage: string;
  outputLanguage: string;
  strings: string[];
};

export type TranslatedPairType = {
  original: string;
  translated: string;
};

export class TranslateService {
  private ai: GoogleGenAI;
  private model: string = "gemini-2.5-flash";

  constructor(apiKey: string, model: string) {
    this.ai = new GoogleGenAI({
      apiKey: apiKey,
    });
  }

  async translateStrings({
    strings,
    inputLanguage = "en",
    outputLanguage = "pl",
  }: TranlateStringsInputType): Promise<TranslatedPairType[]> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: translationPairSchema,
      },
      contents: [
        { role: "model", parts: [{ text: TRANSLATION_PAIR_PROMPT }] },
        {
          role: "user",
          parts: [
            {
              text: getFormattedTranslationPrompt({
                inputLanguage,
                outputLanguage,
                strings,
              }),
            },
          ],
        },
      ],
    });

    let result: any[] = [];

    try {
      const rawText = response.text ?? "";
      console.log("Raw response text:", rawText);
      result = JSON.parse(rawText);
    } catch (e) {
      throw new Error("Model did not return valid JSON.");
    }

    return result as TranslatedPairType[];
  }
}
