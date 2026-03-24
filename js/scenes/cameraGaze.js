import * as cg from "../render/core/cg.js";

const GAZE_RADIUS = 2;
const CENTER_Y = 1.5;

// Overlay sphere sits just inside the 360 photo sphere
const OVERLAY_R = 2;
const N_LON = 24;  // cells around the equator
const N_LAT = 12;  // cells pole to pole

export const init = async model => {
   let photo = model.add();
   model.txtrSrc(1, '../media/textures/360photo.jpg');
   photo.add('sphere').scale(-50, 50, 50).color(1,1,1).txtr(1);

   // Arc-length half-extents for gap-free tiling
   const cellW = OVERLAY_R * (2 * Math.PI / N_LON) / 2;
   const cellH = OVERLAY_R * (Math.PI  / N_LAT)   / 2;

   for (let li = 0; li < N_LAT; li++) {
      for (let loi = 0; loi < N_LON; loi++) {
         const lat = ((li + 0.5) / N_LAT - 0.5) * Math.PI; // -π/2 … π/2
         const lon = (loi + 0.5) / N_LON * 2 * Math.PI;    // 0 … 2π

         const cosLat = Math.cos(lat), sinLat = Math.sin(lat);
         const cosLon = Math.cos(lon), sinLon = Math.sin(lon);

         // Position on overlay sphere (centre at world origin + CENTER_Y)
         const px =  OVERLAY_R * cosLat * sinLon;
         const py =  OVERLAY_R * sinLat + CENTER_Y;
         const pz = -OVERLAY_R * cosLat * cosLon; // -z = forward

         // Basis vectors for inward-facing orientation
         // right = longitude tangent
         const rx = cosLon,               ry = 0,      rz = sinLon;
         // up    = latitude tangent
         const ux = -sinLat * sinLon,     uy = cosLat, uz = sinLat * cosLon;
         // fwd   = inward normal (toward sphere centre / viewer)
         const fx = -cosLat * sinLon,     fy = -sinLat, fz = cosLat * cosLon;

         // Column-major 4×4: right*cellW | up*cellH | fwd | position
         const mat = [
            rx*cellW, ry*cellW, rz*cellW, 0,
            ux*cellH, uy*cellH, uz*cellH, 0,
            fx,       fy,       fz,       0,
            px,       py,       pz,       1
         ];

         model.add().setMatrix(mat).add('square');
      }
   }

   model.animate(() => {
      let mm = cg.mMultiply(clay.root().viewMatrix(0), worldCoords);

      let distances = [];
      for (let n = 1 ; n < model.nChildren() ; n++) {
         let m = cg.mMultiply(mm, model.child(n).getMatrix());
         let d = m[12]*m[12] + m[13]*m[13];
         distances.push({ n, d, inFront: m[14] < 0 });
      }

      for (let { n, d, inFront } of distances) {
         const normalizedD = Math.min(d / 2, 1);
         const opacity = (!inFront || d > GAZE_RADIUS) ? 1 : 0.85 * normalizedD;
         model.child(n).child(0)
            .color([0, 0, 0])
            .opacity(opacity)
            .identity().scale(1);
      }
   });
}