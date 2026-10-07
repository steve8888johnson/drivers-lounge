// Recording precise travel history is held until access, retention, and stop/retry
// behavior are verified against the real backend. Existing history remains
// accessible through the separate history/deletion page.
(function () {
  const start = document.querySelector('#start-camera-journal');
  const stop = document.querySelector('#stop-camera-journal');
  const consent = document.querySelector('#camera-journal-consent');
  const status = document.querySelector('#camera-journal-status');
  if (start) start.disabled = true;
  if (stop) stop.hidden = true;
  if (consent) { consent.checked = false; consent.disabled = true; }
  if (status) {
    status.textContent = 'Precise route recording is paused while privacy, deletion and stop/retry behavior are validated.';
    status.setAttribute('role', 'status');
  }
})();
