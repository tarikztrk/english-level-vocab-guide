import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PronunciationService {
  play(word: { word: string; audioUrl?: string }) {
    if (word.audioUrl) {
      new Audio(word.audioUrl).play().catch((error) => {
        console.error('Could not play audio file', error);
        this.speak(word.word);
      });
      return;
    }

    this.speak(word.word);
  }

  private speak(text: string) {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis is not supported in this browser.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}
