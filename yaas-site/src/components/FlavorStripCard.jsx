import { Link } from 'react-router-dom';

// The flavor detail page's own gallery card — deliberately NOT FlavorCard,
// which is the plain white image/title/description/"Learn More" card the
// /flavors grid uses. This one is a full-bleed panel in the flavor's own
// brand color with the can cropped by the card's bottom edge, so only its top
// peeks in until you hover.
//
// A <Link>, not the raw <a> the build prompt sketched: this app is already on
// react-router, and a plain anchor would tear the whole SPA down and refetch
// the .glb and every label texture just to move between two flavor pages.
export default function FlavorStripCard({ flavor, isActive }) {
  return (
    <Link
      className={`flavor-gallery-card${isActive ? ' is-active' : ''}`}
      to={`/flavors/${flavor.id}`}
      style={{ '--card-color': flavor.color }}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Same brand line-art overlay the flavor backgrounds carry, reused as
          a plain child rather than a second implementation of it. */}
      <div className="background-texture" aria-hidden="true" />
      <h3 className="flavor-gallery-card-title">{flavor.title}</h3>
      <img src={flavor.thumbnail} alt="" className="flavor-gallery-can" loading="lazy" />
    </Link>
  );
}
