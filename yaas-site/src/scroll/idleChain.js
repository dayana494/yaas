// Runs a fixed list of steps one per task, off the critical path, with a way to
// finish the rest of them right now if something is about to need the result.
//
// HomePage's pin-start correction is the reason this exists. It is one
// sequential pass — measure a section's real resting slot, rebuild its pin
// there, let that pin's spacer settle, then measure the next section against
// the new layout — and the chain cannot be reordered or batched, because each
// measurement depends on the previous rebuild (see correctPinStarts's own
// comment). Run as one function at mount it was a single ~500ms task on a
// throttled phone, which is ~450ms of Total Blocking Time on its own: TBT
// counts only the part of a task past 50ms, so the same work spread over six
// tasks costs a fraction of the same total.
//
// Nothing here changes what the steps do or the order they run in, only when.
//
// One step per slot rather than "as many as fit this idle period". Filling a
// deadline is the usual shape for an idle queue, but these steps rebuild pins
// and each is expensive enough to be worth its own task — packing two into one
// slot is exactly the long task this is here to avoid.

const IDLE_TIMEOUT = 300;

const requestIdle =
  typeof window !== 'undefined' && window.requestIdleCallback
    ? window.requestIdleCallback.bind(window)
    : (cb) => setTimeout(cb, 1);
const cancelIdle =
  typeof window !== 'undefined' && window.cancelIdleCallback
    ? window.cancelIdleCallback.bind(window)
    : clearTimeout;

export function runStepsWhenIdle(steps) {
  let next = 0;
  let handle = 0;
  let scheduler = requestIdle;
  let canceller = cancelIdle;
  let cancelled = false;

  const schedule = () => {
    // `timeout` so a page that never goes idle still finishes the chain. The
    // option is only understood by requestIdleCallback; the setTimeout
    // fallbacks below ignore the extra argument harmlessly.
    handle = scheduler(pump, { timeout: IDLE_TIMEOUT });
  };

  const pump = () => {
    handle = 0;
    if (cancelled) return;
    steps[next++]();
    if (next < steps.length) schedule();
  };

  schedule();

  return {
    get done() {
      return cancelled || next >= steps.length;
    },
    // Stop waiting for idle time — keep one step per task, but take the next
    // task the event loop offers. Used once the reader has started scrolling:
    // the work is now on its way to mattering, but it still must not land as
    // one long task under their finger.
    hurry() {
      if (cancelled || next >= steps.length || scheduler !== requestIdle) return;
      scheduler = (cb) => setTimeout(cb, 0);
      canceller = clearTimeout;
      if (handle) cancelIdle(handle);
      handle = 0;
      schedule();
    },
    // Run everything that is left, now, on this task. For the moment a section
    // whose pin has not been corrected yet is about to reach the viewport:
    // a long task there is bad, an unset pin is worse.
    flush() {
      if (cancelled) return;
      if (handle) canceller(handle);
      handle = 0;
      while (next < steps.length) steps[next++]();
    },
    cancel() {
      cancelled = true;
      if (handle) canceller(handle);
      handle = 0;
    },
  };
}
