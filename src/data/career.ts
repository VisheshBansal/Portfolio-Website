/** Career history (newest first), patent and education. `draft` marks copy not yet approved. */

export interface Role {
  readonly org: string;
  readonly title: string;
  readonly start: string;
  readonly end: string;
  readonly place?: string;
  /** A one-line, first-person aside about the role. */
  readonly line: string;
  /** The real work, plainly stated. */
  readonly detail: string;
  readonly draft?: boolean;
}

export interface Education {
  readonly school: string;
  readonly what: string;
}

export const career: readonly Role[] = [
  {
    org: 'BalkanID',
    title: 'Global Director of Security and Customer Success',
    start: '2026',
    end: 'now',
    place: 'Dallas',
    line: 'Keeps customers secure and happy. Usually in that order.',
    detail: 'Leads security and customer success across BalkanID, an identity security platform.',
    draft: true,
  },
  {
    org: 'BalkanID',
    title: 'Director, India',
    start: '2023',
    end: 'now',
    line: 'Leads the India side of the house.',
    detail: 'Director for BalkanID in India.',
    draft: true,
  },
  {
    org: 'BalkanID',
    title: 'Founding Engineer',
    start: '2022',
    end: 'now',
    line: 'Product, engineering, and whatever broke at 2am.',
    detail: '0 to 1 product and engineering while wearing multiple hats.',
    draft: true,
  },
  {
    org: 'Groww',
    title: 'Product Security Engineer',
    start: '2023',
    end: '2023',
    place: 'Bengaluru',
    line: 'Security testing for an app millions of investors trust.',
    detail: 'Architected a real-time, event-driven application security testing framework.',
    draft: true,
  },
  {
    org: 'GDSC VIT',
    title: 'Lead',
    start: '2023',
    end: '2024',
    place: 'Vellore',
    line: 'Herded a club of students who build things for fun.',
    detail: 'Led Google Developer Student Clubs at VIT after two years as a full stack, ML and security developer there.',
    draft: true,
  },
  {
    org: 'Uptycs',
    title: 'Threat Intelligence Engineer',
    start: '2023',
    end: '2023',
    place: 'Bengaluru',
    line: 'Learned that attackers do not take weekends either.',
    detail: 'Threat intelligence engineering.',
    draft: true,
  },
  {
    org: 'OneCard',
    title: 'Cloud Security Engineer',
    start: '2022',
    end: '2022',
    place: 'Pune',
    line: 'Wrote a tiny language so security alerts stop shouting over each other.',
    detail:
      'Built SAL (Security Alerts with Lambda), a DSL on CRED DIAL that correlates real-time AWS security alerts into Slack, plus CloudFormation and GuardDuty pipelines. (FPL Technologies)',
    draft: true,
  },
  {
    org: 'Grant Thornton',
    title: 'Cyber and IT Risk',
    start: '2022',
    end: '2022',
    place: 'Gurugram',
    line: "Found someone's ID card, got it printed, walked right in. Sanctioned test, before you ask.",
    detail:
      'Security assessments for the Cyber and IT Risk team: Nessus scans across IP ranges, findings triaged into mitigations, reports written up.',
    draft: true,
  },
  {
    org: 'CloudSEK',
    title: 'Security Engineer',
    start: '2022',
    end: '2022',
    line: 'Taught a scanner to read Flutter and React Native apps. It found secrets.',
    detail:
      'Made the BeVigil engine extract strings from Flutter and React Native binaries, improved secret discovery and redesigned the scoring system.',
    draft: true,
  },
  {
    org: 'SecLogic',
    title: 'Associate, Cyber Threat Intelligence',
    start: '2021',
    end: '2021',
    line: 'First job: staring at clouds for a living. The computing kind.',
    detail: 'Built cloud security, risk detection and vulnerability analysis tools; researched CSPM.',
    draft: true,
  },
];

export const patent = 'Recommendation and Remediation of Role-Based Access Control Postures for Identities';

export const education: readonly Education[] = [
  { school: 'Vellore Institute of Technology', what: 'B.Tech, Computer Science and Engineering' },
  { school: 'Delhi Public School, Gurgaon', what: 'High school' },
];
