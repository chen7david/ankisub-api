import type { MessageBatch } from "@cloudflare/workers-types";

// The actual simplified R2 Event structure when configured via Queue Notification.
interface R2QueueMessage {
  account: string;
  bucket: string;
  action: string;
  object: {
    key: string;
    eTag: string;
    size: number;
  };
  eventTime: string;
}

export async function queueHandler(
  batch: MessageBatch,
  env: CloudflareBindings
): Promise<void> {
  for (const message of batch.messages) {
    let objectKey: string | undefined;
    let bucketName: string | undefined;

    try {
      let parsedBody: R2QueueMessage;

      // Check if the body is a string (JSON sent raw) or already an object (auto-parsed by runtime).
      if (typeof message.body === "string") {
        // R2 Event case 1: The body is a JSON string. Parse it.
        parsedBody = JSON.parse(message.body);
      } else if (typeof message.body === "object" && message.body !== null) {
        // R2 Event case 2: The body was auto-parsed to an object. Use it directly.
        parsedBody = message.body as R2QueueMessage;
      } else {
        // Unknown or unexpected type.
        throw new Error(
          `Queue message body was of unexpected type: ${typeof message.body}`
        );
      }

      // FIX: Extract key and bucket directly from the top-level properties
      objectKey = parsedBody.object?.key;
      bucketName = parsedBody.bucket;

      if (!objectKey || !bucketName) {
        // If the structure is not recognized, signal a bad message.
        throw new Error(
          "Parsed message body was missing required R2 event fields (key or bucket name)."
        );
      }

      // A. Fetch the SRT file content from R2 using the correct binding name
      const object = await env.ANKISUB_BUCKET.get(objectKey);

      if (object) {
        const srtContent = await object.text();

        console.log(`Processing SRT file with content: ${srtContent}`);
        // Here you would add the logic to process the SRT content,
        // e.g., perform translation using the Gemini API key.
        // B. Hypothetical: Perform AI processing using the GEMINI_API_KEY
        // Example: await callGeminiApi(srtContent, env.GEMINI_API_KEY);

        // C. Hypothetical: Log the processing result to D1 using the correct binding name (ANKISUB_DB)
        // const timestamp = new Date().toISOString();
        // await env.ANKISUB_DB.exec(
        //   `INSERT INTO process_log (file_key, status, timestamp) VALUES (?, ?, ?)`,
        //   [objectKey, "Processed", timestamp]
        // );
        console.log(`Logged processing for ${objectKey} to D1.`);
      } else {
        console.warn(
          `Object key ${objectKey} not found in bucket ${bucketName}. Ignoring.`
        );
      }
    } catch (error) {
      // If processing fails, log the error and allow the batch to retry
      console.error(
        `Fatal error processing message ID ${message.id}. Retrying batch.`,
        error
      );
      throw error;
    }
  }
}
