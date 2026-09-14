import { useState } from 'react';
import SectionHeading from './SectionHeading';
import { FAQ_HEADING, FAQ_ITEMS } from '../data/faq';

// Screen 6 — FAQ. Mechanic copied from donedrinks.com's own FAQ block (not
// its colors/fonts): a column of question cards, collapsed to just their
// title + a round "+" toggle, one expanding at a time to reveal its answer
// with an animated height/opacity reveal instead of an instant snap. Cards
// themselves are styled like the rest of the site's own cards (20px
// radius, soft shadow, Soledago/Beiruti) — donedrinks.com's own look isn't
// reused, only its open/close behavior.
export default function FaqScreen() {
  const [openId, setOpenId] = useState(null);

  return (
    <section className="faq" id="faq">
      <div className="section-heading-grid faq-heading-grid">
        <SectionHeading as="h2" className="faq-heading" text={FAQ_HEADING} />
      </div>
      <div className="site-container faq-container">
        <div className="faq-list">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div className={`faq-item ${isOpen ? 'is-open' : ''}`} key={item.id}>
                <button
                  className="faq-question"
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                >
                  <span className="faq-question-text">{item.question}</span>
                  <span className="faq-toggle" aria-hidden="true">
                    <span className="faq-toggle-line faq-toggle-line-h" />
                    <span className="faq-toggle-line faq-toggle-line-v" />
                  </span>
                </button>

                <div className="faq-answer-wrap">
                  <div className="faq-answer-inner">
                    <p className="faq-answer">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
