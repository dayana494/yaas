import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SCENARIOS } from '../data/scenarios';
import { FLAVORS } from '../data/flavors';
import { SCENARIO_CARDS_TRIGGER_ID } from '../data/layout';
import { mobilePinType, riseUnits, useOverlapEnabled } from '../scroll/riseTransition';

gsap.registerPlugin(ScrollTrigger);

const flavorById = Object.fromEntries(FLAVORS.map((f) => [f.id, f]));

// Earlier build's card-stack transition, restored alongside (not instead
// of) the current clip-path wipe in ScenarioCards.jsx — swap which one
// Screen2 renders to compare; nothing here touches that file.
//
// Cards sit stacked at the exact same rect (card 0 on top, z-index
// descending), each already at its own resting pose. On scroll, the front
// card lifts off and slides up and away at a slight tilt — like flipping
// through a stack of photos — revealing the next one underneath, which
// needed no animation of its own since it was resting there all along.
// Alternates tilt direction card to card (1st/3rd one way, 2nd/4th the
// other) instead of every card leaning the same way.
const FLIP_Y = '-115%';
const FLIP_ROTATE = 7;

export default function ScenarioCardsIsometric() {
  const pinRef = useRef(null);
  const cardRefs = useRef([]);
  cardRefs.current = [];

  const addCardRef = (el) => {
    if (el) cardRefs.current.push(el);
  };

  // The hold at the end of this pin exists only for Screen 3 to climb over it,
  // which happens at desktop widths only — so the timeline is rebuilt when the
  // breakpoint is crossed, to gain or lose its idle tail.
  const overlap = useOverlapEnabled();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = cardRefs.current;
      if (!cards.length) return;
      const N = cards.length;
      const hold = riseUnits();

      cards.forEach((card, i) => {
        gsap.set(card, { xPercent: -50, y: 0, rotate: 0, opacity: 1, zIndex: N - i });
      });

      // One shared pin spanning just the flips (N-1 units) — pinSpacing
      // defaults to true here (unlike App.jsx's intro-wrap), so GSAP inserts
      // its own spacer sized to match and AdvantagesScreen picks up right
      // where this releases, no manual height bookkeeping needed. Used to
      // also hold for a pause + a decoy "Advantages heading" cover sliding
      // up before releasing; that cover never quite synced with the real
      // section arriving (GSAP's pin spacer shifts what "top" resolves to
      // for anything measuring position against this same pinned element,
      // which threw its timing off by a full pin-length), so scrolling
      // past it either showed a blank hold or the real heading appearing
      // twice. Releasing straight into the real AdvantagesScreen instead.
      //
      // `start: 'top top'` here is only a *placeholder* — with .intro-wrap
      // pinned ahead of it on the page, GSAP's own string-formula parser for
      // this trigger resolves against a stale, pre-spacer position (confirmed
      // by direct DOM measurement to be off by close to .intro-wrap's
      // *entire* pin duration). Stranger still, a `start` *function*
      // computing the correct absolute number from a live
      // getBoundingClientRect()/ScrollTrigger.getById() read was ALSO wrong
      // by the same kind of margin, even though the exact same read taken
      // from plain application code (outside any ScrollTrigger callback)
      // always came back correct: GSAP invokes `start` functions *during*
      // its own refresh pass, while other triggers' pins are transiently
      // toggled off/on to remeasure natural flow, so anything read live from
      // inside one of these functions can catch that mid-flight state.
      // Left as the (wrong, but boundedly-so — never past the real value,
      // so the spacer this creates only ever needs to grow, not shrink)
      // string on purpose: App.jsx corrects `.vars.start` to the real, exact
      // number in a one-time pass once every section has mounted and
      // settled, safely *outside* any refresh callback (see its own
      // comment) — a numeric placeholder wildly larger than the page would
      // make pinSpacing:true briefly reserve that much scroll room too.
      const tl = gsap.timeline({
        scrollTrigger: {
          id: SCENARIO_CARDS_TRIGGER_ID,
          trigger: pinRef.current,
          start: 'top top',
          // (N-1) viewports of card flips, plus riseUnits() more during which
          // this stack is simply held still while Screen 3 climbs up over it —
          // the same handover Screen 2 gets from the intro pin above it. The
          // matching idle tail on the timeline below is what keeps the flips
          // themselves at exactly one viewport each despite the longer pin: a
          // scrubbed timeline maps the trigger's whole 0->1 onto its own
          // duration, so adding scroll without adding timeline would stretch
          // every flip instead of appending a hold.
          //
          // Nothing is added here for whatever sits between this pin's spacer
          // and Screen 3 — lengthening the pin grows its spacer by the same
          // amount and pushes that section down with it, so the two never
          // converge. That offset is cancelled on .advantages's own negative
          // margin instead (see advantages.css).
          end: () => `+=${(N - 1 + hold) * window.innerHeight}`,
          scrub: 1,
          pin: true,
          ...mobilePinType(),
          invalidateOnRefresh: true,
        },
      });

      for (let i = 0; i < N - 1; i++) {
        const rotate = i % 2 === 0 ? -FLIP_ROTATE : FLIP_ROTATE;
        tl.to(cards[i], { y: FLIP_Y, rotate, ease: 'power2.inOut', duration: 1 }, i).to(
          cards[i],
          { opacity: 0, duration: 0.35, ease: 'power1.in' },
          i + 0.65
        );
      }

      // The hold. Animates nothing — it exists only to give the timeline the
      // same total duration as the pin's extended length. None below 1024,
      // where nothing climbs over this stack and the pin releases on the last
      // flip.
      if (hold > 0) tl.to({}, { duration: hold }, N - 1);
    }, pinRef);

    return () => {
      // HomePage's correction pass replaces this trigger with one created
      // outside this context, which ctx.revert() would not reach.
      ScrollTrigger.getById(SCENARIO_CARDS_TRIGGER_ID)?.kill(true);
      ctx.revert();
    };
  }, [overlap]);

  return (
    <section className="scenario-cards-iso" ref={pinRef}>
      <div className="scenario-cards-iso-stage">
        {SCENARIOS.map((scenario) => {
          const flavor = flavorById[scenario.flavor];
          const bgStyle = scenario.photo
            ? { backgroundImage: `url(${scenario.photo})` }
            : /* TODO: заменить на финальное фото сценария — сейчас плейсхолдер из фирменных цветов вкуса */
              { background: `linear-gradient(160deg, ${flavor.color} 0%, ${flavor.colorDark} 100%)` };
          return (
            <article className="scenario-card-iso" ref={addCardRef} key={scenario.id}>
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
