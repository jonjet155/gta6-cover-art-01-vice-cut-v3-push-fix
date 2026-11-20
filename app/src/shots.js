// VICE CUT v3 Push Fix — screenshot harness. `?shot=cover` shows the cover alone
// (full frame, no editor chrome) for the judge's screenshot; `?shot=editor`
// shows the studio with the samples loaded and the hero panel selected. Both
// set window.__shotReady once the cover is painted.
import './main.js';

const query = new URLSearchParams(location.search);
const shot = query.get('shot');

function hideChrome() {
  const style = document.createElement('style');
  style.textContent = `
    body { background: #160b28 !important; }
    .topbar, .sidebar, .hint, .how { display: none !important; }
    .studio { display: block !important; padding: 0 !important; max-width: none !important; }
    .preview-col { width: 100% !important; }
    #cover { border: 0 !important; border-radius: 0 !important; width: 100vw !important; height: 100vh !important; object-fit: contain; }
  `;
  document.head.appendChild(style);
  document.documentElement.style.margin = '0';
  document.body.style.margin = '0';
}

function waitForReady() {
  const start = Date.now();
  const poll = setInterval(() => {
    const api = window.__vicecut;
    // Ready once every panel's photo is actually loaded — a plain count of 7
    // would also pass after a failed load left a panel empty.
    if (api && api.state && api.state.panels.every((p) => !p.photo || api.images[p.photo])) {
      clearInterval(poll);
      if (shot === 'editor') {
        api.selectPanel(0);
        const caption = document.getElementById('captionInput');
        if (caption) {
          caption.focus();
          caption.setSelectionRange(caption.value.length, caption.value.length);
        }
      }
      window.__shotReady = true;
    } else if (Date.now() - start > 20_000) {
      clearInterval(poll);
      window.__shotReady = true; // never hang the screenshot run
    }
  }, 100);
}

if (shot === 'cover') hideChrome();
waitForReady();
