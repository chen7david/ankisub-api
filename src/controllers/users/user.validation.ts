import { z } from "zod";

export const loginUserReqeustSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(3),
});

export type LoginUserRequestSchemaType = z.infer<typeof loginUserReqeustSchema>;
