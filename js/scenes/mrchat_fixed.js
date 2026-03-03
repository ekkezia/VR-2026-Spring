import { split } from "../render/core/cg.js";
import * as cg from "../render/core/cg.js";
import { time } from "../render/core/controllerInput.js";
import { transcriber } from "../util/web-speech-transcriber.js";

window.chat = {                              // SHARED STATE IS A GLOBAL VARIABLE.
   messages:  []                                 // { name: value, message: value ... }
};
export const init = async model => {
    // clean chat messages state
    chat.messages = [];
    
    // Check if Web Speech API is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.error('%c❌ Web Speech API NOT SUPPORTED in this browser!', 'color: red; font-weight: bold; font-size: 14px;');
        alert('Web Speech API not supported. Use Chrome, Edge, or Safari.');
        return;
    } else {
        console.log('%c✓ Web Speech API IS SUPPORTED', 'color: green; font-weight: bold; font-size: 14px;');
    }
    
    // Check if transcriber is ready
    console.log('Transcriber supported:', transcriber.isSupported);
    
    let chatBox = model.add();
    let paper = chatBox.add('square').move(0, 1.6, -0.1).scale(0.4,0.4,1).color(1,1,1,.5);
    let speakButton = chatBox.add('sphere').move(0.3, 1.3, -0.1).scale(0.05, 0.05, 0.01).color(1,0,0);

    // Add global test function for debugging
    window.testSpeechAPI = () => {
        console.log('%c🧪 TESTING WEB SPEECH API...', 'color: purple; font-weight: bold; font-size: 16px;');
        transcriber.startListening((text) => {
            console.log('%c✓ Got result from test function:', 'color: green; font-weight: bold;', text);
        });
    };
   
    let mockMessagesInterval = null;
    let transcribedText = "";
    let textMesh = null;
    let isRecording = false;
    let lastDisplayText = "";  // Track last displayed text to avoid redrawing every frame
    
    let userId = "USER_" + Math.floor(Math.random() * 1000); // Random user ID for demonstration
    
    // Mock messages directly to window.chat.messages every 5 seconds
    window.startMockMessages = () => {
        console.log('%c🎲 MOCK MESSAGES STARTED - Random text every 5s', 'color: purple; font-weight: bold; font-size: 14px;');
        mockMessagesInterval = setInterval(() => {
            const randomNum = Math.floor(Math.random() * 10000);
            const randomText = `Random message ${randomNum}`;
            chat.messages.push({ 
                name: userId, 
                message: randomText, 
                timestamp: Date.now() 
            });
            server.broadcastGlobal('chat');  // BROADCAST TO OTHER PLAYERS
            console.log('%c✅ Pushed to chat.messages:', 'color: green; font-weight: bold;', randomText);
        }, 5000);
    };
    
    window.stopMockMessages = () => {
        if (mockMessagesInterval) {
            clearInterval(mockMessagesInterval);
            mockMessagesInterval = null;
        }
        console.log('%c⏹️ MOCK MESSAGES STOPPED', 'color: purple; font-weight: bold; font-size: 14px;');
    };

    let invModel = () => cg.mInverse(model.getGlobalMatrix());

    let isTouchingSpeakButton = false; // Track if either hand is touching the speak button   
    inputEvents.onMove = hand => {
        if (isXR()) {         
            let leftPos = inputEvents.pos('left'); // global
            let rightPos = inputEvents.pos('right'); // global
            
            let localLeft = cg.mTransform(invModel(), leftPos || [0,0,0]);
            let localRight = cg.mTransform(invModel(), rightPos || [0,0,0]);

            let globalSpeakButton = speakButton.getGlobalMatrix();
            isTouchingSpeakButton = cg.isPointInBox(leftPos, globalSpeakButton) || cg.isPointInBox(rightPos, globalSpeakButton);
        }
    }
   
    // Button press handlers using Web Speech API (free, no API keys required)
    inputEvents.onPress = hand => {
        console.log(`%c📍 Button pressed on ${hand} hand`, 'color: orange;');
        console.log(`Recording: ${isRecording}, Touching: ${isTouchingSpeakButton}`);
        
        if (!isRecording && isTouchingSpeakButton) {
            console.log("%c🔴 START RECORDING - Speaking now!", 'color: red; font-weight: bold; font-size: 14px;');
            isRecording = true;
            speakButton.color(0,1,0); // Change to green while recording
            
            transcriber.startListening((text) => {
                console.log("%c✓✓✓ CALLBACK RECEIVED ✓✓✓", 'color: green; font-weight: bold; font-size: 16px;');
                console.log("Transcription callback fired with text:", text);
                transcribedText = text;
                
                // Remove old text mesh if exists
                if (textMesh) {
                    paper.remove(textMesh);
                }
                
                // Display transcribed text
                const processedText = "You: \n" + split(text, 50);
                console.log("Processed text:", processedText);
                textMesh = clay.text(processedText);
                paper.add(textMesh).move(-0.3, 0.3, 0).color(0,0,0).scale(0.02);
                
                // Add to shared chat state immediately when transcription completes
                if (text && text.trim().length > 0) {
                    chat.messages.push({ name: userId, message: text, timestamp: Date.now() });
                    server.broadcastGlobal('chat');  // BROADCAST TO OTHER PLAYERS
                    console.log("Added to chat.messages:", window.chat.messages);
                }
            });
        } else {
            if (isRecording) {
                console.warn("Already recording!");
            }
            if (!isTouchingSpeakButton) {
                console.warn("Not touching the speak button!");
            }
        }
    };
   
    inputEvents.onRelease = hand => {
        if (isRecording) {
            console.log("Stopping speech recognition...");
            isRecording = false;
            speakButton.color(1,0,0); // Back to red
            transcriber.stopListening();
        }
    };

    model.animate(() => { 
        // START BY SYNCHRONIZING STATE FROM SERVER
        if (window.server) {
            window.chat = server.synchronize('chat');
        }
        
        if (window.chat.messages.length > 0) {
            let displayText = window.chat.messages.map(m => `${m.name}: ${m.message}`).join('\n');
            
            // Only update if the text has changed - avoid redrawing every frame
            if (displayText !== lastDisplayText) {
                console.log("Display text changed, updating");
                if (textMesh) {
                    paper.remove(textMesh);
                }
                textMesh = clay.text(displayText);
                paper.add(textMesh).move(-0.8, 0.3, 0).color(0,0,0).scale(4);
                lastDisplayText = displayText;
            }
        }
    });
}
