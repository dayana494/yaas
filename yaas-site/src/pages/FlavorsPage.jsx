import FlavorCard from '../components/FlavorCard';
import Footer from '../components/Footer';
import { FLAVORS } from '../data/flavors';
import { FLAVOR_GALLERY } from '../data/homepageCopy';

// /flavors — the flavor gallery as a standalone page: starts straight into
// the card grid, no hero, per spec. Same FlavorCard used here as the only
// place on the site that renders flavor cards.
export default function FlavorsPage() {
  return (
    <div className="page">
      <section className="flavors-page">
        <div className="site-container">
          <h1 className="flavors-page-heading">{FLAVOR_GALLERY.h2}</h1>
          <p className="flavors-page-subhead">{FLAVOR_GALLERY.subhead}</p>
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
