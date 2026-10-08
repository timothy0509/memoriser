import { store } from './store.ts';

function zhVoices(): SpeechSynthesisVoice[] {
  try {
    return speechSynthesis
      .getVoices()
      .filter((v) => v.lang && v.lang.toLowerCase().startsWith('zh'));
  } catch {
    return [];
  }
}

export function speak(text: string): void {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const vs = zhVoices();
    const pick =
      vs.find((v) => v.voiceURI === store.s.settings.voiceURI) ||
      vs.find((v) => v.lang === 'zh-HK') ||
      vs[0];
    if (pick) {
      u.voice = pick;
      u.lang = pick.lang;
    } else {
      u.lang = 'zh-HK';
    }
    u.rate = store.s.settings.rate;
    speechSynthesis.speak(u);
  } catch {
    /* no tts */
  }
}

export function stopSpeech(): void {
  try {
    speechSynthesis.cancel();
  } catch {
    /* no tts */
  }
}

export function listVoices(): SpeechSynthesisVoice[] {
  return zhVoices();
}
