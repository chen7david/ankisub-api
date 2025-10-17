import { TranlateStringsInputType } from "../../services/translation.service";

export const getFormattedTranslationPrompt = ({
  inputLanguage,
  outputLanguage,
  strings,
}: TranlateStringsInputType) => `
  InputLanguage: """${inputLanguage}"""
  OutputLange: """${outputLanguage}"""
  OriginalSubtitles: ${JSON.stringify(strings)}
  `;
