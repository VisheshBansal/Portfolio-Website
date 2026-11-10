/** In-page links shared by the header and footer. Each href matches a section's id. */

export interface SectionLink {
  readonly href: `#${string}`;
  readonly label: string;
}

const sections = {
  about: { href: '#about', label: 'About' },
  range: { href: '#range', label: 'Range' },
  work: { href: '#work', label: 'Work' },
  ambition: { href: '#ambition', label: 'Ambition' },
  faq: { href: '#faq', label: 'Before you ask' },
  places: { href: '#places', label: 'Places' },
  icebreakers: { href: '#icebreakers', label: 'Icebreakers' },
} satisfies Record<string, SectionLink>;

export const headerLinks: readonly SectionLink[] = [sections.about, sections.work, sections.ambition, sections.faq];
export const footerLinks: readonly SectionLink[] = [
  sections.range,
  sections.work,
  sections.ambition,
  sections.faq,
  sections.places,
  sections.icebreakers,
];
