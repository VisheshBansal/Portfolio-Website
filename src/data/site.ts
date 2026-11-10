/** Site-wide identity and contact data: name, location, inbox and social links. */

/** The one place the domain lives: the site's address (astro.config.mjs) and its inbox both derive from it. */
export const domain = 'visheshb.com';

export interface SocialLink {
  readonly label: string;
  readonly href: string;
}

export interface Place {
  readonly city: string;
  readonly region: string;
}

export interface Person {
  readonly name: string;
  readonly first: string;
  readonly last: string;
  readonly summary: string;
  readonly location: Place;
  readonly timezone: string;
  readonly email: string;
  readonly favouriteColour: string;
  readonly links: readonly SocialLink[];
}

export const person: Person = {
  name: 'Vishesh Bansal',
  first: 'Vishesh',
  last: 'Bansal',
  summary: 'Builder at heart with a deep-rooted passion for security, infrastructure, and scaling early-stage products from 0 to 1.',
  location: { city: 'Dallas', region: 'Texas' },
  timezone: 'America/Chicago',
  email: `hi@${domain}`,
  favouriteColour: '#7CFC06',
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/bansalvishesh' },
    { label: 'GitHub', href: 'https://github.com/VisheshBansal' },
    { label: 'Medium', href: 'https://medium.com/@visheshbansal' },
    { label: 'X', href: 'https://x.com/VisheshBansal17' },
    { label: 'Instagram', href: 'https://instagram.com/thevisheshbansal' },
  ],
};
