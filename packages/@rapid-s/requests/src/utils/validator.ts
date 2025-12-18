import { z } from "zod";
import { ValidationError } from "../core/error";

/**
 * 验证数据是否符合 Zod Schema
 */
export async function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  context: { url?: string; method?: string; type: "request" | "response" }
): Promise<z.infer<T>> {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error, context);
    }
    throw error;
  }
}

/**
 * 同步验证数据
 */
export function validateSync<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  context: { url?: string; method?: string; type: "request" | "response" }
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error, context);
    }
    throw error;
  }
}
