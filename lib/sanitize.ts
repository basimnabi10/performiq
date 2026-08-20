/**
 * Server-side defense-in-depth for user-authored markdown (course articles).
 * The primary XSS control is the renderer itself (react-markdown + remark-gfm,
 * deliberately WITHOUT rehype-raw — raw HTML is escaped, never interpreted).
 * This adds a length cap and rejects obviously-dangerous raw patterns before
 * the content is ever persisted.
 */

const MAX_MARKDOWN_LENGTH = 50_000;

const DANGEROUS_PATTERNS = [/<script\b/i, /on\w+\s*=/i, /javascript:/i, /<iframe\b/i, /<embed\b/i, /<object\b/i];

export class UnsafeContentError extends Error {}

export function assertSafeMarkdown(body: string): void {
  if (body.length > MAX_MARKDOWN_LENGTH) {
    throw new UnsafeContentError(`Article body exceeds ${MAX_MARKDOWN_LENGTH} characters.`);
  }
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(body)) {
      throw new UnsafeContentError("Article body contains disallowed markup.");
    }
  }
}
