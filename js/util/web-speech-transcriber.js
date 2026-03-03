/**
 * Web Speech API wrapper for free speech-to-text transcription
 * No API keys required - works entirely in the browser
 */

export class WebSpeechTranscriber {
    constructor() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.error('Web Speech API not supported in this browser');
            this.isSupported = false;
            return;
        }
        
        this.isSupported = true;
        this.recognition = new SpeechRecognition();
        this.isListening = false;
        this.transcript = '';
        this.isFinal = false;
        this.errorCallback = null;
        
        // Configure recognition
        this.recognition.continuous = true;  // Keep listening for multiple utterances
        this.recognition.interimResults = true;  // Show interim results
        this.recognition.language = 'en-US';
        
        // Set up event handlers
        this.recognition.onstart = () => {
            this.isListening = true;
            this.transcript = '';
            console.log('%c🎙️ Speech recognition started', 'color: blue; font-weight: bold;');
            console.log('Browser microphone permission should be active');
            
            // Add timeout to catch if no speech is detected
            setTimeout(() => {
                if (!this.isFinal && this.isListening) {
                    console.warn('%c⏱️ Timeout: No speech detected after 5 seconds', 'color: orange; font-weight: bold;');
                }
            }, 5000);
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            console.log('%c⏹️ Speech recognition ended', 'color: orange; font-weight: bold;');
        };
        
        this.recognition.onerror = (event) => {
            console.error('%c❌ Speech recognition error:', 'color: red; font-weight: bold;', event.error);
            if (event.error === 'no-speech') {
                console.warn('No speech was detected. Please try again.');
            } else if (event.error === 'network') {
                console.error('Network error. Check your internet connection.');
            } else if (event.error === 'aborted') {
                console.log('Recognition was aborted.');
            }

            if (this.errorCallback) {
                this.errorCallback(event);
            }
        };
    }
    
    /**
     * Start listening for speech and return transcription via callback
     * @param {Function} callback - Called with transcribed text when done
     * @param {Function} errorCallback - Called with error event when recognition fails
     */
    startListening(callback, errorCallback) {
        if (!this.isSupported) {
            console.error('Web Speech API not supported');
            if (errorCallback) {
                errorCallback({ error: 'not-supported', message: 'Web Speech API not supported' });
            }
            return;
        }
        
        if (this.isListening) {
            console.warn('Already listening');
            return;
        }
        
        this.transcript = '';
        this.isFinal = false;
        this.errorCallback = errorCallback || null;
        
        console.log('%c🎤 LISTENING... Speak now!', 'color: blue; font-weight: bold; font-size: 14px;');
        
        this.recognition.onresult = (event) => {
            console.log('%c📊 onresult event fired!', 'color: cyan; font-weight: bold;');
            console.log('Event results length:', event.results.length);
            console.log('Result index:', event.resultIndex);
            
            this.transcript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;
                const confidence = (result[0].confidence * 100).toFixed(2);
                const isFinal = result.isFinal;
                
                console.log(`Result[${i}]:`, { transcript, confidence, isFinal });
                
                this.transcript += transcript;
                
                // Log interim and final results
                console.log(`[${isFinal ? 'FINAL' : 'INTERIM'}] "${transcript}" (${confidence}% confidence)`);
                
                if (isFinal) {
                    this.isFinal = true;
                    console.log('%c🎯 isFinal is NOW TRUE', 'color: green; font-weight: bold;');
                }
            }
            
            console.log('Current transcript so far:', this.transcript);
            console.log('isFinal flag:', this.isFinal);
            
            if (this.isFinal) {
                console.log('%c✓ SPEECH RECOGNIZED:', 'color: green; font-weight: bold; font-size: 14px;', this.transcript);
                if (callback) {
                    console.log('%c⚡ Calling callback with:', 'color: yellow; font-weight: bold;', this.transcript);
                    callback(this.transcript);
                } else {
                    console.error('%c❌ NO CALLBACK DEFINED!', 'color: red; font-weight: bold;');
                }
            }
        };
        
        this.recognition.start();
    }
    
    /**
     * Stop listening
     */
    stopListening() {
        if (this.isListening) {
            console.log('%c🛑 STOPPED LISTENING', 'color: red; font-weight: bold; font-size: 14px;');
            this.recognition.stop();
        }
    }
    
    /**
     * Get audio level (for debugging audio capture)
     */
    async checkAudioInput() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            console.log('%c🔊 Checking audio input levels...', 'color: yellow; font-weight: bold;');
            
            const checkInterval = setInterval(() => {
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                console.log(`Audio level: ${average.toFixed(2)}`);
            }, 500);
            
            setTimeout(() => {
                clearInterval(checkInterval);
                stream.getTracks().forEach(track => track.stop());
                audioContext.close();
                console.log('%c✓ Audio check complete', 'color: green;');
            }, 3000);
            
        } catch (error) {
            console.error('%c❌ Could not access audio:', 'color: red;', error);
        }
    }
}

// Create singleton instance
export const transcriber = new WebSpeechTranscriber();

// Test microphone access on demand
export async function testMicrophoneAccess() {
    try {
        console.log('%c🎤 Testing microphone access...', 'color: blue; font-weight: bold;');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('%c✓ Microphone access GRANTED', 'color: green; font-weight: bold;');
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        console.error('%c❌ Microphone access DENIED:', 'color: red; font-weight: bold;', error.message);
        return false;
    }
}

// Add test function to window
window.testMicAccess = testMicrophoneAccess;
