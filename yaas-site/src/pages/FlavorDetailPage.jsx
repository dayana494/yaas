import { Link, useParams } from 'react-router-dom';
import Footer from '../components/Footer';
import { FLAVORS } from '../data/flavors';

// /flavors/:slug — placeholder only, per spec: the routes need to exist and
// resolve to something real (not a dead link) but the actual per-flavor
// page design is a later step. Falls back to a generic "flavor not found"
// state for an unknown slug instead of a blank/broken route.
export default function FlavorDetailPage() {
  const { slug } = useParams();
  const flavor = FLAVORS.find((f) => f.id === slug);

  return (
    <div className="page">
      <section className="flavor-detail-placeholder">
        <div className="site-container">
          {flavor ? (
            <>
              <span className="flavor-detail-eyebrow" style={{ color: flavor.color }}>
                {flavor.title}
              </span>
              <h1 className="flavor-detail-heading">Coming Soon</h1>
              <p className="flavor-detail-copy">The full {flavor.title} page is on its way — for now, here&rsquo;s the short version.</p>
              <p className="flavor-detail-description">{flavor.description}</p>
            </>
          ) : (
            <>
              <h1 className="flavor-detail-heading">Flavor Not Found</h1>
              <p className="flavor-detail-copy">We couldn&rsquo;t find that one — check out the full lineup instead.</p>
            </>
          )}
          <Link className="flavor-detail-back" to="/flavors">
            ← Back to Flavors
          </Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
