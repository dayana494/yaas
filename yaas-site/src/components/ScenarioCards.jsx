import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SCENARIOS } from '../data/scenarios';
import { FLAVORS } from '../data/flavors';

gsap.registerPlugin(ScrollTrigger);

const flavorById = Object.fromEntries(FLAVORS.map((f) => [f.id, f]));

// clip-path wipe, adapted from the matilda-design.tilda.ws "projects-path"
// technique (uc-list-prj-* / uc-prj-last): each card is stacked with a
// rising z-index, and instead of a transform, the incoming card's own
// clip-path sweeps open — a horizontal curtain reveal — over whichever
// card sits beneath it. Their CSS only shows the resting state (a
// full-rect polygon) and the z-index stack; the collapsed start state and
// the scroll-driven tween between the two are this component's part.
// Right-to-left: the two collapsed points sit at the right edge (100%) and
// tween back to the left edge (0%), so the reveal grows from the right.
const HIDDEN_CLIP = 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)';
const REVEALED_CLIP = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';

// Card 1 doesn't wipe in — per the Figma reference (node 98:99) it starts
// as a small circular mask over the same photo (no separate image, no
// movement underneath), dead center of the screen (this section is
// height:100vh and pinned, so "center" is simply 50% 50% of it), and that
// circle only starts growing once scrolling continues *inside* the pin —
// i.e. once it's actually sitting centered on screen, not while it's still
// scrolling into place. It grows until it covers the screen, at which
// point it's indistinguishable from a normal full-bleed card and the
// regular wipe sequence for cards 2+ takes over.
const CIRCLE_START = 'circle(248px at 50% 50%)';
const CIRCLE_END = 'circle(2200px at 50% 50%)';

export default function ScenarioCards() {
  const pinRef = useRef(null);
  const cardRefs = useRef([]);
  cardRefs.current = [];

  const addCardRef = (el) => {
    if (el) cardRefs.current.push(el);
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = cardRefs.current;
      if (!cards.length) return;

      cards.forEach((card, i) => {
        gsap.set(card, { clipPath: i === 0 ? CIRCLE_START : HIDDEN_CLIP, zIndex: i + 1 });
      });

      // One extra scroll-unit at the front for card 1's circle-grow stage,
      // on top of the (N-1) card-to-card wipes.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinRef.current,
          start: 'top top',
          end: () => `+=${cards.length * window.innerHeight}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      tl.fromTo(cards[0], { clipPath: CIRCLE_START }, { clipPath: CIRCLE_END, duration: 1, ease: 'power2.inOut' }, 0);

      for (let i = 0; i < cards.length - 1; i++) {
        tl.fromTo(
          cards[i + 1],
          { clipPath: HIDDEN_CLIP },
          { clipPath: REVEALED_CLIP, duration: 1, ease: 'power2.inOut' },
          i + 1
        );
      }
    }, pinRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="scenario-cards" ref={pinRef}>
      <div className="scenario-cards-stage">
        {SCENARIOS.map((scenario) => {
          const flavor = flavorById[scenario.flavor];
          const bgStyle = scenario.photo
            ? { backgroundImage: `url(${scenario.photo})` }
            : /* TODO: заменить на финальное фото сценария — сейчас плейсхолдер из фирменных цветов вкуса */
              { background: `linear-gradient(160deg, ${flavor.color} 0%, ${flavor.colorDark} 100%)` };
          return (
            <article className="scenario-card" ref={addCardRef} key={scenario.id}>
              <div className="scenario-card-bg" style={bgStyle} />
              <div className="scenario-card-shade" />
              <div className="scenario-card-copy">
                <h3 className="scenario-card-title">{scenario.title}</h3>
                <p className="scenario-card-caption">{scenario.caption}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
