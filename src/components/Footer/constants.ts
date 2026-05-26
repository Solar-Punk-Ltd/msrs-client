export interface FooterLink {
  label: string;
  href: string;
}

export const UPCOMING_EVENTS: FooterLink[] = [
  { label: 'Workshop: How to Decentralize Any Frontend?, online, May 5', href: 'https://workshops.swarm.bzz.link/' },
  { label: 'Workshop: Decentralized Streaming, online, May 12', href: 'https://workshops.swarm.bzz.link/' },
  { label: 'Swarm Community Call, online, May 28', href: 'https://scc.swarm.bzz.link/' },
];

export const COMMUNITY_LINKS: FooterLink[] = [
  { label: 'Discord', href: 'https://discord.ethswarm.org' },
  { label: 'GitHub', href: 'https://github.com/ethersphere' },
  { label: 'X / Twitter', href: 'https://twitter.com/ethswarm' },
  { label: 'Reddit', href: 'https://www.reddit.com/r/ethswarm/' },
  { label: 'YouTube', href: 'https://www.youtube.com/channel/UCu6ywn9MTqdREuE6xuRkskA/videos' },
];

export const USE_SWARM_LINKS: FooterLink[] = [
  { label: 'Start Building', href: 'https://www.ethswarm.org/build' },
  { label: 'Run a Node', href: 'https://www.ethswarm.org/build/run-a-full-node' },
  { label: 'Swarm Desktop', href: 'https://www.ethswarm.org/build/desktop' },
  { label: 'Awesome Swarm', href: 'https://github.com/ethersphere/awesome-swarm' },
  { label: 'Swarm Gateway', href: 'https://gateway.ethswarm.org/' },
  { label: 'Get BZZ', href: 'https://www.ethswarm.org/get-bzz' },
];

export const RESOURCES_LINKS: FooterLink[] = [
  { label: 'Technology', href: 'https://www.ethswarm.org/why' },
  { label: 'Bee docs', href: 'https://docs.ethswarm.org/docs/' },
  { label: 'Bee.js docs', href: 'https://bee-js.ethswarm.org/docs/' },
  { label: 'Network stats', href: 'https://swarmscan.io/' },
  { label: 'Contribute', href: 'https://www.ethswarm.org/contribute' },
  { label: 'Roadmap', href: 'https://roadmap.ethswarm.org/' },
  { label: 'Blog', href: 'https://blog.ethswarm.org' },
];

export const ECOSYSTEM_LINKS: FooterLink[] = [
  { label: 'Grants', href: 'https://www.ethswarm.org/grants' },
  { label: 'Bounties', href: 'https://app.dework.xyz/swarm-41421' },
  { label: 'Fair Data Society', href: 'https://fairdatasociety.org/' },
  { label: 'The Hivemaker’s Code', href: 'https://toolkit.ethswarm.org/' },
];

export const BRAND_LINKS: FooterLink[] = [
  { label: 'Papers', href: 'https://papers.ethswarm.org/' },
  { label: 'Foundation', href: 'https://www.ethswarm.org/foundation' },
  { label: 'Jobs', href: 'https://www.ethswarm.org/jobs' },
];

export const SWARM_LOGO_PATH = '/assets/themes/swarm/logo.svg';
export const NEWSLETTER_FORM_ACTION = 'https://mautic.ethswarm.org/index.php/form/submit?formId=4';
