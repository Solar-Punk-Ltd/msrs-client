import './Footer.scss';

interface FooterLink {
  label: string;
  href: string;
}

const UPCOMING_EVENTS: FooterLink[] = [
  { label: 'Workshop: How to Decentralize Any Frontend?, online, May 5', href: 'https://workshops.swarm.bzz.link/' },
  { label: 'Workshop: Decentralized Streaming, online, May 12', href: 'https://workshops.swarm.bzz.link/' },
  { label: 'Swarm Community Call, online, May 28', href: 'https://scc.swarm.bzz.link/' },
];

const COMMUNITY_LINKS: FooterLink[] = [
  { label: 'Discord', href: 'https://discord.ethswarm.org' },
  { label: 'GitHub', href: 'https://github.com/ethersphere' },
  { label: 'X / Twitter', href: 'https://twitter.com/ethswarm' },
  { label: 'Reddit', href: 'https://www.reddit.com/r/ethswarm/' },
  { label: 'YouTube', href: 'https://www.youtube.com/channel/UCu6ywn9MTqdREuE6xuRkskA/videos' },
];

const USE_SWARM_LINKS: FooterLink[] = [
  { label: 'Start Building', href: 'https://www.ethswarm.org/build' },
  { label: 'Run a Node', href: 'https://www.ethswarm.org/build/run-a-full-node' },
  { label: 'Swarm Desktop', href: 'https://www.ethswarm.org/build/desktop' },
  { label: 'Awesome Swarm', href: 'https://github.com/ethersphere/awesome-swarm' },
  { label: 'Swarm Gateway', href: 'https://gateway.ethswarm.org/' },
  { label: 'Get BZZ', href: 'https://www.ethswarm.org/get-bzz' },
];

const RESOURCES_LINKS: FooterLink[] = [
  { label: 'Technology', href: 'https://www.ethswarm.org/why' },
  { label: 'Bee docs', href: 'https://docs.ethswarm.org/docs/' },
  { label: 'Bee.js docs', href: 'https://bee-js.ethswarm.org/docs/' },
  { label: 'Network stats', href: 'https://swarmscan.io/' },
  { label: 'Contribute', href: 'https://www.ethswarm.org/contribute' },
  { label: 'Roadmap', href: 'https://roadmap.ethswarm.org/' },
  { label: 'Blog', href: 'https://blog.ethswarm.org' },
];

const ECOSYSTEM_LINKS: FooterLink[] = [
  { label: 'Grants', href: 'https://www.ethswarm.org/grants' },
  { label: 'Bounties', href: 'https://app.dework.xyz/swarm-41421' },
  { label: 'Fair Data Society', href: 'https://fairdatasociety.org/' },
  { label: 'The Hivemaker’s Code', href: 'https://toolkit.ethswarm.org/' },
];

const BRAND_LINKS: FooterLink[] = [
  { label: 'Papers', href: 'https://papers.ethswarm.org/' },
  { label: 'Foundation', href: 'https://www.ethswarm.org/foundation' },
  { label: 'Jobs', href: 'https://www.ethswarm.org/jobs' },
];

const CURRENT_YEAR = new Date().getFullYear();

function CalendarIcon() {
  return (
    <svg className="footer-calendar-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 16">
      <g fill="#F6F7F9" clipPath="url(#footer-cal-a)">
        <path d="M8.467 14h-6V6h12v2h2V4a1 1 0 0 0-1-1h-2V1a1 1 0 0 0-2 0v2h-6V1a1 1 0 0 0-2 0v2h-2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h7v-2Z" />
        <path d="M15.967 12h-1.5v-1.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5V12h-1.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1.5v1.5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5V14h1.5a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5Z" />
      </g>
      <defs>
        <clipPath id="footer-cal-a">
          <path fill="#fff" d="M.467 0h16v16h-16z" />
        </clipPath>
      </defs>
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      className="footer-arrow-icon"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function LinkList({ links }: { links: FooterLink[] }) {
  return (
    <ul className="footer-link-list">
      {links.map((link) => (
        <li key={link.href + link.label}>
          <a className="footer-link" href={link.href} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-top">
          <section className="footer-section footer-section--events">
            <h3 className="footer-heading">Upcoming events</h3>
            <ul className="footer-event-list">
              {UPCOMING_EVENTS.map((event) => (
                <li key={event.label} className="footer-event">
                  <a className="footer-link" href={event.href} target="_blank" rel="noreferrer">
                    {event.label}
                  </a>
                  <a
                    className="footer-event-calendar"
                    href={event.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Add ${event.label} to calendar`}
                  >
                    <CalendarIcon />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="footer-section footer-section--community">
            <h3 className="footer-heading">Community</h3>
            <LinkList links={COMMUNITY_LINKS} />
          </section>

          <section className="footer-section footer-section--newsletter">
            <h3 className="footer-heading">Newsletter</h3>
            <form
              className="footer-newsletter-form"
              action="https://mautic.ethswarm.org/index.php/form/submit?formId=4"
              method="post"
              target="_blank"
              encType="multipart/form-data"
            >
              <div className="footer-newsletter-input-wrap">
                <label className="sr-only" htmlFor="footer-newsletter-email">
                  Enter your email address
                </label>
                <input
                  id="footer-newsletter-email"
                  className="footer-newsletter-input"
                  type="email"
                  name="mauticform[email_address]"
                  placeholder="Enter your email address"
                  required
                />
                <button type="submit" className="footer-newsletter-submit" aria-label="Subscribe">
                  <ArrowIcon />
                </button>
              </div>
              <input type="hidden" name="mauticform[formId]" value="4" />
              <input type="hidden" name="mauticform[formName]" value="websitenewslettersubscription" />
              <input type="hidden" name="mauticform[gdpr_accepted]" value="1" />
              <input type="hidden" name="mauticform[i_consent_to_gathering_an]" value="1" />
              <p className="footer-newsletter-disclaimer">
                By clicking on Subscribe you consent to usage of your given e-mail address for receiving communication
                and news about the Swarm project. Data will be controlled and processed by Swarm Foundation.
              </p>
            </form>
          </section>
        </div>

        <div className="footer-divider" />
      </div>

      <div className="footer-container">
        <div className="footer-middle">
          <div className="footer-brand">
            <img className="footer-logo" src="/assets/themes/swarm/logo.svg" alt="Swarm" />
            <p className="footer-tagline">
              Swarm provides censorship resistant storage and communication infrastructure for a sovereign digital
              society.
            </p>
            <LinkList links={BRAND_LINKS} />
          </div>

          <section className="footer-section">
            <h3 className="footer-heading">Use Swarm</h3>
            <LinkList links={USE_SWARM_LINKS} />
          </section>

          <section className="footer-section">
            <h3 className="footer-heading">Resources</h3>
            <LinkList links={RESOURCES_LINKS} />
          </section>

          <section className="footer-section">
            <h3 className="footer-heading">Ecosystem</h3>
            <LinkList links={ECOSYSTEM_LINKS} />
          </section>
        </div>
      </div>

      <div className="footer-container">
        <div className="footer-bottom">
          <span>Swarm Foundation, {CURRENT_YEAR}</span>
          <span className="footer-bottom-separator">·</span>
          <a className="footer-bottom-link" href="https://www.ethswarm.org/privacy">
            Privacy policy
          </a>
          <a className="footer-bottom-link" href="https://swarm.bzz.link/" target="_blank" rel="noreferrer">
            Hosted on Swarm
          </a>
        </div>
      </div>
    </footer>
  );
}
