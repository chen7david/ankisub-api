import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { loginUserReqeustSchema } from "./user.validation";

export const userRouter = new Hono();

userRouter.post(
  "/v1/login",
  zValidator("json", loginUserReqeustSchema),
  async (c) => {
    const { username, password } = c.req.valid("json");
    return c.json({ username, password });
  }
);
