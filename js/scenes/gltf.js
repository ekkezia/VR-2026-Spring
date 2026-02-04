export const init = async model => {
   let obj1 = model.add('cube');

   let m = 1;
   let mRange = 0;
   let scaleFactor = 4;
   let allowScale = true;

   inputEvents.onPress = hand => {
      allowScale = true;
   }

   inputEvents.onRelease = hand => {
      // allowScale = false;
   }

   inputEvents.onMove = hand => {
      let ml = 0;
      let mr = 0;
      if (isXR()) {
         if (hand == 'left')
            ml = inputEvents.pos(hand)[0] * scaleFactor + scaleFactor;//-1 to 1 -> 0 to 1
         if (hand == 'right')
            mr = inputEvents.pos(hand)[0] * scaleFactor + scaleFactor;

         mRange = Math.min(Math.abs(mr-ml), 4);
      }
   }

   
   let color = [.5,.5,.5];
   let mappedScale = mRange / 4; // map mRange from 0-4 to 0-1
   // let mappedScale = 1;
   console.log('m range', mRange, mappedScale);
   model.move(0,1.5,0).scale(mappedScale * .1, .1, .1).animate(() => {
      obj1.identity().color(color);
   });
}