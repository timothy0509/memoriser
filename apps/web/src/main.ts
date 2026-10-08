import './styles.css';
import { store, uiBridge } from './store.ts';
import {
  stopStudy,
  toast,
  viewBridge,
  viewErrors,
  viewHome,
  viewLib,
  viewReview,
  viewSettings,
  viewStudy,
} from './views.ts';
import { stopSpeech } from './tts.ts';
import { viewPaper } from './paper.ts';

uiBridge.toast = toast;

function setNav(route: string): void {
  document.querySelectorAll('.nav a').forEach((a) => {
    a.classList.toggle('active', (a as HTMLElement).dataset.nav === route);
  });
}

function render(): void {
  stopStudy();
  stopSpeech();
  document.documentElement.style.setProperty(
    '--fs',
    store.s.settings.fontSize + 'px'
  );
  const h = location.hash || '#/';
  const app = document.getElementById('app')!;
  const pm = h.match(/^#\/t\/([^/?]+)\/paper$/);
  if (pm) {
    setNav('lib');
    viewPaper(app, decodeURIComponent(pm[1]));
  } else {
    const m = h.match(/^#\/t\/([^?]+)(?:\?(.*))?$/);
    if (m) {
      const q = Object.fromEntries(new URLSearchParams(m[2] || ''));
      setNav('lib');
      viewStudy(app, {
        tid: decodeURIComponent(m[1]),
        chunk: Math.max(0, +q.chunk || 0),
        stage: q.stage || 'read',
      });
    } else if (h.startsWith('#/lib')) {
      setNav('lib');
      viewLib(app);
    } else if (h.startsWith('#/review')) {
      setNav('home');
      viewReview(app);
    } else if (h.startsWith('#/errors')) {
      setNav('errors');
      viewErrors(app);
    } else if (h.startsWith('#/settings')) {
      setNav('settings');
      viewSettings(app);
    } else {
      setNav('home');
      viewHome(app);
    }
  }
  window.scrollTo(0, 0);
}

store.load();
store.persist();
viewBridge.rerender = render;
window.addEventListener('hashchange', render);
render();
