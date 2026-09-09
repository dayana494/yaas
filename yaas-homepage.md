# YAAS — Homepage Copy (English / US)

Source: homepage section ("Главная страница") from the current RU site-architecture doc (`YAAS — структура и тексты сайта (версия 2, текущая)`), translated into American English with a modern, slang-leaning voice — same brand energy as the Russian version (chill, confident, "YAAS" as a laid-back hype word), just localized for a US audience instead of translated word-for-word.

**Brand voice, quick reference:** second person ("you"), short punchy lines, casual American slang used like a seasoning not a sauce (hits different, locked in, no cap energy — max 1–2 slang beats per screen), no "cures your fatigue/burnout" framing — this is about drive and self-expression, not fixing a problem. Facts (sugar, ingredients, calories) land light and confident, never clinical.

Structure mirrors the original doc 1:1 — 7 screens, same field labels (H1/H2, Subhead, CTA, Badges, Dev note) — so it should be easy to map straight into components/copy constants.

---

## Screen 1 — Hero

*Dev note: logo and tagline fade in while 5 cans fly/assemble into frame in the background (reuse the existing 3D scene as the starting state).*

**H1:** YAAS. That feeling when everything just hits different.

**Subhead:** Zero-sugar energy for people who move at their own speed. Flavor maxed out, sugar at zero.

**Badges:** 0g sugar · 5 cal · 11.2 FL OZ · 5 flavors

**CTA:** See the Flavors →

---

## Screen 2 — About the Drink (scroll slider, youth photo/video)

*Dev note: big headline builds line-by-line on scroll (fragments below = reveal order), then a photo/video row with short captions per scenario. Each scenario is tied to a flavor (see table) — the card can link straight to that flavor's page.*

**Headline, revealed line by line:**
1. This isn't about
2. hyping you up.
3. It's about
4. staying locked in
5. to your own thing.

**Small line under the headline:** You don't drink YAAS on a schedule — you drink it when you need to show up 100%.

**Scenario cards (photo/video + caption + flavor tag):**

| # | Scenario | Caption | Flavor |
|---|---|---|---|
| 1 | Lecture/class that won't end | When the professor's on hour three and you're somehow still with it | Apple → `/catalog/apple` |
| 2 | Workout, gym session | When it's not your last set and you already thought you were done | Orange → `/catalog/orange` |
| 3 | Hanging with the squad till sunrise | When the night's just getting started and your battery isn't | Strawberry → `/catalog/strawberry` |
| 4 | Road trip / festival run | When the drive's long and the vibe's gotta stay maxed | Lemon → `/catalog/lemon` |
| 5 | Late-night gaming session | When one more round decides everything | Blueberry → `/catalog/blueberry` |

---

## Screen 3 — Flavor Gallery

*Dev note: this is where the existing 3D flavor gallery gets embedded (component from the sensational-toffee-cbd839.netlify.app build / `SliderScreen.jsx`). Everything below is the text wrapper + can captions.*

**H2:** 5 Flavors. One Energy.

**Subhead:** Spin the cans, find your match — everybody's chill, just in their own way.

**Can captions (one line each):**
- Strawberry — Never rattled
- Apple — Not even up for debate
- Blueberry — Strength, no noise
- Orange — Shines without shouting
- Lemon — Fast, never frantic

**CTA below gallery:** See All the Flavors → (`/catalog`)

---

## Screen 4 — Advantages

**H2:** Why YAAS Beats Whatever's Sitting in Your Fridge Right Now

| Advantage | Copy |
|---|---|
| Zero Sugar | Sweet from the flavor, not from sugar. None in here — zero. |
| Real Ingredients | Stuff you can actually pronounce. No sketchy lab-chem vibes. |
| Energy, No Crash | Keeps you steady — no hard crash an hour later. |
| Only 5 Calories | Drink as many as you want — no need to count anything. |
| Grab-and-Go Size | Compact can that fits in any bag, any day. |
| 5 Flavors, Every Mood | From bold to unbothered — pick your vibe. |

---

## Screen 5 — Brand Teaser (one screen, link to full About page)

**H2:** Not For Everyone. For Our People.

**Copy:** YAAS was made by people who were done with energy drinks that hit you with a sugar bomb and taste like a chemistry set. We're about clean ingredients, real flavor, and energy that actually works for you, not against you. No posturing, no cutting corners — just a charge you can trust.

**CTA:** Read Our Story → (`/about`)

---

## Screen 6 — FAQ

**H2:** Questions You're Gonna Ask Anyway

1. **Is this an energy drink or a soda?**
It's an energy drink. Just without the sugar and without the junk — bold flavor, clean ingredients.

2. **Is it really zero sugar?**
For real. 0g sugar, 5 calories a can — the sweetness comes from the flavor, not syrup.

3. **How much caffeine's in it?**
Enough to give you a real boost — the exact amount's right there on the can, no surprises.

4. **Can I drink it every day?**
You can, but like with any energy drink — know your limit and don't overdo it.

5. **What's the age limit?**
18+, no exceptions — same as any energy drink.

6. **What's actually in YAAS?**
Natural flavors, caffeine, B vitamins, and zero sugar — the full ingredient list is right on the can, no fine print.

7. **Where can I buy it?**
The list of stores and retailers is dropping here soon — follow us on social so you don't miss it.

8. **How should I store it?**
Somewhere cool, out of direct sunlight. Once it's open, keep it in the fridge and finish it within 24 hours.

---

## Screen 7 — Contact

**H2:** Hit Us Up

**Copy:** Questions, ideas, partnership pitches — hit us up, we'll figure it out.

**Block:** email · Telegram · VK · CTA "See All Contact Info →" (`/contacts`)

*Dev note: Telegram/VK are carried over from the RU version's contact channels — swap for whatever socials the US-facing brand actually runs (Instagram/TikTok/X are the more typical pick for a US youth audience) before shipping.*

---

## Notes for implementation

- Units were localized for a US audience: 330 ml → 11.2 FL OZ, "5 ккал" → "5 cal" (matches what's already printed on the can label — Calories 5, Serving size 330 ml / 11.2 FL OZ — so this isn't a new number, just which unit leads).
- Flavor names/slugs are unchanged from the existing `flavors.js` (`strawberry`, `apple`, `blueberry`, `orange`, `lemon`) — this file's flavor tags map straight to those ids, no renaming needed.
- This covers homepage copy only (screens 1–7). The RU doc also has full copy for `/about`, `/contacts`, `/catalog`, and the 5 flavor pages — say the word if you want those translated into this same format too.
