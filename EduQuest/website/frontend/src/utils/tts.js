// Shared browser speech for WordQuest. Runs only after a user action.
export function stopSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function speak(text) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      reject(new Error('Browser speech is not available.'));
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(new Error(event.error || 'Speech playback failed.'));
    window.speechSynthesis.speak(utterance);
  });
}
