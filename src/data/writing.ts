/** Published writing, newest first. */

export interface Article {
  readonly title: string;
  readonly outlet: string;
  readonly year: string;
  readonly href: string;
}

export const writing: readonly Article[] = [
  {
    title: 'Why we moved from Ory Kratos to Descope',
    outlet: 'Descope',
    year: '2025',
    href: 'https://www.descope.com/blog/post/ory-to-descope',
  },
  {
    title: 'Design at CodeChef-VIT: A Practical Handbook',
    outlet: 'CodeChef-VIT',
    year: '2022',
    href: 'https://medium.com/codechef-vit/design-at-codechef-vit-a-practical-handbook-11f3d177605',
  },
  {
    title: 'VITTY: From an Idea to a Reality',
    outlet: 'GDSC VIT',
    year: '2022',
    href: 'https://medium.com/gdg-vit/vitty-from-an-idea-to-a-reality-25bed956bee9',
  },
  { title: 'Notifier Bot', outlet: 'GDSC VIT', year: '2021', href: 'https://medium.com/gdg-vit/notifier-bot-be892baaf445' },
];
