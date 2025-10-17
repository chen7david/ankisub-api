import { Hono } from "hono";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.post("/enqueue", async (c) => {
  const body = await c.req.json();
  await c.env.ANKISUB_QUEUE.send(body);
  return c.json({ status: "Message enqueued" });
});

export default app;
