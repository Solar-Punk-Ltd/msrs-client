export interface FooterLink {
  label: string;
  href: string;
}

// Mirrors the footer on scc.swarm.bzz.link — static, no per-event maintenance
export const BRAND_LINKS: FooterLink[] = [
  { label: 'ethswarm.org', href: 'https://www.ethswarm.org' },
  { label: 'Documentation', href: 'https://docs.ethswarm.org' },
  { label: 'Blog', href: 'https://blog.ethswarm.org' },
];

export const COMMUNITY_LINKS: FooterLink[] = [
  { label: 'Discord', href: 'https://discord.com/invite/hyCr9BMX9U' },
  { label: 'X (Twitter)', href: 'https://x.com/ethswarm' },
  { label: 'Reddit', href: 'https://www.reddit.com/r/ethswarm/' },
  { label: 'YouTube', href: 'https://www.youtube.com/@EthereumSwarm' },
];

export const DEVELOPMENT_LINKS: FooterLink[] = [
  { label: 'GitHub', href: 'https://github.com/ethersphere' },
  { label: 'Developer Hub', href: 'https://docs.ethswarm.org/docs/develop/introduction/' },
  { label: 'Research Papers', href: 'https://papers.ethswarm.org/' },
  { label: 'Beeport', href: 'https://beeport.ethswarm.org/' },
];

export const RESOURCES_LINKS: FooterLink[] = [
  { label: 'Swarm Hub', href: 'https://links.ethswarm.org/' },
  { label: 'Desktop App', href: 'https://desktop.ethswarm.org/' },
  { label: 'Swarmy', href: 'https://swarmy.cloud/' },
  { label: 'Etherjot', href: 'https://etherjot.eth.limo/' },
];

export const SWARM_LOGO_PATH = '/assets/themes/swarm/logo.svg';
export const NEWSLETTER_FORM_ACTION = 'https://mautic.ethswarm.org/index.php/form/submit?formId=4';
