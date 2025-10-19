import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { loginUserReqeustSchema } from "./user.validation";
import { createDb } from "../../db";
import { eq } from "drizzle-orm";
import { usersTable } from "../../db/schema";

export const userRouter = new Hono<{ Bindings: CloudflareBindings }>();

userRouter.post(
  "/v1/login",
  zValidator("json", loginUserReqeustSchema),
  async (c) => {
    const { username, password } = c.req.valid("json");
    const db = createDb(c.env.ANKISUB_DB);

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .get();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({ user, username, password });
  }
);
