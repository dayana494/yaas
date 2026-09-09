import HeroGradientBackground from './HeroGradientBackground';
import { CONTACT } from '../data/homepageCopy';

// Screen 7 — Contact. Layout reference: jawshw.tilda.ws/#contacts — a full
// white section, a rounded gradient panel inside it (this site's own Hero
// gradient, not a copy of the reference's own), heading + contact channels
// centered on the panel, two product cans tilted diagonally at the
// panel's top-left/top-right, each one's own top edge breaking out past
// the panel's own top border rather than sitting cropped inside it.
// Shared as one component between the homepage's own Screen 7 slot
// (HomePage.jsx) and the standalone /contacts page (ContactsPage.jsx) — the
// same design, the same content, per spec, not two separate builds.
export default function ContactSection() {
  return (
    <section className="contact" id="contact">
      <div className="site-container">
        <div className="contact-frame">
          <div className="contact-panel">
            <HeroGradientBackground />

            <div className="contact-content">
              <h2 className="contact-heading">{CONTACT.h2}</h2>
              <p className="contact-copy">{CONTACT.copy}</p>

              <div className="contact-channels">
                {CONTACT.channels.map((channel) =>
                  channel.href ? (
                    <a key={channel.label} className="contact-channel" href={channel.href}>
                      {channel.label}
                    </a>
                  ) : (
                    <span key={channel.label} className="contact-channel contact-channel-static">
                      {channel.label}
                    </span>
                  )
                )}
              </div>

              <a className="contact-cta" href={CONTACT.ctaHref}>
                {CONTACT.cta}
              </a>
            </div>
          </div>

          <div className="contact-cans" aria-hidden="true">
            <img className="contact-can contact-can-1" src="/textures/thumbnails/blueberry.png" alt="" />
            <img className="contact-can contact-can-2" src="/textures/thumbnails/orange.png" alt="" />
          </div>
        </div>
      </div>
    </section>
  );
}
