import crypto from "node:crypto";

const COMBINING_MARKS = /[̀-ͯ]/g;
const NON_ALNUM = /[^a-z0-9]+/g;
const EDGE_HYPHENS = /^-+|-+$/g;

/** Lower-case, ASCII, hyphen-separated slug base. Falls back to "org". */
export const slugify = (input: string): string => {
  const base = input
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(NON_ALNUM, "-")
    .replace(EDGE_HYPHENS, "")
    .slice(0, 40)
    .replace(EDGE_HYPHENS, "");

  return base.length > 0 ? base : "org";
};

/**
 * Resolves a unique slug by appending a short random suffix while `exists`
 * reports a collision.
 */
export const generateUniqueSlug = async (
  input: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> => {
  const base = slugify(input);

  if (!(await exists(base))) {
    return base;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = crypto.randomBytes(3).toString("hex");
    const candidate = `${base}-${suffix}`;
    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  return `${base}-${crypto.randomUUID()}`;
};
