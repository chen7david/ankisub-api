import { Hono } from "hono";
import type { Queue, R2Bucket, D1Database } from "@cloudflare/workers-types";
import { queueHandler } from "./handlers/queue.handler";
import { userRouter } from "./controllers/users/user.controller";

// The CloudflareBindings interface defines ALL resources listed in wrangler.jsonc
export interface CloudflareBindings {
  ANKISUB_BUCKET: R2Bucket;
  ANKISUB_QUEUE: Queue;
  ANKISUB_DB: D1Database;
  GEMINI_API_KEY: string;
}

// 1. HTTP Handler (Hono app)
const app = new Hono<{ Bindings: CloudflareBindings }>();
app.route("/api", userRouter);

// 3. Export the combined handlers
export default {
  fetch: app.fetch,
  queue: queueHandler,
};
