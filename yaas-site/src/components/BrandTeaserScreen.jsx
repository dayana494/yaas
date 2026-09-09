import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BRAND_TEASER } from '../data/homepageCopy';

gsap.registerPlugin(ScrollTrigger);

// Screen 5 — Brand Teaser. Figma node 173:2 (frame 48) is the layout source
// of truth here: a 1200px-wide reference frame, white background, black
// heading line 1 + pink line 2, two black body paragraphs, a white/black-
// outline CTA, and two rotated photos pinned to the grid's left and right
// edges. No pin, no horizontal scroll — just the same plain fade-in-once
// every other simple (non-pinned) section on this page uses.
export default function BrandTeaserScreen() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(sectionRef.current, { opacity: 0 });
      gsap.to(sectionRef.current, {
        opacity: 1,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 85%', once: true },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="brand-teaser" id="about" ref={sectionRef}>
      <div className="brand-teaser-grid">
        <h2 className="brand-teaser-heading-line brand-teaser-heading-line-1">{BRAND_TEASER.h2Lines[0]}</h2>
        <h2 className="brand-teaser-heading-line brand-teaser-heading-line-2">{BRAND_TEASER.h2Lines[1]}</h2>

        {BRAND_TEASER.copyParagraphs.map((paragraph, i) => (
          <p className={`brand-teaser-text brand-teaser-text-${i + 1}`} key={paragraph.slice(0, 12)}>
            {paragraph}
          </p>
        ))}

        <a className="brand-teaser-cta" href={BRAND_TEASER.ctaHref}>
          {BRAND_TEASER.cta}
        </a>

        <div className="brand-teaser-photo brand-teaser-photo-primary">
          <img src="/images/brand-teaser-fan.png" alt="A hand fanning out YAAS Blueberry, Orange, and Strawberry cans" />
        </div>
        <div className="brand-teaser-photo brand-teaser-photo-secondary">
          <img src="/images/brand-teaser-drinking.png" alt="Someone drinking a YAAS Blueberry, shot from directly above" />
        </div>
      </div>
    </section>
  );
}
