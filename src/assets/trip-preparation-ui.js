(function () {
  'use strict';
  const byId = id => document.getElementById(id), model = window.DLTripPreparation;
  if (!model || !byId('trip-review-summary')) return;
  const storage = { getItem: key => sessionStorage.getItem(key), setItem: (key, value) => sessionStorage.setItem(key, value), removeItem: key => sessionStorage.removeItem(key) };
  const read = () => ({ origin: byId('origin').value, destination: byId('destination').value });
  const saved = model.load(storage);
  byId('origin').value = saved.origin; byId('destination').value = saved.destination;
  // A text-only preparation review does not depend on map tiles loading.
  byId('calculate-route').disabled = false;
  function retain() {
    const ok = model.save(storage, read());
    byId('trip-draft-status').textContent = ok ? 'Trip text stays in this tab through reloads. It is not sent to a routing service.' : 'This browser cannot keep the trip through a reload. Keep a separate copy.';
    byId('trip-review-summary').textContent = 'Trip changed. Review the updated details. No route has been calculated.';
  }
  function review(event) {
    event?.preventDefault(); event?.stopImmediatePropagation();
    if (!window.DLTruckFirst?.isConfirmed()) return;
    retain();
    const result = model.review(read());
    byId('trip-review-summary').textContent = result.issues.length ? result.issues.join(' ') : `${result.trip.origin} → ${result.trip.destination}. Places entered; addresses and truck entrances have not been verified.`;
    byId('route-status').textContent = 'We cannot calculate this trip yet: the truck-routing service is not connected. Changing your load details will not fix this service blocker.';
    byId('route-evidence').open = true;
    byId('trip-review-summary').focus();
  }
  byId('calculate-route').addEventListener('click', review, true);
  for (const id of ['origin', 'destination']) {
    byId(id).addEventListener('input', retain);
    byId(id).addEventListener('keydown', event => { if (event.key === 'Enter') review(event); }, true);
  }
  byId('swap-route').addEventListener('click', retain);
  byId('clear-trip-draft').addEventListener('click', () => {
    byId('origin').value = ''; byId('destination').value = '';
    const removed = model.clear(storage);
    byId('trip-draft-status').textContent = removed ? 'Trip text cleared from this tab.' : 'Fields cleared. Browser storage could not be cleared.';
    byId('trip-review-summary').textContent = 'Enter your places to review the trip details.';
    byId('origin').focus();
  });
  // Store only place text, never dimensions inferred from a preset or device coordinates.
  for (const link of document.querySelectorAll('[data-permit-handoff]')) link.addEventListener('click', event => {
    if (!model.save(storage, read())) {
      event.preventDefault();
      byId('trip-draft-status').textContent = 'Trip handoff could not be saved. Open the permit workspace from the top banner and enter the places there.';
    }
  });
  const scope = () => { byId('permit-scope-help').hidden = !byId('oversize').checked && !byId('hazmat').checked; };
  byId('oversize').addEventListener('change', scope); byId('hazmat').addEventListener('change', scope); scope();
})();
