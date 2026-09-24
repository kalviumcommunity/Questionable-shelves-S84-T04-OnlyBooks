export interface CitationData {
  id?: number | string;
  title: string;
  author: string;
  year: string;
  journal?: string;
  page?: string;
  callNumber?: string;
  doi?: string;
  collectionType?: string;
}

/**
 * Generate a standard BibTeX key from author and year, e.g. "Kuhn1962"
 */
export function generateBibTeXKey(citation: CitationData): string {
  const firstAuthor = citation.author.split(/[,&]/)[0].trim().replace(/[^a-zA-Z]/g, "") || "Scholar";
  const cleanYear = citation.year.replace(/\D/g, "") || "2026";
  const idSuffix = citation.id ? `_${citation.id}` : "";
  return `${firstAuthor}${cleanYear}${idSuffix}`;
}

/**
 * Format citation as standard BibTeX entry
 */
export function formatBibTeX(citation: CitationData): string {
  const key = generateBibTeXKey(citation);
  const isThesis = citation.collectionType?.toLowerCase().includes("thesis");
  const type = isThesis ? "phdthesis" : "article";

  const fields = [
    `  author    = {${citation.author}}`,
    `  title     = {${citation.title}}`,
    isThesis
      ? `  school    = {${citation.journal || "University Archive"}}`
      : `  journal   = {${citation.journal || "University Library Archive"}}`,
    `  year      = {${citation.year}}`,
  ];

  if (citation.page) {
    const cleanPage = citation.page.replace(/[^0-9\-]/g, "");
    if (cleanPage) fields.push(`  pages     = {${cleanPage}}`);
  }

  if (citation.callNumber) {
    fields.push(`  note      = {Call Number: ${citation.callNumber}}`);
  }

  if (citation.doi) {
    fields.push(`  doi       = {${citation.doi}}`);
  }

  return `@${type}{${key},\n${fields.join(",\n")}\n}`;
}

/**
 * Format citation in APA 7th Edition style
 */
export function formatAPA(citation: CitationData): string {
  const author = citation.author.endsWith(".") ? citation.author : `${citation.author}.`;
  const cleanYear = citation.year.replace(/[^0-9\-]/g, "") || "n.d.";
  const title = citation.title.endsWith(".") ? citation.title : `${citation.title}.`;
  const venue = citation.journal ? `${citation.journal}.` : "University Library Archive.";
  const callNum = citation.callNumber ? ` [Call No: ${citation.callNumber}]` : "";

  return `${author} (${cleanYear}). ${title} ${venue}${callNum}`;
}

/**
 * Format citation in MLA 9th Edition style
 */
export function formatMLA(citation: CitationData): string {
  const author = citation.author.endsWith(".") ? citation.author : `${citation.author}.`;
  const cleanYear = citation.year.replace(/[^0-9\-]/g, "") || "2026";
  const venue = citation.journal || "University Library Archive";
  const pageRef = citation.page ? `, ${citation.page}` : "";
  const callNum = citation.callNumber ? ` (${citation.callNumber})` : "";

  return `${author} "${citation.title}." ${venue}, ${cleanYear}${pageRef}.${callNum}`;
}

/**
 * Format citation in Chicago Notes & Bibliography style
 */
export function formatChicago(citation: CitationData): string {
  const author = citation.author.endsWith(".") ? citation.author : `${citation.author}.`;
  const cleanYear = citation.year.replace(/[^0-9\-]/g, "") || "2026";
  const venue = citation.journal || "University Library Archive";
  const pageRef = citation.page ? `: ${citation.page.replace(/^Pg\.\s*/i, "")}` : "";
  const callNum = citation.callNumber ? ` [${citation.callNumber}]` : "";

  return `${author} "${citation.title}." ${venue} (${cleanYear})${pageRef}.${callNum}`;
}

/**
 * Aggregate multiple citations into a single BibTeX file content
 */
export function exportAllBibTeX(citations: CitationData[]): string {
  const header = `% OnlyBooks University Library Export\n% Generated on: ${new Date().toISOString()}\n\n`;
  return header + citations.map((c) => formatBibTeX(c)).join("\n\n");
}

/**
 * Aggregate multiple citations into an APA formatted bibliography
 */
export function exportAllAPA(citations: CitationData[]): string {
  return citations.map((c) => formatAPA(c)).join("\n\n");
}

/**
 * Trigger browser download for a .bib file
 */
export function downloadBibTeXFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/x-bibtex;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename.endsWith(".bib") ? filename : `${filename}.bib`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
