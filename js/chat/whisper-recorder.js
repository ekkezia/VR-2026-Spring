/**
 * Whisper Recorder Utility
 * Shared functionality for audio recording and Whisper API transcription
 * Used across different mrchat implementations
 */

export const WHISPER_CONFIG = {
   // ENDPOINT: "http://192.168.1.89:9000/transcribe",
   ENDPOINT: "http://10.17.118.252/transcribe",
   MIME_TYPES: [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg'
   ],
   BUTTON_RESET_DELAY: 1000 // ms
};

/**
 * Get first supported MIME type for audio recording
 */
export const getSupportedMimeType = () => {
   return WHISPER_CONFIG.MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type)) || '';
};

/**
 * Setup MediaRecorder with standard event handlers
 * @param {MediaStream} stream - Audio stream from microphone
 * @param {Object} callbacks - Event callbacks
 * @param {Function} callbacks.onDataAvailable - Handle audio data chunks
 * @param {Function} callbacks.onError - Handle recording errors
 * @param {Function} callbacks.onStop - Handle when recording stops
 */
export const setupMediaRecorder = (stream, callbacks) => {
   const mimeType = getSupportedMimeType();
   const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
   
   if (callbacks.onDataAvailable) {
      recorder.ondataavailable = callbacks.onDataAvailable;
   }
   
   if (callbacks.onError) {
      recorder.onerror = callbacks.onError;
   }
   
   if (callbacks.onStop) {
      recorder.onstop = callbacks.onStop;
   }
   
   return recorder;
};

/**
 * Send audio to Whisper API for transcription
 * @param {Blob} audioBlob - Audio data blob
 * @param {String} mimeType - MIME type of audio
 * @returns {Promise<String>} Transcribed text
 */
export const transcribeAudio = async (audioBlob, mimeType = 'audio/webm') => {
   const formData = new FormData();
   formData.append('audio', audioBlob, 'speech.webm');
   
   const response = await fetch(WHISPER_CONFIG.ENDPOINT, {
      method: 'POST',
      body: formData
   });
   
   if (!response.ok) {
      throw new Error(`whisper-http-${response.status}`);
   }
   
   const data = await response.json();
   return (data.text || '').trim();
};

/**
 * Check if microphone stream is available
 */
export const isMicrophoneAvailable = () => {
   return !!window.persistentMicStream;
};

/**
 * Get microphone stream (persistent, acquired before VR)
 */
export const getMicrophoneStream = () => {
   return window.persistentMicStream;
};
