import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// Helper to create Drizzle instance from D1 binding
export const createDb = (d1: D1Database) => {
  return drizzle(d1, { schema });
};

// Export schema and types
export { schema };
export type DbType = ReturnType<typeof createDb>;
