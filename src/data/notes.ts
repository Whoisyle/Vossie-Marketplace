import { galleryOf } from "@/components/art/photos";

import type { ProductDetail } from "./mock/productDetails";
import type { CampusId, Listing, NotesMeta, Seller } from "./types";

/**
 * Digital study notes: packs a student sells for one module, found by module name, module code and campus. They have no delivery:
 * the buyer pays and the file opens straight away. Every pack, module, seller and page here is made up for the demo; real notes
 * arrive when sellers upload files to storage.
 */

export const NOTES_CAMPUSES: { id: CampusId; name: string }[] = [
  { id: "potchefstroom", name: "Potchefstroom" },
  { id: "pretoria", name: "Pretoria" },
  { id: "cape-town-mowbray", name: "Cape Town" },
];

export const noteSellers: Seller[] = [
  { id: "zinhle-notes", name: "Zinhle's Study Notes", campusId: "potchefstroom", location: "Online, instant download", bio: "Clear, exam-ready summaries from a final-year IT student.", rating: 4.9, ratingCount: 63, followers: 312 },
  { id: "kabelo-notes", name: "Kabelo Notes", campusId: "cape-town-mowbray", location: "Online, instant download", bio: "Business and accounting notes that follow the study guide.", rating: 4.8, ratingCount: 41, followers: 188 },
];

type Seed = { code: string; module: string; sellerId: string; campusId: CampusId; year: 1 | 2 | 3; pages: number; priceCents: number; rating: number; ratingCount: number; lecturer: string; blurb: string };

const SEEDS: Seed[] = [
  { blurb: "Sets, functions, matrices and logic with worked examples from past tests.", campusId: "potchefstroom", code: "ITMA101", lecturer: "Mr. Naidoo", module: "Mathematics for IT", pages: 42, priceCents: 3000, rating: 4.9, ratingCount: 58, sellerId: "zinhle-notes", year: 1 },
  { blurb: "Contracts, delict and company law in plain language, with case summaries.", campusId: "potchefstroom", code: "BLAW101", lecturer: "Ms. Dlamini", module: "Business Law", pages: 36, priceCents: 1500, rating: 4.7, ratingCount: 34, sellerId: "zinhle-notes", year: 1 },
  { blurb: "Variables to loops to functions, with every exercise explained step by step.", campusId: "pretoria", code: "ITPR101", lecturer: "Mr. Botha", module: "Programming Fundamentals", pages: 56, priceCents: 4500, rating: 4.9, ratingCount: 77, sellerId: "zinhle-notes", year: 1 },
  { blurb: "The accounting equation, journals, ledgers and the trial balance made simple.", campusId: "cape-town-mowbray", code: "FACC101", lecturer: "Mrs. Adams", module: "Financial Accounting 1", pages: 48, priceCents: 3500, rating: 4.8, ratingCount: 29, sellerId: "kabelo-notes", year: 1 },
  { blurb: "The marketing mix, segmentation and consumer behaviour, plus exam question practice.", campusId: "cape-town-mowbray", code: "MKTG101", lecturer: "Mr. Jacobs", module: "Marketing Principles", pages: 30, priceCents: 2500, rating: 4.6, ratingCount: 18, sellerId: "kabelo-notes", year: 1 },
  { blurb: "Entities, keys, normalisation and SQL queries with an exam cheat-sheet.", campusId: "pretoria", code: "ITDB201", lecturer: "Ms. Khumalo", module: "Database Design", pages: 64, priceCents: 6000, rating: 4.9, ratingCount: 45, sellerId: "kabelo-notes", year: 2 },
];

const metaOf = (seed: Seed): NotesMeta => ({
  campusId: seed.campusId,
  fileName: `${seed.code}-notes.pdf`,
  lecturer: seed.lecturer,
  moduleCode: seed.code,
  moduleName: seed.module,
  pages: seed.pages,
  previewPages: 2,
  year: seed.year,
});

export const noteListings: Listing[] = SEEDS.map((seed, index) => ({
  campusId: seed.campusId,
  categoryId: "books",
  createdDaysAgo: 2 + index,
  description: `${seed.blurb} ${seed.pages} pages, PDF, yours to keep. Written for ${seed.module} (${seed.code}).`,
  id: `notes-${seed.code.toLowerCase()}`,
  images: galleryOf(`notes-${seed.code.toLowerCase()}`),
  location: "Digital download",
  notes: metaOf(seed),
  openHours: "Always open",
  options: [],
  pickupTime: "Instant",
  popular: true,
  priceCents: seed.priceCents,
  rating: seed.rating,
  ratingCount: seed.ratingCount,
  sellerId: seed.sellerId,
  title: `${seed.code} · ${seed.module} notes`,
}));

/** Notes matching a search (module name, module code, title or campus name) on one campus, or on all of them. */
export function searchNotes(all: Listing[], query: string, campusId: CampusId | "all"): Listing[] {
  const needle = query.trim().toLowerCase();
  return all.filter((listing) => {
    const notes = listing.notes;
    if (!notes) return false;
    if (campusId !== "all" && notes.campusId !== campusId) return false;
    if (!needle) return true;
    const campus = NOTES_CAMPUSES.find((item) => item.id === notes.campusId)?.name ?? "";
    return [notes.moduleName, notes.moduleCode, listing.title, campus].some((field) => field.toLowerCase().includes(needle));
  });
}

export function notesCampusName(id: CampusId): string {
  return NOTES_CAMPUSES.find((item) => item.id === id)?.name ?? id;
}

export type NotesPage = { heading: string; points: string[] };

const OUTLINES: Record<string, NotesPage[]> = {
  ITMA101: [
    { heading: "1. Sets and set notation", points: ["A set is a collection of distinct objects.", "Union, intersection and complement, with Venn diagrams.", "Worked example: A = {1, 2, 3}, B = {2, 3, 4}."] },
    { heading: "2. Functions", points: ["Domain, range and the vertical line test.", "One-to-one and onto functions.", "Composition: (f ∘ g)(x) = f(g(x))."] },
    { heading: "3. Matrices", points: ["Adding and multiplying matrices.", "The identity matrix and the inverse.", "Past test question with full solution."] },
    { heading: "4. Logic and truth tables", points: ["AND, OR, NOT and implication.", "Build a truth table in four steps.", "De Morgan's laws."] },
    { heading: "5. Counting", points: ["Permutations and combinations.", "When order matters and when it does not.", "Five practice questions."] },
    { heading: "6. Exam checklist", points: ["Formulas to memorise.", "Common mistakes lecturers mark down.", "A two-hour revision plan."] },
  ],
  default: [
    { heading: "1. What this module is about", points: ["The big ideas, in one page.", "How the module is assessed.", "What to read first."] },
    { heading: "2. Key terms", points: ["The twenty terms that appear in every test.", "Each one in one plain sentence.", "A memory trick for the hard ones."] },
    { heading: "3. Core concepts", points: ["Concept maps for each study-guide chapter.", "Worked examples from past papers.", "Where students lose marks."] },
    { heading: "4. Practice questions", points: ["Ten questions with full answers.", "Marking guide for each.", "Time yourself: 90 seconds a mark."] },
    { heading: "5. Case studies and examples", points: ["Real-world examples to quote in essays.", "How to structure a long answer.", "Opening and closing lines that score."] },
    { heading: "6. Exam checklist", points: ["Formulas and definitions to memorise.", "Last-week revision plan.", "What to do in the first five minutes."] },
  ],
};

/** The pages of a pack as the demo reader shows them: six sample pages, each with a heading and three points. */
export function notesOutline(code: string): NotesPage[] {
  return OUTLINES[code] ?? OUTLINES.default!;
}

/** The long-form facts of a notes pack, built from its module details so a pack a student uploads gets the same page as the demo ones. */
export function notesDetailFor(listing: Listing): ProductDetail {
  const notes = listing.notes!;
  return {
    about: [
      listing.description,
      `Written by a student who has passed ${notes.moduleName} (${notes.moduleCode}). It follows the study guide in order, so you can read it alongside your lectures or use it for last-minute revision.`,
    ],
    highlights: [
      `Made for ${notes.moduleCode} at ${notesCampusName(notes.campusId)}`,
      "Instant download, no delivery and no waiting",
      "Worked examples and an exam checklist",
      `Read the first ${notes.previewPages} pages free before you buy`,
    ],
    specs: [
      ["Module", notes.moduleName],
      ["Module code", notes.moduleCode],
      ["Campus", notesCampusName(notes.campusId)],
      ["Year of study", `Year ${notes.year}`],
      ["Lecturer", notes.lecturer ?? "Not listed"],
      ["Format", `PDF, ${notes.pages} pages`],
      ["Delivery", "Instant digital download"],
      ["Yours to keep", "Opens any time from My study notes"],
    ],
  };
}
