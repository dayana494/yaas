// Central flavor registry — drives 3D textures, UI text and background color.
// title/description are the screen-3 card copy (slider name + detail-card
// bio), given verbatim by the user.
// Order here is also the gallery's left-to-right arc order (see arcLayout's
// wrappedDelta) — blueberry sits left of strawberry and orange sits right,
// matching each can's own side in the hero cluster (heroLayout.js), so the
// hero->gallery entrance flip never has to cross blueberry and orange past
// each other.
import { asset } from './assetUrl';

export const FLAVORS = [
  {
    id: 'lemon',
    title: 'CITRUS LEMON',
    description:
      "Fast reflexes, zero panic — she's already got it figured out while you're still thinking. A sharp, zesty flavor for people who think quick and stay cool doing it.",
    color: '#DFC821',
    colorDark: '#B99A00',
    texture: asset('/textures/labels/lemon.webp'),
    thumbnail: asset('/textures/thumbnails/lemon.png?v=2'),
  },
  {
    id: 'blueberry',
    title: 'BLUEBERRY RUSH',
    description:
      "Quiet strength, zero flexing — she's got nothing to prove. A deep berry flavor for people who move at their own pace and still get where they're going.",
    color: '#0085C6',
    colorDark: '#00517A',
    texture: asset('/textures/labels/blueberry.webp'),
    thumbnail: asset('/textures/thumbnails/blueberry.png?v=2'),
  },
  {
    id: 'strawberry',
    title: 'WILD STRAWBERRY',
    description:
      "The unbothered queen of the scene — she's good no matter what's going on around her. A sweet-tart flavor for people who keep it together even when everything's on fire.",
    color: '#E53A6B',
    colorDark: '#A8194B',
    texture: asset('/textures/labels/strawberry.webp'),
    thumbnail: asset('/textures/thumbnails/strawberry.png?v=2'),
  },
  {
    id: 'orange',
    title: 'SOLAR ORANGE',
    description:
      "Warm, bright confidence — she doesn't need to raise her voice to get noticed. A juicy citrus flavor that keeps the mood maxed out without ever forcing it.",
    color: '#DC6901',
    colorDark: '#B85A0D',
    texture: asset('/textures/labels/orange.webp'),
    thumbnail: asset('/textures/thumbnails/orange.png?v=2'),
  },
  {
    id: 'apple',
    title: 'GREEN APPLE',
    description:
      "So confident there's nothing left to argue about. A crisp, tart flavor for people who stay calm even when the whole day is one long deadline.",
    color: '#82BF24',
    colorDark: '#0E6E45',
    texture: asset('/textures/labels/apple.webp'),
    thumbnail: asset('/textures/thumbnails/apple.png?v=2'),
  },
];

export const FLAVOR_COUNT = FLAVORS.length;
export const DEFAULT_FLAVOR_INDEX = FLAVORS.findIndex((f) => f.id === 'strawberry');
