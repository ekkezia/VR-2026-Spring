// Create and animate hierarchical joints.
import { Gltf2Node } from "../render/nodes/gltf2.js";
import * as global from "../global.js";

export const init = async model => {

   // Create nodes with no shapes as joints for animation.
   let clickVar = 1;

   let s = model.add();
   const children = [];
   const children2 = [];
   const count = 20;
   const sphereRadius = .18

   const r = Math.random();
   const g = Math.random();
   const b = Math.random();

   let numOfSubChild = 2;
   for (let i = 0; i < count; i++) {
      const parent = s.add();
      parent.add('sphere').scale(sphereRadius)
      // .color(r, g, ((b - 0.1 * i) % 1));
      const childChild = parent.add();
      childChild.add('tubeX').move(0.6,0,0).scale(.6, .05, .05)
      // .color(r, g, ((b + 0.1 * i) % 1));
      children.push({ parent: parent, child: childChild });
      // recursiveAdd(parent, numOfSubChild, `rgb(${r}, ${g}, ${Math.floor(((b + 0.2) % 1)*255)})`, children);
      

      for (let j = 0; j < numOfSubChild; j++) {
         const subChild = childChild.add();
         subChild.add('coneX').move(0.6 + j * 0.2,0,0).scale(.2, .05, .05).color(r, g, ((b + 0.2 * j) % 1));
      }

      const parent2 = s.add();
      parent2.add('sphere').scale(sphereRadius)
      // .color(r, g, ((b + 0.1 * i) % 1));
      const childChild2 = parent2.add();
      childChild2.add('tubeX').move(-0.6,0,0).scale(.6, .05, .05)
      // .color(r, g, ((b - 0.1 * i) % 1));
      children2.push({ parent: parent2, child: childChild2 });
   }

   function recursiveAdd(p, depth, color, array) {
      if (depth <= 0) return;
      for (let i = 0; i < depth; i++) {
         const newNode = p.add();
         newNode.add('tubeX').move(0.6 * depth,0,0).scale(.6, .05, .05).color(color);
         array.push({ parent: p, child: newNode });
         recursiveAdd(newNode, depth - 1, color);
      }
   }

   // INTERACTION
   let m = 0;
   let color;
   inputEvents.onClick = hand => {
      if (isXR()) {
         // if (hand == 'left')
         //    color[0] = inputEvents.pos(hand)[0] * .5 + .5;//-1 to 1 -> 0 to 1
            
         if (hand == 'right')
            color[0] = inputEvents.pos(hand)[0] * .5 + .5;// x pos -1 to 1 -> 0 to 1
            console.log('color', color, inputEvents.pos(hand))
      }
   };

   // TODO 
   // 3D label for index-tip coordinates (create DOM fallback and poll for clay.vrWidgets)
   let handLabel = null;
   function makeDOMLabel(){
      let el = document.getElementById('handLabelDOM');
      if (!el) {
         el = document.createElement('div');
         el.id = 'handLabelDOM';
         Object.assign(el.style, {
            position: 'fixed', right: '10px', top: '10px', zIndex: '999999',
            background: 'rgba(255, 255, 255, 0.6)', color: 'black', padding: '6px',
            fontFamily: 'monospace', fontSize: '12px', pointerEvents: 'none', display: 'block'
         });
         el.innerText = 'index: n/a';
         document.body.appendChild(el);
      }
      handLabel = { info: txt => { el.innerText = txt; } };
   }
   function tryCreateClayLabel(){
      if (typeof clay !== 'undefined' && clay.vrWidgets) {
         handLabel = clay.vrWidgets.add('label').info('index: n/a').move(0,2.2,-0.5).scale(.05);
         return true;
      }
      return false;
   }
   makeDOMLabel();
   const clayPoll = setInterval(() => { if (tryCreateClayLabel()) clearInterval(clayPoll); }, 500);

   // Animate the joints over time.
   model.move(0,1.5,0).scale(.4).animate(() => {
      // TODO
      // update 3D label from latest hand pos
      const h = (window.latestHandPos && (window.latestHandPos.indexTip || window.latestHandPos.index)) || null;
      if (handLabel) {
         if (h) handLabel.info(`index: ${h.x.toFixed(3)}, ${h.y.toFixed(3)}, ${h.z.toFixed(3)}`);
         else handLabel.info('index: n/a');
      }

      s
         .identity()
         .move(0,clickVar,0)
         // .turnY(Math.cos(1*model.time) * clickVar)
         // .turnZ(Math.cos(1*model.time) / 4); //90deg

      if (!color) {
         color = [Math.abs(Math.sin(model.time/2)), Math.abs(Math.sin(model.time/3)), Math.abs(Math.sin(model.time/4))];
      }
      for (let i = 0; i < children.length; i++) {
         const angle = (i / children.length) * Math.PI; // calculate each child's angle along 180deg 
         const radius = 1;
         const spacing = sphereRadius * 2;
         const x = Math.sin(angle + model.time) * radius * 1 ;
         const y = i * spacing - ((count - 1) * spacing) / 2;
         children[i].parent
            .identity()
            .move(x + m, y, 0)
            .color(color)
            // .turnZ(Math.sin(1 * model.time));
         children[i].child
            .identity()
            .color(color)
            // .turnY(Math.sin(1 * model.time) * 2);         

         children2[i].parent
            .identity()
            .move(-x, y, 0)
            .color(color)
            // .turnZ(Math.sin(1 * model.time));
         children2[i].child
            .identity()
            .color(color)
            // .turnY(Math.sin(1 * model.time) * 2);   
      } 
   });
}
