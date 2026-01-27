// Create and animate hierarchical joints.

export const init = async model => {

   // Create nodes with no shapes as joints for animation.

   let s = model.add();
   let e = s.add();
   let a = e.add();

   // Create and place shapes that will move with each joint.

   s.add('tubeZ').scale(.2,.2,.13).color(0,0,1);
   s.add('tubeX').move(.5,0,0).scale(.5,.1,.1);

   e.add('tubeZ').scale(.18,.18,.12).color(1,0,1);
   e.add('tubeX').move(.5,0,0).scale(.5,.08,.08);
   e.add('sphere').move(1,0,0).scale(.16).color(1,0,0);

   a.add('tubeZ').scale(.15,.15,.1).color(0,1,0);
   a.add('tubeX').move(.4,0,0).scale(.4,.06,.06);
   a.add('sphere').move(.8,0,0).scale(.12).color(1,1,0);

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
      console.log('hand pos:', window.latestHandPos);
      // update 3D label from latest hand pos
      const h = (window.latestHandPos && (window.latestHandPos.indexTip || window.latestHandPos.index)) || null;
      if (handLabel) {
         if (h) handLabel.info(`index: ${h.x.toFixed(3)}, ${h.y.toFixed(3)}, ${h.z.toFixed(3)}`);
         else handLabel.info('index: n/a');
      }

      s
      .identity()
         .move(0,0,0)
         .turnY(Math.cos(model.time))
         .turnZ(Math.cos(1*model.time)); //90deg

      e
         .identity()
         .move(1,0,0)
         .turnZ(Math.sin(1*model.time)/2);

      a
         .identity()
         .move(1,0,0)
         .turnZ(Math.sin(2*model.time)); //180deg
   });
}
