import type { MessageBatch } from "@cloudflare/workers-types";

interface R2ObjectEvent {
  key: string;
  bucketName: string;
  // Other fields like etag, versionId, time, etc.
}

export async function queueHandler(
  batch: MessageBatch,
  env: CloudflareBindings
): Promise<void> {
  console.log(`Received batch of ${batch.messages.length} R2 events.`);

  for (const message of batch.messages) {
    try {
      // R2 Event Notification Messages have the type R2ObjectEvent
      const r2Event = message.body as R2ObjectEvent;

      const objectKey = r2Event?.key;
      const bucketName = r2Event?.bucketName;

      if (!objectKey || !bucketName) {
        console.warn(
          "Message body was not a recognized R2 event structure. Skipping."
        );
        continue;
      }

      console.log(`Processing R2 Event for file: ${objectKey}`);

      // A. Fetch the SRT file content from R2 using the correct binding name (SRT_BUCKET)
      const object = await env.ANKISUB_BUCKET.get(objectKey);

      if (object) {
        const srtContent = await object.text();
        console.log(
          `Successfully fetched ${objectKey}. Content size: ${srtContent.length} bytes.`
        );

        // B. Hypothetical: Perform AI processing using the GEMINI_API_KEY
        // This is where you would call an external API using the secret key.
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
      console.error(`Fatal error processing message ID ${message.id}:`, error);
      // Throwing an error causes the message (and likely the batch) to be retried by the queue.
      throw error;
    }
  }
}
