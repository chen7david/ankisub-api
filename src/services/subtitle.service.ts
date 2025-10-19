/**
 * Subtitle Service Class
 * Handles parsing of SRT, VTT, and DFXP subtitle formats with UTF-8 encoding
 * Compatible with Cloudflare Workers
 */

// Subtitle object interface
interface SubtitleCue {
  index: number;
  startTime: number; // in milliseconds
  endTime: number; // in milliseconds
  text: string; // UTF-8 encoded text
  settings?: string; // VTT cue settings (position, alignment, etc.)
}

interface ParseResult {
  format: "srt" | "vtt" | "dfxp" | "unknown";
  cues: SubtitleCue[];
  metadata?: Record<string, string>;
}

// Abstract parser interface (Dependency Inversion Principle)
interface SubtitleParser {
  canParse(content: string): boolean;
  parse(content: string): SubtitleCue[];
}

// SRT Parser (Single Responsibility Principle)
class SRTParser implements SubtitleParser {
  canParse(content: string): boolean {
    // SRT format: number, timestamp with comma, text
    const srtPattern =
      /\d+\s*\n\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/;
    return srtPattern.test(content);
  }

  parse(content: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    // Split by double newlines to separate subtitle blocks
    const blocks = content.trim().split(/\n\s*\n/);

    for (const block of blocks) {
      const lines = block.trim().split("\n");
      if (lines.length < 3) continue;

      // First line is the index
      const index = parseInt(lines[0].trim(), 10);
      if (isNaN(index)) continue;

      // Second line is the timestamp
      const timeLine = lines[1].trim();
      const timeMatch = timeLine.match(
        /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
      );

      if (!timeMatch) continue;

      const startTime = this.parseTimestamp(
        timeMatch[1],
        timeMatch[2],
        timeMatch[3],
        timeMatch[4]
      );
      const endTime = this.parseTimestamp(
        timeMatch[5],
        timeMatch[6],
        timeMatch[7],
        timeMatch[8]
      );

      // Remaining lines are the subtitle text
      const text = lines.slice(2).join("\n");

      cues.push({
        index,
        startTime,
        endTime,
        text: this.sanitizeText(text),
      });
    }

    return cues;
  }

  private parseTimestamp(
    hours: string,
    minutes: string,
    seconds: string,
    milliseconds: string
  ): number {
    return (
      parseInt(hours, 10) * 3600000 +
      parseInt(minutes, 10) * 60000 +
      parseInt(seconds, 10) * 1000 +
      parseInt(milliseconds, 10)
    );
  }

  private sanitizeText(text: string): string {
    // Remove HTML tags but preserve text
    return text.replace(/<[^>]*>/g, "").trim();
  }
}

// VTT Parser (Single Responsibility Principle)
class VTTParser implements SubtitleParser {
  canParse(content: string): boolean {
    // VTT must start with WEBVTT
    return content.trim().startsWith("WEBVTT");
  }

  parse(content: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    const lines = content.split("\n");
    let i = 0;
    let cueIndex = 1;

    // Skip header
    while (i < lines.length && !lines[i].includes("-->")) {
      i++;
    }

    while (i < lines.length) {
      const line = lines[i].trim();

      // Check if this is a cue timing line
      if (line.includes("-->")) {
        const parts = line.split("-->");
        if (parts.length !== 2) {
          i++;
          continue;
        }

        // Parse times and settings
        const startPart = parts[0].trim();
        const endParts = parts[1].trim().split(/\s+/);
        const endTime = endParts[0];
        const settings = endParts.slice(1).join(" ");

        const startMs = this.parseVTTTimestamp(startPart);
        const endMs = this.parseVTTTimestamp(endTime);

        // Collect text lines until empty line or end
        i++;
        const textLines: string[] = [];
        while (i < lines.length && lines[i].trim() !== "") {
          textLines.push(lines[i]);
          i++;
        }

        if (textLines.length > 0) {
          cues.push({
            index: cueIndex++,
            startTime: startMs,
            endTime: endMs,
            text: this.sanitizeText(textLines.join("\n")),
            settings: settings || undefined,
          });
        }
      }
      i++;
    }

    return cues;
  }

  private parseVTTTimestamp(timestamp: string): number {
    // VTT format: HH:MM:SS.mmm or MM:SS.mmm
    const match = timestamp.match(/(\d{1,2}:)?(\d{2}):(\d{2})\.(\d{3})/);
    if (!match) return 0;

    const hours = match[1] ? parseInt(match[1].replace(":", ""), 10) : 0;
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const milliseconds = parseInt(match[4], 10);

    return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
  }

  private sanitizeText(text: string): string {
    // Remove VTT tags like <v Speaker> but preserve text
    return text.replace(/<[^>]*>/g, "").trim();
  }
}

// DFXP/Netflix Parser (Single Responsibility Principle)
class DFXPParser implements SubtitleParser {
  canParse(content: string): boolean {
    // DFXP/TTML is XML-based
    return (
      content.includes("<tt ") ||
      content.includes("<tt>") ||
      content.includes("xmlns:tt") ||
      content.includes("xmlns:tts")
    );
  }

  parse(content: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];

    // Simple XML parsing for <p> tags (subtitle paragraphs)
    const pTagRegex =
      /<p[^>]*begin="([^"]*)"[^>]*end="([^"]*)"[^>]*>(.*?)<\/p>/gs;
    let match;
    let index = 1;

    while ((match = pTagRegex.exec(content)) !== null) {
      const startTime = this.parseDFXPTimestamp(match[1]);
      const endTime = this.parseDFXPTimestamp(match[2]);
      const text = this.sanitizeText(match[3]);

      cues.push({
        index: index++,
        startTime,
        endTime,
        text,
      });
    }

    return cues;
  }

  private parseDFXPTimestamp(timestamp: string): number {
    // DFXP supports multiple formats: HH:MM:SS.mmm or HH:MM:SS:frames
    // Handle the most common format
    const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2})[:.](\d{2,3})/);
    if (!match) return 0;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const fraction =
      match[4].length === 2
        ? parseInt(match[4], 10) * 10 // frames to ms approximation
        : parseInt(match[4], 10);

    return hours * 3600000 + minutes * 60000 + seconds * 1000 + fraction;
  }

  private sanitizeText(text: string): string {
    // Remove XML/HTML tags and decode entities
    return text
      .replace(/<[^>]*>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();
  }
}

// Main Subtitle Service (Open/Closed Principle - open for extension via new parsers)
export class SubtitleService {
  private parsers: SubtitleParser[];

  constructor() {
    // Initialize with available parsers (Dependency Injection)
    this.parsers = [
      new VTTParser(), // Check VTT first (most specific signature)
      new DFXPParser(), // Check DFXP second
      new SRTParser(), // Check SRT last (most lenient)
    ];
  }

  /**
   * Ensures proper UTF-8 encoding of subtitle content
   * @param input - Raw subtitle content (string or ArrayBuffer)
   * @returns UTF-8 encoded string
   */
  private ensureUTF8(input: string | ArrayBuffer): string {
    if (typeof input === "string") {
      return input;
    }

    // For Cloudflare Workers: use TextDecoder for proper UTF-8 handling
    const decoder = new TextDecoder("utf-8", { fatal: false, ignoreBOM: true });
    return decoder.decode(input);
  }

  /**
   * Detects the subtitle format
   * @param content - Subtitle content as string
   * @returns Format type
   */
  private detectFormat(content: string): "srt" | "vtt" | "dfxp" | "unknown" {
    if (content.trim().startsWith("WEBVTT")) return "vtt";
    if (content.includes("<tt ") || content.includes("xmlns:tt")) return "dfxp";
    if (/\d+\s*\n\d{2}:\d{2}:\d{2},\d{3}\s*-->/.test(content)) return "srt";
    return "unknown";
  }

  /**
   * Main parse function - detects format and parses accordingly
   * @param input - Raw subtitle content (string or ArrayBuffer)
   * @returns Parsed result with format, cues, and metadata
   */
  parse(input: string | ArrayBuffer): ParseResult {
    // Ensure UTF-8 encoding
    const content = this.ensureUTF8(input);

    // Detect format
    const format = this.detectFormat(content);

    // Find appropriate parser
    for (const parser of this.parsers) {
      if (parser.canParse(content)) {
        const cues = parser.parse(content);
        return {
          format,
          cues,
          metadata: {
            totalCues: cues.length.toString(),
            parsedAt: new Date().toISOString(),
          },
        };
      }
    }

    // No parser found
    return {
      format: "unknown",
      cues: [],
      metadata: {
        error: "Unable to parse subtitle format",
      },
    };
  }

  /**
   * Get cues within a specific time range
   * @param result - Parsed subtitle result
   * @param startMs - Start time in milliseconds
   * @param endMs - End time in milliseconds
   * @returns Filtered cues
   */
  getCuesInRange(
    result: ParseResult,
    startMs: number,
    endMs: number
  ): SubtitleCue[] {
    return result.cues.filter(
      (cue) => cue.startTime <= endMs && cue.endTime >= startMs
    );
  }

  /**
   * Get cue at specific time
   * @param result - Parsed subtitle result
   * @param timeMs - Time in milliseconds
   * @returns Active cue or null
   */
  getCueAtTime(result: ParseResult, timeMs: number): SubtitleCue | null {
    return (
      result.cues.find(
        (cue) => cue.startTime <= timeMs && cue.endTime >= timeMs
      ) || null
    );
  }
}
