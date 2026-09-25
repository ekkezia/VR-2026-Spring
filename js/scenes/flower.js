import { Matrix } from '../render/core/cg.js';
import { Gltf2Node } from '../render/nodes/gltf2.js';
import * as global from '../global.js';

const BICI_ROOT = 'bici/projects/0423/src';
const FLOWER_FILE = `${BICI_ROOT}/flower.cg`;
const MOVEMENT_FILE = `${BICI_ROOT}/flower_data.cg`;

const GLB_PATHS = {
   'assets/rose.glb': './media/gltf/rose/rose.glb',
   'assets/vase.glb': './media/gltf/vase/vase.glb',
};

async function getFile(file, callback) {
    try {
        const response = await fetch(file);
        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);
        callback(await response.text());
    } catch (error) { }
}

let replaceAtSigns = src => {
   let dst = '';
   for (let i = 0 ; i < src.length ; i++)
      if (src[i] == '@')
         dst += 'I[' + src[++i] + ']';
      else
         dst += src[i];
   return dst;
}

export const init = async model => {
   let flower, flowerData;
   let glbDrawIndex = 0;
   const glbNodes = [];

   //model.opacity(.7);

   window.I = [0,0,0,0,0, 0,0,0,0,0];
   window.cg = new Matrix();
   cg.draw = (shape, color, size) => {
      let matrix = cg.getValue();
      if (size !== undefined)
         matrix = new Matrix().setValue(matrix).scale(size).getValue();
      model.add(shape).setMatrix(matrix).color(color);
      return cg;
   }
   cg.drawGLB = (url, _color) => {
      const resolvedUrl = GLB_PATHS[url] || url;
      let entry = glbNodes[glbDrawIndex];

      if (!entry || entry.url !== resolvedUrl) {
         if (entry)
            global.gltfRoot.removeNode(entry.node);
         const node = global.gltfRoot.addNode(new Gltf2Node({ url: resolvedUrl }));
         entry = glbNodes[glbDrawIndex] = { url: resolvedUrl, node };
      }

      entry.node.matrix = cg.getValue();
      entry.node.visible = true;
      glbDrawIndex++;
      return cg;
   }
   cg.move     = cg.translate;
   cg.pop      = cg.restore;
   cg.push     = cg.save;
   cg.turnX    = cg.rotateX;
   cg.turnY    = cg.rotateY;
   cg.turnZ    = cg.rotateZ;
   window.PI   = Math.PI;
   window.ball = 'sphere';
   window.cube = 'cube';
   window.tube = 'tubeZ';
   window.tubeY = 'tubeY';

   model.animate(() => {

      // GET MODEL FROM bici

      getFile(FLOWER_FILE, text => flower = text);

      if (flower) {
         let fn = new Function(replaceAtSigns(flower));

	 // GET MOVEMENT FROM bici

         getFile(MOVEMENT_FILE, text => flowerData = text);

	 if (flowerData) {
	    let data = flowerData.split(',');
	    for (let i = 0 ; i < 3 ; i++)
	       I[i] = 2 * parseInt(data[i]) / 100 - 1;
         }

         while (model.nChildren() > 0)
            model.remove(0);
         glbDrawIndex = 0;
         for (const entry of glbNodes)
            entry.node.visible = false;
         cg.identity().move(0,1.5,0).scale(.3);
         fn();
      }
   });
}
