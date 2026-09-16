import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Scene from '../three/LazyScene';
import Background from '../components/Background';
import HeroGradientBackground from '../components/HeroGradientBackground';
import SliderScreen from '../components/SliderScreen';
import FlavorCard from '../components/FlavorCard';
import Footer from '../components/Footer';
import { FLAVORS, DEFAULT_FLAVOR_INDEX } from '../data/flavors';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

// /flavors — the homepage's own flavor gallery, on a page of its own, with the
// flavor cards under it.
//
// Both halves are the existing components, not copies: the same Scene/CanRig
// canvas and the same SliderScreen UI the homepage's first screen runs on, and
// the same FlavorCard the grid already used. What this page leaves out is the
// homepage's scroll machinery around them — there is no pinned intro here, no
// hero to flip away from and no slider/detail sub-navigation, so the gallery is
// simply put straight into its finished state on mount (setEntranceProgress(1),
// the value the homepage's own entrance scrubs toward) and stays there, driven
// only by the arrows, drag and taps SliderScreen already provides.
export default function FlavorsPage() {
  const sceneRef = useRef(null);
  const pinRef = useRef(null);
  const [activeFlavor, setActiveFlavor] = useState(DEFAULT_FLAVOR_INDEX);
  const isMobile = useIsMobile();

  // The gallery arc is the *end* of the homepage's hero->gallery entrance, and
  // nothing here scrubs that, so it has to be played out once on mount.
  //
  // Two things need driving, exactly as HomePage's own applyEntrance does them:
  // the cans, through CanRig's setEntranceProgress, and the DOM, through the
  // --h2g custom property (the gallery UI layer's opacity is derived from it —
  // see index.css). Setting progress straight to 1 on the first frame does not
  // work: CanRig runs a mount-triggered cluster flight first and deliberately
  // leaves the three hero-linked cans alone until it finishes, so an entrance
  // applied before then is ignored and they stay in the hero pose (confirmed —
  // the page rendered the cluster, not the arc). Waiting that flight out and
  // then tweening through gives the page the same hero-to-gallery reveal the
  // homepage has, which is also a better arrival than snapping to the arc.
  useEffect(() => {
    const pin = pinRef.current;
    const apply = (t) => {
      pin?.style.setProperty('--h2g', String(t));
      pin?.classList.toggle('is-entrance-done', t >= 1);
      sceneRef.current?.setEntranceProgress(t);
    };
    apply(0);
    const state = { t: 0 };
    const tween = gsap.to(state, {
      t: 1,
      duration: 0.9,
      // CanRig's own FLIGHT_DURATION is 1.5s; this starts just after it.
      delay: 1.65,
      ease: 'power2.inOut',
      onUpdate: () => apply(state.t),
      onComplete: () => apply(1),
    });
    return () => tween.kill();
  }, []);

  const handlePickFlavor = useCallback(
    (i) => setActiveFlavor((prev) => (i === prev ? prev : i)),
    []
  );
  const handleSettle = useCallback((i) => setActiveFlavor(i), []);

  return (
    <div className="page flavors-page-root">
      <section className="flavors-gallery">
        <div className="intro-pin" ref={pinRef}>
          <HeroGradientBackground />
          <div className="app-root">
            <Background color={FLAVORS[activeFlavor].color} />
            <div className="center-glow is-visible" aria-hidden="true" />
            <Scene
              ref={sceneRef}
              screen="slider"
              activeFlavor={activeFlavor}
              isMobile={isMobile}
              armed
              onSettle={handleSettle}
            />
            <div className="ui-layer">
              <SliderScreen
                sceneRef={sceneRef}
                activeFlavor={activeFlavor}
                onPickFlavor={handlePickFlavor}
                onEnter={() => {}}
                visible
              />
            </div>
          </div>
        </div>
      </section>

      <section className="flavors-page">
        <div className="site-container">
          <div className="flavors-grid">
            {FLAVORS.map((flavor) => (
              <FlavorCard flavor={flavor} key={flavor.id} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
