(function (root) {
  'use strict';
  const key = 'dl-trip-preparation-v1';
  const text = value => typeof value === 'string' ? value.trim().slice(0, 300) : '';
  function normalize(value) {
    return { origin: text(value?.origin), destination: text(value?.destination) };
  }
  function review(value) {
    const trip = normalize(value), issues = [];
    if (!trip.origin) issues.push('Enter a starting point.');
    if (!trip.destination) issues.push('Enter a destination.');
    if (trip.origin && trip.origin.toLowerCase() === trip.destination.toLowerCase()) issues.push('Starting point and destination are the same. Check both places.');
    return { trip, issues, guidanceAllowed: false, service: 'NOT_CONNECTED' };
  }
  function save(storage, value) {
    try {
      const trip = normalize(value);
      // A device fix is short lived. Never restore the label as a fresh position.
      if (trip.origin === 'Current location') trip.origin = '';
      if (trip.destination === 'Current location') trip.destination = '';
      storage.setItem(key, JSON.stringify(trip)); return true;
    } catch { return false; }
  }
  function load(storage) {
    try {
      const raw = storage.getItem(key);
      if (!raw || raw.length > 4000) return normalize();
      return normalize(JSON.parse(raw));
    } catch { return normalize(); }
  }
  function clear(storage) { try { storage.removeItem(key); return true; } catch { return false; } }
  root.DLTripPreparation = Object.freeze({ key, normalize, review, save, load, clear });
})(typeof window === 'undefined' ? globalThis : window);
