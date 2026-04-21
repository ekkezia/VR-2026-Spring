# VR-2026-Spring API Documentation

## Usage tricks

When you put down your controllers, the experience automatically goes
into hand tracking mode.

Hold down both joystick buttons (or pinch both thumbs to pinky fingers)
to transform the virtual world.

Hold down just one joystick button (or pinch one thumb to pinky finger)
to translate the virtual world.

Hold down both side triggers (or, if hand tracking, pinch thumb to
middle finger with both hands) to teleport your controllers or hands
across the room.

The further apart your controllers or hands are from each other, the
further away from you your virtual controllers or hands will go.

To bring your controllers or hands back to you, do the same gesture
while touching your two controllers or two forefingers together.

------------------------------------------------------------------------

## Coding basics

### Scenes

All scenes are defined in `js/scenes/scenes.js`

In that file you will see lines like this:

{ name: "example1", path: "./example1.js", public: true }

Where: - name is the name that appears in the XR experience - path is
the relative path to the scene file - public defines whether you can see
it directly in the scene menu after you enter AR mode

To access non-public scenes in the XR experience: - point to and hold
any button in the scene menu with one controller - click the same button
with the other controller

Each scene is a separately defined .js file located under js/scenes

The basic structure of a scene looks like this:

export const init = async model =\> { model.animate(() =\> { }); }

------------------------------------------------------------------------

## cg

A 3D point or vector is represented as:

\[x,y,z\]

A 4x4 matrix:

\[x0,x1,x2,x3, y0,y1,y2,y3, z0,z1,z2,z3, w0,w1,w2,w3\]

### SCALAR FUNCTIONS

cg.bezier(t,a,b,c,d) cg.clamp(t,lo,hi) cg.def(value, default) cg.ease(t)
cg.hermite(t,a,b,da,db) cg.ik(a,b,C,D) cg.mixAngle(a,b,t) cg.mixf(a,b,t)
cg.mixf(a,b,t,u) cg.noise(x,y,z) cg.plateau(a,b,c,d,t)
cg.roundFloat(n,f) cg.uniqueID()

### STRING FUNCTIONS

cg.decimal(f,n) cg.fixedWidth(f,n,d) cg.hexToRgba(hex)
cg.pack(array,lo,hi) cg.round(f,n) cg.unpack(string,lo,hi)

### VECTOR FUNCTIONS

cg.add(a,b) cg.cross(a,b) cg.dot(a,b) cg.mix(a,b,t) cg.mix(a,b,t,u)
cg.norm(v) cg.normalize(v) cg.roundVec(n,v) cg.scale(v,s)
cg.subtract(a,b)

### MATRIX FUNCTIONS

cg.mIdentity() cg.mInverse(m) cg.mMultiply(a,b) cg.mRotateX(theta)
cg.mRotateY(theta) cg.mRotateZ(theta) cg.mScale(s) cg.mTranslate(x,y,z)
cg.mTranspose(m)

------------------------------------------------------------------------

## clay

model.animate(() =\> {})

obj.add(type) obj.move(x,y,z) obj.scale(s) obj.turnX(radians)
obj.turnY(radians) obj.turnZ(radians) obj.color(r,g,b)

------------------------------------------------------------------------

## clientState

clientState.button(id,hand,b) clientState.coords(id)
clientState.finger(id,hand,i) clientState.hand(id,hand)
clientState.head(id) clientState.isHand(id) clientState.isXR(id)
clientState.pinch(id,hand,i) clientState.pinchState(id,hand,i)
clientState.point(id,hand)

------------------------------------------------------------------------

## g2

g2.clear() g2.fillRect(x,y,w,h) g2.drawRect(x,y,w,h) g2.text(...)
g2.line(a,b)

------------------------------------------------------------------------

## g3

draw.line(a,b) draw.text(...) draw.fill(...) draw.image(...)

------------------------------------------------------------------------

## Input System

inputEvents.pos('left') inputEvents.isPressed('right')

------------------------------------------------------------------------

## Shaders

model.customShader(`...`)

------------------------------------------------------------------------

## Audio

createSoundSource(index, url, \[x,y,z\], loop, volume)

------------------------------------------------------------------------

## Room Setup

roomDimensions = { width, height, depth } roomMaterials = { left, right,
front, back, down, up }
