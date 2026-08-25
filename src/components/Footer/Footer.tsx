import { ArrowIcon } from './ArrowIcon';
import {
  BRAND_LINKS,
  COMMUNITY_LINKS,
  ECOSYSTEM_LINKS,
  NEWSLETTER_FORM_ACTION,
  RESOURCES_LINKS,
  SWARM_LOGO_PATH,
  UPCOMING_EVENTS,
  USE_SWARM_LINKS,
} from './constants';
import { LinkList } from './LinkList';

import './Footer.scss';

const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-top">
          <section className="footer-section footer-section--events">
            <h3 className="footer-heading">Upcoming events</h3>
            <LinkList links={UPCOMING_EVENTS} />
          </section>

          <section className="footer-section footer-section--community">
            <h3 className="footer-heading">Community</h3>
            <LinkList links={COMMUNITY_LINKS} />
          </section>

          <section className="footer-section footer-section--newsletter">
            <h3 className="footer-heading">Newsletter</h3>
            <form
              className="footer-newsletter-form"
              action={NEWSLETTER_FORM_ACTION}
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
            <img className="footer-logo" src={SWARM_LOGO_PATH} alt="Swarm" />
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
