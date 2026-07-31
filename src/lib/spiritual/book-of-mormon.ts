// Book of Mormon structure, in reading order, with chapter counts.
//
// Chapters only — not verses. The reading tracker selects a book and a chapter,
// so verse counts would be a few thousand unused numbers to carry around. If
// verse-level tracking is wanted later this is where it would go.
//
// The counts total 239, the published chapter count for the Book of Mormon.
//
// Each book also carries its churchofjesuschrist.org URL slug. These aren't
// derivable from the name — "Helaman" is `hel`, "Words of Mormon" is `w-of-m` — so
// they're listed explicitly. All 15 were verified to resolve.

export type BookName = (typeof BOOKS)[number]["name"];

export const BOOKS = [
  { name: "1 Nephi", slug: "1-ne", chapters: 22 },
  { name: "2 Nephi", slug: "2-ne", chapters: 33 },
  { name: "Jacob", slug: "jacob", chapters: 7 },
  { name: "Enos", slug: "enos", chapters: 1 },
  { name: "Jarom", slug: "jarom", chapters: 1 },
  { name: "Omni", slug: "omni", chapters: 1 },
  { name: "Words of Mormon", slug: "w-of-m", chapters: 1 },
  { name: "Mosiah", slug: "mosiah", chapters: 29 },
  { name: "Alma", slug: "alma", chapters: 63 },
  { name: "Helaman", slug: "hel", chapters: 16 },
  { name: "3 Nephi", slug: "3-ne", chapters: 30 },
  { name: "4 Nephi", slug: "4-ne", chapters: 1 },
  { name: "Mormon", slug: "morm", chapters: 9 },
  { name: "Ether", slug: "ether", chapters: 15 },
  { name: "Moroni", slug: "moro", chapters: 10 },
] as const;

export const TOTAL_CHAPTERS = BOOKS.reduce((sum, book) => sum + book.chapters, 0);

export type Reading = { book: string; chapter: number };

/** Where a brand-new reader starts. */
export const FIRST_READING: Reading = { book: "1 Nephi", chapter: 1 };

export function chaptersIn(book: string): number {
  return BOOKS.find((entry) => entry.name === book)?.chapters ?? 0;
}

export function isValidReading(value: unknown): value is Reading {
  if (typeof value !== "object" || value === null) return false;
  const { book, chapter } = value as Reading;
  if (typeof book !== "string" || typeof chapter !== "number") return false;
  if (!Number.isInteger(chapter) || chapter < 1) return false;
  return chapter <= chaptersIn(book);
}

/**
 * The chapter after this one, rolling into the next book at a book's end and
 * wrapping to the beginning after Moroni 10 — finishing the book starts it over
 * rather than dead-ending the tracker.
 */
export function nextReading(current: Reading): Reading {
  const index = BOOKS.findIndex((entry) => entry.name === current.book);
  if (index === -1) return FIRST_READING;

  const book = BOOKS[index];
  if (current.chapter < book.chapters) {
    return { book: book.name, chapter: current.chapter + 1 };
  }

  const next = BOOKS[index + 1];
  return next ? { book: next.name, chapter: 1 } : FIRST_READING;
}

export function formatReading(reading: Reading): string {
  return `${reading.book} ${reading.chapter}`;
}

/**
 * A churchofjesuschrist.org study link for one chapter.
 *
 * On a phone this opens the Gospel Library app rather than a browser: the site
 * publishes an apple-app-site-association claiming `/scriptures/bofm/*` and
 * `/study/*` for `org.lds.gospelstudy`, so iOS hands the URL to the app when it's
 * installed and falls back to the web when it isn't. No custom URL scheme needed,
 * and nothing breaks on desktop.
 *
 * Note the association excludes any URL containing `platform=web` — do not add
 * that parameter, or the app will deliberately decline to open.
 */
export function studyUrl(reading: Reading): string {
  const slug = BOOKS.find((book) => book.name === reading.book)?.slug;
  if (!slug) return "https://www.churchofjesuschrist.org/?lang=eng";
  return `https://www.churchofjesuschrist.org/study/scriptures/bofm/${slug}/${reading.chapter}?lang=eng`;
}

/** Where the non-scripture rows point. */
export const CHURCH_HOME = "https://www.churchofjesuschrist.org/?lang=eng";
