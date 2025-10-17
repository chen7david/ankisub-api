import { Hono } from "hono";
import type { Queue, MessageBatch } from "@cloudflare/workers-types";

// 1. Define the Bindings Interface
// This ensures TypeScript knows about your Queue binding.
export interface CloudflareBindings {
  // MUST match the 'binding' name in your wrangler.toml/jsonc file.
  ANKISUB_QUEUE: Queue;
}

// 2. Initialize the Hono app for HTTP handling
const app = new Hono<{ Bindings: CloudflareBindings }>();

// --- HTTP Routes (fetch handler logic) ---

app.get("/", (c) => {
  return c.text("Hello Hono! This Worker handles both HTTP and Queues.");
});

// Route to publish a message to the queue
app.post("/enqueue", async (c) => {
  try {
    const body = await c.req.json();
    // Use the binding to send the message
    await c.env.ANKISUB_QUEUE.send(body);
    return c.json({ status: "Message successfully enqueued" }, 202);
  } catch (error) {
    console.error("Failed to enqueue message:", error);
    return c.json({ status: "Error during enqueue" }, 500);
  }
});

// --- Queue Consumer Handler (The async queue function) ---

/**
 * The consumer function is called by the Cloudflare Worker runtime
 * whenever a batch of messages arrives in the queue.
 */
async function queueHandler(
  batch: MessageBatch,
  env: CloudflareBindings
): Promise<void> {
  console.log(
    `Received batch of ${batch.messages.length} messages from queue: ${batch.queue}`
  );

  for (const message of batch.messages) {
    try {
      // The message body is the data you sent via the .send() method
      console.log(`Processing message ID: ${message.id}`);
      console.log("Message Content:", message.body);

      // *** Add your asynchronous processing logic here (e.g., database writes, API calls) ***
    } catch (error) {
      console.error(`Error processing message ID ${message.id}:`, error);

      // If a message fails, you can explicitly retry it, otherwise throwing
      // an error will cause the whole batch to be retried (up to 3 times).
      // message.retry();
    }
  }

  // Note: Unprocessed messages (due to errors) are automatically retried.
}

// 3. Combine Hono's fetch handler and the separate queue handler into the default export
// This is the structure the Cloudflare Worker runtime expects for multi-entry-point workers.
export default {
  // The Hono app's fetch method handles HTTP requests
  fetch: app.fetch,

  // The separate queueHandler handles Queue messages
  queue: queueHandler,
};
