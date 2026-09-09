import { Link } from 'react-router-dom';

// Reusable flavor card — used on /flavors' grid. Same visual language as
// the rest of the site's own cards (.advantage-card: 20px radius, soft
// shadow, Soledago title, Beiruti body) rather than a new one-off look, an
// image panel replacing that card's plain number.
export default function FlavorCard({ flavor }) {
  return (
    <article className="flavor-card" style={{ '--card-color': flavor.color }}>
      <div className="flavor-card-image">
        <img src={flavor.thumbnail} alt={`YAAS ${flavor.title}`} loading="lazy" />
      </div>
      <div className="flavor-card-body">
        <h3 className="flavor-card-title">{flavor.title}</h3>
        <p className="flavor-card-description">{flavor.description}</p>
        <Link className="flavor-card-cta" to={`/flavors/${flavor.id}`}>
          Learn More →
        </Link>
      </div>
    </article>
  );
}
