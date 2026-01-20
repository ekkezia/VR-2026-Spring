# VR-2026-Spring

Software for CSCI-GA.3033-​097 Virtual Reality 2026 Spring.

# How to setup the environment

install Node.js and npm if you haven't. Then in the command line, do
```sh
npm install
cd server
npm install
source patch
```
If source patch does not work, try
```sh
sh patch_fixed.sh
```

# How to run on your local computer

1. At the root folder, do ``./startserver``
2. Go to chrome://flags/ in your Google Chrome browser
3. Search: ***"Insecure origins treated as secure"*** and enable the flag
4. Add http://[your-computer's-ip-address]:2026 to the text box. For example http://10.19.127.1:2026
5. Relaunch the chrome browser on your computer and go to http://localhost:2026

# How to run in VR

1. Run the program locally on your computer
2. Open the browser on your VR headset
3. Go to chrome://flags/
4. Search: ***"Insecure origins treated as secure"*** and enable the flag
5. Add http://[your-computer's-ip-address]:2026 to the text box. For example http://10.19.127.1:2026
7. Relaunch the browser on your VR headset and go to http://[your-computer's-ip-address]:2026 

# How to debug in VR

1. On your Oculus app, go to *Devices*, select your headset from the device list, and wait for it to connect. Then select *Developer Mode* and turn on *Developer Mode*.
2. Connect your quest with your computer using your Oculus Quest cable.
3. Go to chrome://inspect#devices on your computer
4. Go to your VR headset and accept *Allow USB Debugging* when prompted on the headset
5. On the chrome://inspect#devices on your computer, you should be able to see your device under the *Remote Target* and its active programs. You can then inspect the *VR-2026-Spring* window on your computer.

# How to create your own demo

1. Go to the [scenes folder](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/scenes/) and create a .js file based on the template of [example1.js](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/scenes/example1.js)
2. Change the name and the content of the demo to whatever you like!
3. Go to [scenes.js](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/scenes/scenes.js), add the name of your demo and its path to the returned value of [```scenes```](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/scenes/scenes.js#L13)
4. Note that the [```enableSceneReloading```](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/scenes/scenes.js#L12) is set to true so that you can hot-reload the changes in your demo. 

# How to enable your hand-tracking

1. Enable the experimental feature in the browser (Oculus Browser 11)
2. Visit chrome://flags/
3. Enable WebXR experiences with joint tracking (#webxr-hands)
4. Enable WebXR Layers depth sorting (#webxr-depth-sorting)
5. Enable WebXR Layers (#webxr-layers)
6. Enable phase sync support (#webxr-phase-sync)
7. Enable "Auto Enable Hands or Controllers" (Quest Settings (Gear Icon) -> Device -> Hands and Controllers)
8. Enter the VR experience

# Notes on customizing your avatar
1. To change the initial position of your avatar: go to [js/util/inline-viewer-helper.js](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/util/inline-viewer-helper.js) and change the values of [```this.lookYaw```](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/util/inline-viewer-helper.js#L46), [```this.walkPosition```](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/util/inline-viewer-helper.js#L47), [```this.lookPitch```](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/util/inline-viewer-helper.js#L49). Notice that [```this.viewerHeight```](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/util/inline-viewer-helper.js#L50) (the avatar's height) is set to be 1.6m from the [```inlineViewerHelper.setHeight(1.6)```](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/immersive-pre.js#L503) in [js/immersive-pre.js](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/immersive-pre.js). You can change this if you like.
2. To customize your own avatar: go to [js/primitive/avatar.js](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/primitive/avatar.js). You can change the GLTF models used in the [```Headset```](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/primitive/avatar.js#L101) and the [```Controller```](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/primitive/avatar.js#L114) classes. You can add additional arguments to the [```initAvatar```](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/primitive/avatar.js#L8) function to specify the avatar's look, and pass those values from the [```addPawn```](https://github.com/futurerealitylab/VR-2026-Spring/tree/master/js/util/croquetlib.js#L162) function.

