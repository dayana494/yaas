// Which reveal the page's block headings use. Both implementations are live
// code; this picks one for all of them at once (see components/SectionHeading).
//
//   'scroll'           -> ScrollAssembleText. Characters start spread out and
//                         rotated and converge on their places as the heading
//                         scrolls in — scrubbed, so it runs backwards when you
//                         scroll back up.
//   'drop'   (current) -> DropText. The earlier one-shot reveal: pieces drop in
//                         from above, staggered, once per heading.
//
// Flip this one string to switch back; nothing else needs touching.
export const HEADING_ANIMATION = 'drop';
