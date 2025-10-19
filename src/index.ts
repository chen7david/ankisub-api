import { Hono } from "hono";
import { queueHandler } from "./handlers/queue.handler";
import { userRouter } from "./controllers/users/user.controller";

// 1. HTTP Handler (Hono app)
const app = new Hono<{ Bindings: CloudflareBindings }>();
app.route("/api", userRouter);

// 3. Export the combined handlers
export default {
  fetch: app.fetch,
  queue: queueHandler,
};
