import * as cg from "../render/core/cg.js";
import { 
   WHISPER_CONFIG, 
   getSupportedMimeType, 
   setupMediaRecorder, 
   transcribeAudio, 
   isMicrophoneAvailable, 
   getMicrophoneStream 
} from "../chat/whisper-recorder.js";

window.chat = {
   messages: []
};

export const init = async model => {
   window.chat.messages = [];
   
   // Check browser support
   const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
   if (!SpeechRecognition) {
      alert('Web Speech API not supported. Use Chrome, Edge, or Safari.');
      return;
   }
   
   // UI Elements
   let chatBox = model.add();
   let paper = chatBox.add('square').move(0, 1.6, -0.1).scale(0.4, 0.4, 1).color(1, 1, 1, 0.5);
   let speakButton = chatBox.add('sphere').move(0.3, 1.3, -0.1).scale(0.05, 0.05, 0.01).color(1, 1, 0);
   
   // State variables
   let textMesh = null;
   let errorMesh = null;   // Local-only error display (not shared via chat)
   let isRecording = false;
   let mediaRecorder = null;
   let audioChunks = [];
   let lastDisplayText = "";
   let recordingTextMesh = null;
   let buttonColorTimeout = null;
   let userId = "USER_" + Math.floor(Math.random() * 1000);
   let selectedMimeType = '';
   
   let invModel = () => cg.mInverse(model.getGlobalMatrix());
   let isTouchingSpeakButton = false;
   
   // Helpers
   /**
    * Set button color with optional auto-reset to yellow
    */
   const showError = (text) => {
      if (errorMesh) paper.remove(errorMesh);
      errorMesh = clay.text(text);
      paper.add(errorMesh).move(-0.8, 0.85, 0).color(1, 0, 0).scale(4);
   };

   const clearError = () => {
      if (errorMesh) {
         paper.remove(errorMesh);
         errorMesh = null;
      }
   };

   const setButtonColor = (r, g, b, resetToYellow = false) => {
      speakButton.color(r, g, b);
      if (buttonColorTimeout) clearTimeout(buttonColorTimeout);
      if (resetToYellow) {
         buttonColorTimeout = setTimeout(() => {
            speakButton.color(1, 1, 0);
            clearError();
         }, WHISPER_CONFIG.BUTTON_RESET_DELAY);
      }
   };
   
   /**
    * Handle error: log, display in chat, show black button
    */
   const handleError = (errorText, consoleLog) => {
      console.error(consoleLog);
      showError(errorText);
      isRecording = false;
      setButtonColor(0, 0, 0, true); // Black -> auto-reset to yellow (clears error)
      clearRecordingUI();
   };
   
   /**
    * Hide recording indicator UI
    */
   const clearRecordingUI = () => {
      if (recordingTextMesh) {
         chatBox.remove(recordingTextMesh);
         recordingTextMesh = null;
      }
   };
   
   /**
    * Handle audio transcription response from Whisper
    */
   const handleTranscription = async () => {
      try {
         const mimeType = selectedMimeType || 'audio/webm';
         const audioBlob = new Blob(audioChunks, { type: mimeType });
         
         const text = await transcribeAudio(audioBlob, mimeType);
         
         if (textMesh) {
            paper.remove(textMesh);
         }
         
         if (text.length > 0) {
            window.chat.messages.push({ name: userId, message: text, timestamp: Date.now() });
            server.broadcastGlobal('chat');
            setButtonColor(0, 1, 0, true); // Green, auto-reset to yellow
         } else {
            handleError('Speech error: empty-transcript', '%c❌ Empty transcript');
         }
      } catch (error) {
         const errorText = `Speech error: ${error.message || 'whisper-request-failed'}`;
         handleError(errorText, `%c❌ Whisper: ${errorText}`);
      }
   };
   
   /**
    * Stop recording and reset UI
    */
   const stopRecording = () => {
      console.log("Stopping recording...");
      isRecording = false;
      setButtonColor(1, 1, 0); // Yellow
      clearRecordingUI();
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
         mediaRecorder.stop();
      }
   };
   
   // WebXR input handling
   inputEvents.onMove = hand => {
      if (isXR()) {
         let leftPos = inputEvents.pos('left');
         let rightPos = inputEvents.pos('right');
         let globalSpeakButton = speakButton.getGlobalMatrix();
         isTouchingSpeakButton = cg.isPointInBox(leftPos, globalSpeakButton) || cg.isPointInBox(rightPos, globalSpeakButton);
      }
   };
   
   inputEvents.onPress = hand => {
      if (!isRecording && isTouchingSpeakButton) {
         isRecording = true;
         setButtonColor(1, 0, 0); // Red
         
         // Show recording indicator
         if (recordingTextMesh) {
            chatBox.remove(recordingTextMesh);
         }
         recordingTextMesh = clay.text("🔴 Recording...");
         chatBox.add(recordingTextMesh).move(-0.8, 0.3, 0).color(1, 0, 0).scale(4);
         
         // Check microphone
         if (!isMicrophoneAvailable()) {
            handleError('Speech error: mic-not-initialized', '%c❌ Mic not initialized');
            return;
         }
         
         console.log('✅ Using mic stream');
         audioChunks = [];
         selectedMimeType = getSupportedMimeType();
         
         // Setup MediaRecorder with callbacks
         mediaRecorder = setupMediaRecorder(getMicrophoneStream(), {
            onDataAvailable: (event) => {
               if (event.data && event.data.size > 0) {
                  audioChunks.push(event.data);
               }
            },
            onError: (event) => {
               const errorText = `Speech error: ${event.error?.name || 'media-recorder-error'}`;
               handleError(errorText, `%c❌ MediaRecorder: ${errorText}`);
            },
            onStop: handleTranscription
         });
         
         mediaRecorder.start();
         console.log('📼 Recording started');
      }
   };
   
   inputEvents.onRelease = hand => {
      if (isRecording) {
         stopRecording();
      }
   };
      
   model.animate(() => {
      if (window.server) {
         window.chat = server.synchronize('chat');
      }
      
      if (window.chat.messages.length > 0) {
         let displayText = window.chat.messages.map(m => `${m.name}: ${m.message}`).join('\n');
         
         if (displayText !== lastDisplayText) {
            if (textMesh) {
               paper.remove(textMesh);
            }
            textMesh = clay.text(displayText);
            paper.add(textMesh).move(-0.8, 0.3, 0).color(0, 0, 0).scale(4);
            lastDisplayText = displayText;
         }
      }
   });
}