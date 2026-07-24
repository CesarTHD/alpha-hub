import { z } from "zod";

/**
 * FormData.get() returns `null` for a field that isn't in the DOM at all (e.g. a
 * conditionally-rendered hidden input, or FormData built by hand instead of from a
 * real <form>), and `""` for a field that's present but left empty. Zod's `.optional()`
 * only treats `undefined` as "absent", so both of those need normalizing first —
 * otherwise validation fails even though the field was legitimately left blank.
 */
export function optionalText(schema: z.ZodString) {
  return z.preprocess((v) => (v === null || v === "" ? undefined : v), schema.optional());
}
