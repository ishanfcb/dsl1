// The sources table in data/DATA_SOURCES.md, read at build time, so hover notes name a source the same way
// the file does and the file stays the one place sources are listed.
import md from "../../data/DATA_SOURCES.md?raw";

export interface Source {
  id: string;
  /** What the source gives, as the table's middle column says it. */
  what: string;
  /** Link text of the source (publisher and headline, or authors and journal). */
  title: string;
  url?: string;
  /** Anything a reader should know about the link, e.g. that the live page is down and this is an archived copy. */
  note?: string;
}

const ROW = /^\|\s*(S\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/;
const LINK = /\[([^\]]+)\]\(([^)]+)\)/;
/** A "Note: ..." at the end of the source cell. */
const NOTE = /\s*·?\s*Note:\s*(.+)$/;

function parse(text: string): Record<string, Source> {
  const out: Record<string, Source> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = ROW.exec(line);
    if (!m) continue;
    const [, id, what, full] = m;
    const note = NOTE.exec(full)?.[1];
    const cell = full.replace(NOTE, "");
    const link = LINK.exec(cell);
    // A cell with a plain citation before its first link (e.g. S9's paper) keeps that citation as the title.
    const before = cell.split("[")[0].replace(/[·.\s]+$/, "").trim();
    out[id] = { id, what, title: before || link?.[1] || cell, url: link?.[2], note };
  }
  return out;
}

export const SOURCES = parse(md);
