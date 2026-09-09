import { FLAVORS } from '../data/flavors';

export default function FlavorSwitcher({ activeFlavor, onPickFlavor }) {
  return (
    <div className="flavor-switcher" data-interactive>
      {FLAVORS.map((flavor, i) => (
        <button
          key={flavor.id}
          type="button"
          className={`flavor-thumb ${i === activeFlavor ? 'is-active' : ''}`}
          onClick={() => onPickFlavor(i)}
          aria-label={flavor.title}
        >
          <span className="flavor-thumb-pill" />
          <img src={flavor.thumbnail} alt="" />
        </button>
      ))}
    </div>
  );
}
