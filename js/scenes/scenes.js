import * as global from "../global.js";
import { Gltf2Node } from "../render/nodes/gltf2.js";

export default () => {
   global.scene().addNode(new Gltf2Node({
      url: ""
   })).name = "backGround";

   return {
      enableSceneReloading: true,
      scenes: [ 
         { name: "shapes"       , path: "./shapes.js"       , public: true },
         { name: "joints"       , path: "./joints.js"       , public: true },
         { name: "inputTest"   , path: "./inputTest.js"   , public: true },
         { name: "inputTest1"   , path: "./inputTest1.js"   , public: true },
         { name: "flag"         , path: "./flag.js"         , public: true },
         { name: "bouncing"     , path: "./bouncing.js"     , public: true },
         { name: "multiplayer1" , path: "./multiplayer1.js" , public: true },
         { name: "aditya"   , path: "./aditya.js"   , public: true },
         { name: "dna"   , path: "./dna.js"   , public: true },
         { name: "dough"   , path: "./dough.js"   , public: true },
         { name: "co-draw"   , path: "./co-draw.js"   , public: true },
         { name: "co-mold"   , path: "./co-mold.js"   , public: true },
      ]
   };
}

