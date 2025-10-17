import { Type } from "@google/genai";

export const translationPairSchema = {
  description:
    "An array of objects containing the original and translated text pairs.",
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      original: {
        type: Type.STRING,
        description: "The original phrase in the input language.",
        nullable: false,
      },
      translated: {
        type: Type.STRING,
        description: "The translated phrase in the output language.",
        nullable: false,
      },
    },
    required: ["original", "translated"],
  },
};
