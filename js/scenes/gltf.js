// Create and animate hierarchical joints.

export const init = async model => {

   let s = model.add();

   let c = [0,1,0];
   s.add('tubeZ');

   inputEvents.onPress = () => {
      c = [0,0,1];
   }
   inputEvents.onRelease = () => {
      c = [1,0,1];
   }

   model.move(0,1.5,0).scale(.4).animate(() => {

      s.identity()
	      .turnY(Math.cos(model.time)/2)
	      .turnZ(Math.cos(2*model.time)/2)
         .color(c)
   });
}
