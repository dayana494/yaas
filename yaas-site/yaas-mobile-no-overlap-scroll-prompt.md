# YAAS — ниже 1024px: без наложений блоков, обычный скролл

## Задача
На планшетах и телефонах (`max-width: 1023px`) убрать все переходы, где следующий блок наезжает на предыдущий (rise) или предыдущий уходит поверх следующего (fall). Нужен обычный поток документа: блок закончился, сразу начинается следующий. Причина: на мобильных при скролле вверх и вниз всё лагает.

За образец берём то, что уже сделано для перехода «Контакты → Футер»:
- `components/Footer.jsx`: при `matchMedia('(max-width: 1023px)')` ScrollTrigger не создаётся вообще (`return undefined`);
- `styles/footer.css`: `.site-footer.is-reveal { margin-top: 0; }` внутри `@media (max-width: 1023px)`, скругления, привязанные к переходу, обнулены.

Тот же подход применяем ко всем остальным стыкам.

## Стыки, которые надо развязать (ниже 1024)
1. **Intro/галерея → Screen 2** (`styles/screen2.css`, строки ~20 и ~347 `margin-top: -100dvh`; `pages/HomePage.jsx` ~433–455: пин интро продлевается на `SCREEN2_GAP_PX + SCREEN2_RISE_UNITS`).
2. **Карточки сценариев → Advantages** (`styles/advantages.css` ~268: `margin-top: calc(-100dvh - var(--advantages-lead-gap))`, `z-index: 3`; `components/ScenarioCardsIsometric.jsx` ~83–115: к пину добавляется `RISE_UNITS` и холостой `tl.to({}, { duration: RISE_UNITS })`).
3. **Advantages → About Brand / brand-teaser** (`styles/brand-teaser.css` ~50 `margin-top: -100dvh`; fall driver `createFallDriver(['.advantages', '.about-brand'])` и `createViewportBackdropDriver('.about-brand', '.about-brand-bg')` в `HomePage.jsx` ~480–488).
4. **Страница вкуса: FlavorStorySection → галерея** (`styles/flavor-detail.css` ~178 `margin-top: -100dvh`; `components/FlavorStorySection.jsx` ~227–322: `finaleCentre + RISE_UNITS` и холостой хвост; `pages/FlavorDetailPage.jsx` ~64–69 `createRiseDriver(['.flavor-gallery'])`).
5. Проверь поиском всё остальное: `grep -rn "RISE_UNITS\|margin-top: -100dvh\|createRiseDriver\|createFallDriver\|--rise-radius\|--fall-radius" src`. Каждое совпадение: либо развязать ниже 1024, либо коротко обосновать в отчёте, почему не нужно.

## Что сделать на каждом стыке
**CSS** (в `@media (max-width: 1023px)` того же файла, рядом с уже существующими мобильными правилами):
- отрицательный `margin-top` → `0`;
- `border-*-radius: var(--rise-radius…)` / `var(--fall-radius…)` → `0`;
- `z-index`, который нужен был только для наложения, → `auto` (если он не нужен для слоёв внутри блока);
- фоновые слои, которые backdrop driver держал «прибитыми» к вьюпорту (`.about-brand-bg`, фон Advantages), → `position: absolute; inset: 0; transform: none` — просто фон своего блока.

**JS**:
- из длины пинов убрать хвосты `RISE_UNITS` / `SCREEN2_GAP_PX` / `SCREEN2_RISE_UNITS` и холостые `tl.to({}, { duration: RISE_UNITS })`. Сделать через одну функцию-хелпер (например, `riseUnits()` в `scroll/riseTransition.js`, которая возвращает `0` ниже 1024), а не копией условия в каждом файле;
- rise/fall/backdrop драйверы ниже 1024 не подключать к `gsap.ticker` и не вешать scroll/resize-листенеры (а не «пусть пишет свойство, которое никто не читает», как сейчас в комментарии в footer.css, — на мобильных нам нужен каждый кадр). Это же относится и к футеру: доведи до конца;
- при повороте экрана или смене брейкпоинта (`matchMedia` change) — `ScrollTrigger.refresh()` и корректное подключение/отключение драйверов, без перезагрузки страницы.

## Что НЕ трогать
- Desktop (≥1024) — пиксель в пиксель как сейчас. Все изменения только внутри `max-width: 1023px` или за условием брейкпоинта.
- Анимации внутри блоков (скролл-анимация галереи в интро, перевороты карточек сценариев, сборка стопки фото в About Brand, DropText в заголовках) остаются. Убираем только наложение одного блока на другой.
- Мобильные композиции из Figma (контакты 374:64, футер 374:97 и т. д.).

## Проверка
1. Сборка без ошибок и предупреждений.
2. DevTools, эмуляция iPhone 14 (390×844) и iPad (820×1180), плюс 1023 и 1024:
   - на каждом стыке нижний край блока N и верхний край блока N+1 совпадают, ничего не перекрывается, нет пустых экранов-«пауз»;
   - `document.querySelectorAll('[style*="--rise"], [style*="--fall"]')` при скролле не обновляется ниже 1024;
   - на 1024+ всё как было (сравни скриншоты стыков до/после).
3. Performance-запись быстрого скролла вниз-вверх по всей главной и одной странице вкуса с 4× CPU throttling: приложи число long tasks и средний FPS до и после.
4. Якоря меню (`scroll/sectionNav.js`) ниже 1024 попадают в начало нужного блока — пины стали короче, цели надо пересчитать.

## Отчёт
Список изменённых файлов, по каждому стыку одна строка: что было, что стало. Цифры из пункта 3. Отдельно — всё, что нашёл поиском в п. 5 и оставил как есть, с причиной.
