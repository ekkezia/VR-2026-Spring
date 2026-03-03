# Chat Utilities

Shared functionality for different mrchat scene implementations.

## whisper-recorder.js

Provides audio recording and Whisper API transcription utilities.

### Usage

```javascript
import { 
   WHISPER_CONFIG,
   getSupportedMimeType,
   setupMediaRecorder,
   transcribeAudio,
   isMicrophoneAvailable,
   getMicrophoneStream
} from "../chat/whisper-recorder.js";
```

### API

#### `WHISPER_CONFIG`
Configuration object with:
- `ENDPOINT` - Whisper API endpoint URL
- `MIME_TYPES` - Supported audio MIME types
- `BUTTON_RESET_DELAY` - Timeout for UI state reset (ms)

#### `getSupportedMimeType()`
Returns the first MIME type supported by the browser for audio recording.

**Returns:** `String` - MIME type or empty string

#### `setupMediaRecorder(stream, callbacks)`
Creates a MediaRecorder with event handlers.

**Parameters:**
- `stream` - MediaStream from microphone
- `callbacks` - Object with handlers:
  - `onDataAvailable(event)` - Called when audio data is available
  - `onError(event)` - Called on recording error
  - `onStop()` - Called when recording stops

**Returns:** `MediaRecorder` - Configured recorder instance

#### `transcribeAudio(audioBlob, mimeType)`
Sends audio to Whisper API for transcription.

**Parameters:**
- `audioBlob` - Blob containing audio data
- `mimeType` - Audio MIME type (default: 'audio/webm')

**Returns:** `Promise<String>` - Transcribed text

**Throws:** Error if API call fails

#### `isMicrophoneAvailable()`
Checks if microphone stream is initialized.

**Returns:** `Boolean` - True if mic is available

#### `getMicrophoneStream()`
Gets the persistent microphone stream.

**Returns:** `MediaStream | null` - Audio stream or null

## Example Implementation

```javascript
const mimeType = getSupportedMimeType();
const mediaRecorder = setupMediaRecorder(getMicrophoneStream(), {
   onDataAvailable: (event) => {
      audioChunks.push(event.data);
   },
   onError: (event) => {
      console.error("Recording error:", event.error);
   },
   onStop: async () => {
      const blob = new Blob(audioChunks, { type: mimeType });
      const text = await transcribeAudio(blob, mimeType);
      console.log("Transcribed:", text);
   }
});

mediaRecorder.start();
```

## Notes

- Microphone must be acquired before entering VR session (stored in `window.persistentMicStream`)
- Whisper server must be running at the configured endpoint
- CORS must be enabled on Whisper server
