import DropText from './DropText';
import ScrollAssembleText from './ScrollAssembleText';
import { HEADING_ANIMATION } from '../data/featureFlags';

// One place every block heading on the page goes through, so the reveal they
// all use can be switched from a single flag (HEADING_ANIMATION in
// data/featureFlags.js) instead of editing six components.
//
// Both reveals stay live code. Props are DropText's, since that is what the
// call sites already pass; ScrollAssembleText takes the same three it needs
// and ignores the rest.
export default function SectionHeading({ as = 'h2', className = '', text, ...dropTextProps }) {
  if (HEADING_ANIMATION === 'drop') {
    return <DropText as={as} className={className} text={text} {...dropTextProps} />;
  }
  return <ScrollAssembleText as={as} className={className} text={text} />;
}
