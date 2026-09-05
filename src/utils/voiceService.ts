/**
 * Real-time Voice Service for FRIEDE Interview Bot
 * Handles speech recognition and synthesis with instant response
 */

export interface VoiceServiceCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: (transcript: string) => void;
  onSpeechError?: (error: string) => void;
  onListening?: () => void;
  onSpeaking?: () => void;
  onSpeakingComplete?: () => void;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private isListening = false;
  private isSpeaking = false;
  private callbacks: VoiceServiceCallbacks = {};
  private silenceTimer: NodeJS.Timeout | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initRecognition();
  }

  /**
   * Initialize speech recognition
   */
  private initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 3; // Better accuracy with more alternatives

    let finalTranscript = '';
    let interimTranscript = '';

    this.recognition.onstart = () => {
      this.isListening = true;
      finalTranscript = '';
      interimTranscript = '';
      this.callbacks.onListening?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          console.log('🎤 Final transcript chunk:', transcript);
          // Detect end of speech (silence after final result)
          this.detectSilence(finalTranscript.trim());
        } else {
          interimTranscript += transcript;
          console.log('🎤 Interim transcript:', interimTranscript);
        }
      }

      // Notify about speech start
      if (finalTranscript || interimTranscript) {
        this.callbacks.onSpeechStart?.();
      }
    };

    this.recognition.onerror = (event: Event) => {
      const errorEvent = event as SpeechRecognitionErrorEvent;
      console.error('Speech recognition error:', errorEvent.error);
      
      if (errorEvent.error === 'no-speech') {
        // Restart listening
        this.startListening(this.callbacks);
      } else if (errorEvent.error === 'not-allowed') {
        this.callbacks.onSpeechError?.('Microphone access denied. Please allow microphone access.');
      } else {
        this.callbacks.onSpeechError?.(`Speech recognition error: ${errorEvent.error}`);
      }
    };

    this.recognition.onend = () => {
      // Auto-restart if should be listening
      if (this.isListening && !this.isSpeaking) {
        try {
          this.recognition?.start();
        } catch (error) {
          console.error('Error restarting recognition:', error);
        }
      }
    };
  }

  /**
   * Detect silence (end of user speech)
   */
  private detectSilence(transcript: string) {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    // Wait 1 second of silence to consider speech complete (faster response)
    this.silenceTimer = setTimeout(() => {
      if (transcript.trim()) {
        console.log('✅ Speech complete, final transcript:', transcript);
        this.callbacks.onSpeechEnd?.(transcript.trim());
        // Prepare for next input
        this.stopListening();
      }
    }, 1000);
  }

  /**
   * Start listening for user speech
   */
  startListening(callbacks: VoiceServiceCallbacks) {
    this.callbacks = callbacks;

    if (!this.recognition) {
      this.callbacks.onSpeechError?.('Speech recognition not available. Please use a supported browser.');
      return;
    }

    try {
      if (!this.isListening) {
        this.recognition.start();
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'InvalidStateError') {
        console.error('Error starting recognition:', error);
        this.callbacks.onSpeechError?.('Failed to start listening. Please check microphone permissions.');
      }
    }
  }

  /**
   * Stop listening
   */
  stopListening() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.recognition && this.isListening) {
      this.isListening = false;
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  }

  /**
   * Speak text with 1.5x speed (FRIEDE's voice)
   */
  speak(text: string, onComplete?: () => void) {
    // Stop any ongoing speech
    this.stopSpeaking();

    // Stop listening while speaking
    this.stopListening();

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.rate = 1.5; // 1.5x speed as specified
    this.currentUtterance.pitch = 1.0;
    this.currentUtterance.volume = 1.0;
    this.currentUtterance.lang = 'en-US';

    // Select a professional male voice if available
    const voices = this.synthesis.getVoices();
    const preferredVoice = voices.find(
      voice => voice.lang === 'en-US' && voice.name.includes('Male')
    ) || voices.find(voice => voice.lang === 'en-US');

    if (preferredVoice) {
      this.currentUtterance.voice = preferredVoice;
    }

    this.currentUtterance.onstart = () => {
      this.isSpeaking = true;
      this.callbacks.onSpeaking?.();
    };

    this.currentUtterance.onend = () => {
      this.isSpeaking = false;
      this.callbacks.onSpeakingComplete?.();
      onComplete?.();
      
      // Resume listening after speaking
      setTimeout(() => {
        if (this.isListening) {
          this.startListening(this.callbacks);
        }
      }, 500);
    };

    this.currentUtterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.isSpeaking = false;
      onComplete?.();
    };

    this.synthesis.speak(this.currentUtterance);
  }

  /**
   * Stop speaking immediately
   */
  stopSpeaking() {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  /**
   * Check if currently speaking
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopListening();
    this.stopSpeaking();
    
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
  }

  /**
   * Check if browser supports speech recognition
   */
  static isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Request microphone permission
   */
  static async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }
}

export const voiceService = new VoiceService();
export { VoiceService };
