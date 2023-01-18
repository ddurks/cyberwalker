import * as THREE from "three";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.139.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.117.1/examples/jsm/controls/OrbitControls.js";
import * as CANNON from 'cannon';

var IS_MOBILE;
if (
  /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(
    navigator.userAgent
  ) ||
  /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(14|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|14|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|84|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
    navigator.userAgent.substr(0, 4)
  )
) {
  IS_MOBILE = true;
} else {
  IS_MOBILE = false;
}
document.getElementById("controls").innerHTML = IS_MOBILE
  ? " controls: joystick"
  : " controls: [W] [A] [S] [D] keys";

export const W = "w";
export const A = "a";
export const S = "s";
export const D = "d";
export const SHIFT = "shift";
export const DIRECTIONS = [W, A, S, D];

export const fwd = "forward";
export const back = "back";
export const lft = "left";
export const rt = "right";
export const JOY_DIRS = [fwd, back, lft, rt];
export const BUILDING_TYPES = ['square', 'cylinder', 'sphere', 'pyramid'];
export const FOLIAGE_TYPES = ['bush1', 'bush2', 'tree1', 'tree2'];
export var WORLD_BOUNDARY_X = [-42, 42];
export var WORLD_BOUNDARY_Z = [-42, 42];
var current_region = {
  x: 0,
  z: 0
}
var regionsList = [];
const REGION_SIZE = 84;

export class CharacterControls {

  walkDirection = new THREE.Vector3();
  rotateAngle = new THREE.Vector3(0, 1, 0);
  rotateQuarternion = new THREE.Quaternion();
  cameraTarget = new THREE.Vector3();
  defaultWalkVelocity = 10;
  walkVelocity = 10;
  fadeDuration = 0.2;
  oldPosition = null;
  walkStart = null;

  constructor(
    model,
    mixer,
    animationsMap,
    orbitControl,
    camera,
    currentAction
  ) {
    this.model = model;
    this.mixer = mixer;
    this.animationsMap = animationsMap;
    this.currentAction = currentAction;
    this.orbitControl = orbitControl;
    this.camera = camera;
  }

  update(delta, keysPressed, joyValues, isMobile) {
    const directionPressed = DIRECTIONS.some((key) => keysPressed[key] == true);
    const joystickPressed = JOY_DIRS.some((key) => joyValues[key] > 0);

    var play = "idle";
    if (((!isMobile && directionPressed) || (isMobile && joystickPressed))) {
      play = "walk";
      if (this.walkStart === null) {
        this.walkStart = Date.now();
      }

      // calculate towards camera direction
      var angleYCameraDirection = Math.atan2(
        this.camera.position.x - body.position.x,
        this.camera.position.z - body.position.z
      );
      // diagonal movement angle offset
      var directionOffset;
      if (isMobile) {
        directionOffset = this.joyDirectionOffset(joyValues);
      } else {
        directionOffset = this.directionOffset(keysPressed);
      }

      // rotate model
      this.rotateQuarternion.setFromAxisAngle(
        this.rotateAngle,
        angleYCameraDirection + directionOffset
      );
      this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2);

      // calculate direction
      this.camera.getWorldDirection(this.walkDirection);
      this.walkDirection.y = 0;
      this.walkDirection.normalize();
      this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);

      // move model & camera
      body.velocity.set(this.walkDirection.x * this.walkVelocity, 0, this.walkDirection.z * this.walkVelocity);
    } else {
      this.walkStart = null;
      this.walkVelocity = this.defaultWalkVelocity;
    }

    this.updateCameraTarget();

    this.updateAnim(play, delta);
  }

  updateAnim(play, delta) {
    if (this.currentAction != play) {
      const toPlay = this.animationsMap.get(play);
      const current = this.animationsMap.get(this.currentAction);

      current.fadeOut(this.fadeDuration);
      toPlay.reset().fadeIn(this.fadeDuration).play();

      this.currentAction = play;
    }
    var speedMultiplier = 1;
    if (this.walkStart !== null) {
      var deltat = Date.now() - this.walkStart;
      if (deltat > 2000) {
        speedMultiplier = (deltat / 2000);
        if (speedMultiplier > 2) {
          speedMultiplier = 2;
        }
      }
      this.walkVelocity = this.defaultWalkVelocity * speedMultiplier;
    }
    this.mixer.update(delta * speedMultiplier);
  }

  updateCameraTarget() {
    // calculate camera movement
    let moveX = (body.velocity.x > 0 ? 1 : -1) * Math.abs(body.position.x - body.lastPosition.x);
    let moveZ = (body.velocity.z > 0 ? 1 : -1) * Math.abs(body.position.z - body.lastPosition.z);
    body.lastPosition = { x: body.position.x, y: body.position.y, z: body.position.z };

    // move camera
    this.camera.position.x += moveX;
    this.camera.position.z += moveZ;

    // update camera target
    this.cameraTarget.x = body.position.x;
    this.cameraTarget.y = body.position.y + 1;
    this.cameraTarget.z = body.position.z;
    this.orbitControl.target = this.cameraTarget;
  }

  directionOffset(keysPressed) {
    var directionOffset = 0; // w

    if (keysPressed[W]) {
      if (keysPressed[A]) {
        directionOffset = Math.PI / 4; // w+a
      } else if (keysPressed[D]) {
        directionOffset = -Math.PI / 4; // w+d
      }
    } else if (keysPressed[S]) {
      if (keysPressed[A]) {
        directionOffset = Math.PI / 4 + Math.PI / 2; // s+a
      } else if (keysPressed[D]) {
        directionOffset = -Math.PI / 4 - Math.PI / 2; // s+d
      } else {
        directionOffset = Math.PI; // s
      }
    } else if (keysPressed[A]) {
      directionOffset = Math.PI / 2; // a
    } else if (keysPressed[D]) {
      directionOffset = -Math.PI / 2; // d
    }

    return directionOffset;
  }

  joyDirectionOffset(joyValues) {
    var directionOffset = 0; // w

    if (joyValues.forward > 0) {
      if (joyValues.right > 0.25) {
        if (joyValues.right > 0.75) {
          directionOffset = -Math.PI / 2; // d
        } else {
          directionOffset = -Math.PI / 4 - Math.PI / 2; // s+d
        }
      } else if (joyValues.left > 0.25) {
        if (joyValues.left > 0.75) {
          directionOffset = Math.PI / 2; // a
        } else {
          directionOffset = Math.PI / 4 + Math.PI / 2; // s+a
        }
      } else {
        directionOffset = Math.PI; // s
      }
    }
    if (joyValues.backward > 0) {
      if (joyValues.right > 0.25) {
        if (joyValues.right > 0.75) {
          directionOffset = -Math.PI / 2; // d
        } else {
          directionOffset = -Math.PI / 4; // w+d
        }
      } else if (joyValues.left > 0.25) {
        if (joyValues.left > 0.75) {
          directionOffset = Math.PI / 2; // a
        } else {
          directionOffset = Math.PI / 4; // w+a
        }
      }
    }

    return directionOffset;
  }
}

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// PHYSICS
const world = new CANNON.World();
// Tweak contact properties.
// Contact stiffness - use to make softer/harder contacts
world.defaultContactMaterial.contactEquationStiffness = 1e9;
// Stabilization time in number of timesteps
world.defaultContactMaterial.contactEquationRelaxation = 4;
const solver = new CANNON.GSSolver();
solver.iterations = 7;
solver.tolerance = 0.1;
world.solver = new CANNON.SplitSolver(solver);
// use this to test non-split solver
// world.solver = solver
world.gravity.set(0, -20, 0)
// Create a contact material (friction coefficient = 0.3a)
var physicsMaterial = new CANNON.Material('physics');
const physics_physics = new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, {
  friction: 0.3,
  restitution: 0.0,
});
// We must add the contact materials to the world
world.addContactMaterial(physics_physics);

// CAMERA
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 10000, 100);

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// FOG
const color = 0xa8def0;
const near = 10;
const far = 50;
scene.fog = new THREE.Fog(color, near, far);

// CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.minDistance = 5;
orbitControls.maxDistance = 15;
orbitControls.enablePan = false;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
orbitControls.update();

// LIGHTS
light();

// FLOOR
generateFloor();

// LOAD ASSETS and BUILD SCENE
var gLoader = new GLTFLoader();

var characterControls, guy, animationsMap = new Map(), body;
gLoader.load("./assets/comp_guy.glb", (gltf) => {
  gltf.scene.traverse(function (object) {
    if (object.isMesh) object.castShadow = true;
  });
  guy = gltf.scene.children[0];
  guy.position.set(0, 1, 0);
  scene.add(guy);
  camera.position.add(guy.position);

  const slipperyMaterial = new CANNON.Material('slippery');
  slipperyMaterial.friction = 0;

  // Player physics body
  const shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
  body = new CANNON.Body({
    mass: 1,
    material: slipperyMaterial
  });
  body.addShape(shape);
  body.position.copy(guy.position);
  body.lastPosition = { x: body.position.x, y: body.position.y, z: body.position.z };
  body.linearDamping = 0.999;
  world.addBody(body);

  const mixer = new THREE.AnimationMixer(guy);
  gltf.animations.forEach((a) => {
    animationsMap.set(a.name, mixer.clipAction(a));
  });
  animationsMap.get('idle').fadeIn(5).play();

  characterControls = new CharacterControls(
    guy,
    mixer,
    animationsMap,
    orbitControls,
    camera,
    "idle"
  );
});

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load("./assets/grass_texture_01.jpg");
const placeholder = textureLoader.load("./assets/asphalt_road.png");

var building, cylinder, sphere, pyramid, bush1, bush2, tree1, tree2;
gLoader.load("./assets/building01.glb", (gltf) => {
  gltf.scene.traverse(function (object) {
    if (object.isMesh) object.castShadow = true;
  });
  building = gltf.scene.getObjectByName( 'square_building' );
  cylinder = gltf.scene.getObjectByName( 'cylinder_building' );
  sphere = gltf.scene.getObjectByName( 'sphere_building' );
  pyramid = gltf.scene.getObjectByName( 'pyramid_building' );
  bush1 = gltf.scene.getObjectByName( 'bush' );
  bush2 = gltf.scene.getObjectByName( 'bush2' );
  tree1 = gltf.scene.getObjectByName( 'tree' );
  tree2 = gltf.scene.getObjectByName( 'tree2' );
  

  createRegion(0,0);
  regionsList.push(current_region);
});

function createRegion(x, z) {
  if (regionsList.filter(region => x === region.x && z === region.z).length < 1) {
    console.log('CREATED NEW REGION', x, z);
    createBlock(x-(REGION_SIZE/6), z-(REGION_SIZE/6));
    createBlock(x-(REGION_SIZE/6), z+(REGION_SIZE/6));
    createBlock(x+(REGION_SIZE/6), z+(REGION_SIZE/6));
    createBlock(x+(REGION_SIZE/6), z-(REGION_SIZE/6));
    createBlock(x-(REGION_SIZE/2), z-(REGION_SIZE/2));
    createBlock(x-(REGION_SIZE/2), z+(REGION_SIZE/2));
    createBlock(x+(REGION_SIZE/2), z+(REGION_SIZE/2));
    createBlock(x+(REGION_SIZE/2), z-(REGION_SIZE/2));
    createBlock(x-(REGION_SIZE/6), z-(REGION_SIZE/2));
    createBlock(x-(REGION_SIZE/2), z+(REGION_SIZE/6));
    createBlock(x+(REGION_SIZE/6), z+(REGION_SIZE/2));
    createBlock(x+(REGION_SIZE/2), z-(REGION_SIZE/6));
    createBlock(x-(REGION_SIZE/2), z-(REGION_SIZE/6));
    createBlock(x-(REGION_SIZE/6), z+(REGION_SIZE/2));
    createBlock(x+(REGION_SIZE/2), z+(REGION_SIZE/6));
    createBlock(x+(REGION_SIZE/6), z-(REGION_SIZE/2));
    addGround(x,z);
    return true;
  }
  return false;
}

function createBlock(x, z) {
  let offset = 5;
  let buildingX = x + (getRandomInt(2) ? 1 : -1) * offset, buildingZ = z + (getRandomInt(2) ? 1 : -1) * offset;
  createBuilding(BUILDING_TYPES[getRandomInt(4)], buildingX , 0, buildingZ);
  for (let i = 0; i < getRandomInt(25); i++){
    let foliageX = x + ((getRandomInt(2) ? 1 : -1) * getRandomInt(10)), foliageZ = z + ((getRandomInt(2) ? 1 : -1) * getRandomInt(10));
    if (!((foliageX < buildingX + offset && foliageX > buildingX - offset) && (foliageZ < buildingZ + offset && foliageZ > buildingZ - offset))) {
      createFoliage(FOLIAGE_TYPES[getRandomInt(4)], foliageX, 0, foliageZ);
    }
  }
}

function createBuilding(buildingType, x, y, z) {
  let newBuilding;
  switch (buildingType) {
    case 'cylinder':
      newBuilding = cylinder.clone();
      break;
    case 'sphere':
      newBuilding = sphere.clone();
      break;
    case 'pyramid':
      newBuilding = pyramid.clone();
      break;
    case 'square':
    default:
      newBuilding = building.clone();
  }
  newBuilding.position.set(x,y,z);
  scene.add(newBuilding);
  let buildingShape = new CANNON.Box(new CANNON.Vec3(3.25, 3.25, 3.25));
  let buildingBody = new CANNON.Body({
    mass: 0,
    type: CANNON.Body.KINEMATIC,
    position: new CANNON.Vec3(newBuilding.position.x, newBuilding.position.y, newBuilding.position.z),
  });
  buildingBody.addShape(buildingShape);
  world.addBody(buildingBody);
}

function createFoliage(foliageType, x, y, z) {
  let newFoliage;
  switch (foliageType) {
    case 'tree1':
      newFoliage = tree1.clone();
      break;
    case 'tree2':
      newFoliage = tree2.clone();
      break;
    case 'bush1':
      newFoliage = bush1.clone();
      break;
    case 'bush2':
    default:
      newFoliage = bush2.clone();
  }
  newFoliage.position.set(x,y,z);
  scene.add(newFoliage);
  if (foliageType === 'tree1' || foliageType === 'tree2') {
    let foliageShape = new CANNON.Box(new CANNON.Vec3(0.25, 2, 0.25));
    let foliageBody = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.KINEMATIC,
      position: new CANNON.Vec3(newFoliage.position.x, newFoliage.position.y, newFoliage.position.z),
    });
    foliageBody.addShape(foliageShape);
    world.addBody(foliageBody);
  }
}

// KEYBOARD CONTROLS
const keysPressed = {};
document.addEventListener(
  "keydown",
  (event) => {
    keysPressed[event.key.toLowerCase()] = true;
  },
  false
);
document.addEventListener(
  "keyup",
  (event) => {
    keysPressed[event.key.toLowerCase()] = false;
  },
  false
);

// JOYSTICK
var joyManager;
var joyValues = {
  backward: 0,
  forward: 0,
  right: 0,
  left: 0,
  tempVector: new THREE.Vector3(),
  upVector: new THREE.Vector3(0, 1, 0),
  tempVector: new THREE.Vector3(),
};

function addJoystick() {
  const options = {
    zone: document.getElementById("joystickWrapper1"),
    size: window.innerWidth / 3,
    multitouch: true,
    maxNumberOfNipples: 2,
    mode: "static",
    restJoystick: true,
    shape: "circle",
    position: { top: "60px", left: "60px" },
    dynamicPage: true,
  };

  joyManager = nipplejs.create(options);

  joyManager["0"].on("move", function (evt, data) {
    const forward = data.vector.y;
    const turn = data.vector.x;

    if (forward > 0) {
      joyValues.backward = Math.abs(forward);
      joyValues.forward = 0;
    } else if (forward < 0) {
      joyValues.backward = 0;
      joyValues.forward = Math.abs(forward);
    }

    if (turn > 0) {
      joyValues.left = 0;
      joyValues.right = Math.abs(turn);
    } else if (turn < 0) {
      joyValues.left = Math.abs(turn);
      joyValues.right = 0;
    }
  });

  joyManager["0"].on("end", function (evt) {
    joyValues.forward = 0;
    joyValues.backward = 0;
    joyValues.left = 0;
    joyValues.right = 0;
  });
}

// ANIMATE
const clock = new THREE.Clock();
const timeStep = 1/60;
function animate() {
  let mixerUpdateDelta = clock.getDelta();
  if (characterControls) {
    characterControls.update(
      mixerUpdateDelta,
      keysPressed,
      joyValues,
      IS_MOBILE
    );
    guy.position.copy(body.position);
    body.quaternion.copy(guy.quaternion);
  }
  updateCurrentRegion();
  proceduralWorldUpdate();
  orbitControls.update();
  renderer.render(scene, camera);
  world.step(timeStep, mixerUpdateDelta);
  requestAnimationFrame(animate);
}

document.body.appendChild(renderer.domElement);
THREE.DefaultLoadingManager.onLoad = () => {
  document.getElementById("loading").outerHTML = "";
  if (IS_MOBILE) {
    addJoystick();
  }
  animate();
};

// RESIZE HANDLER
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onWindowResize);

function generateFloor() {
  // Ground Physics
  const groundMaterial = new CANNON.Material('ground')
  groundMaterial.friction = 0.3
  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
  groundBody.addShape(groundShape)
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
  groundBody.position.set(0, -1, 0);
  world.addBody(groundBody)
}

function addGround(x,z) {
  var geometry = new THREE.PlaneGeometry(REGION_SIZE, REGION_SIZE, 512, 512);
  const material = new THREE.MeshPhongMaterial({ map: groundTexture });

  const ground = new THREE.Mesh(geometry, material);
  ground.receiveShadow = true;
  ground.position.set(x,0,z);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const roadMaterial = new THREE.MeshPhongMaterial({ map: placeholder });

  geometry = new THREE.PlaneGeometry(10, REGION_SIZE, 512, 512);
  const floor = new THREE.Mesh(geometry, roadMaterial);
  floor.position.set(x,0.02,z);
  floor.receiveShadow = true;
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  geometry = new THREE.PlaneGeometry(REGION_SIZE, 10, 512, 512);
  const floor2 = new THREE.Mesh(geometry, roadMaterial);
  floor2.position.set(x,0.01,z);
  floor2.receiveShadow = true;
  floor2.rotation.x = -Math.PI / 2;
  scene.add(floor2);
}

function proceduralWorldUpdate() {
  console.log(current_region.x, current_region.z, current_region);
  if (body.position.z < current_region.z) {
    if (createRegion(current_region.x, current_region.z - REGION_SIZE)) {
      let newRegion = {
        x: current_region.x,
        z: current_region.z - REGION_SIZE,
        bottom: current_region
      }
      current_region.top = newRegion;
      checkForConnectedRegions(newRegion);
      regionsList.push(newRegion);
    }
  }
  if (body.position.z > current_region.z) {
    if (createRegion(current_region.x, current_region.z + REGION_SIZE)) {
      let newRegion = {
        x: current_region.x,
        z: current_region.z + REGION_SIZE,
        top: current_region
      }
      current_region.bottom = newRegion;
      checkForConnectedRegions(newRegion);
      regionsList.push(newRegion);
    }
  }
  if (body.position.x < current_region.x) {
    if (createRegion(current_region.x - REGION_SIZE, current_region.z)){
      let newRegion = {
        x: current_region.x - REGION_SIZE,
        z: current_region.z,
        right: current_region
      }
      current_region.left = newRegion;
      checkForConnectedRegions(newRegion);
      regionsList.push(newRegion);
    }
  }
  if (body.position.x > current_region.x) {
    if (createRegion(current_region.x + REGION_SIZE, current_region.z)) {
      let newRegion = {
        x: current_region.x + REGION_SIZE,
        z: current_region.z,
        left: current_region
      }
      current_region.right = newRegion;
      checkForConnectedRegions(newRegion);
      regionsList.push(newRegion);
    }
  }
}

function updateCurrentRegion() {
  if (body.position.x > current_region.x + 42) {
    current_region = current_region.right;
  } else if (body.position.x < current_region.x - 42) {
    current_region = current_region.left;
  }
  if (body.position.z > current_region.z + 42) {
    current_region = current_region.bottom;
  } else if (body.position.z < current_region.z - 42) {
    current_region = current_region.top;
  }
}

function checkForConnectedRegions(newRegion) {
  let regionRight = regionsList.filter(region => (region.x === newRegion.x + REGION_SIZE && region.z === newRegion.z));
  let regionLeft = regionsList.filter(region => (region.x === newRegion.x - REGION_SIZE && region.z === newRegion.z));
  let regionBottom = regionsList.filter(region => (region.x === newRegion.x && region.z === newRegion.z + REGION_SIZE));
  let regionTop = regionsList.filter(region => (region.x === newRegion.x && region.z === newRegion.z - REGION_SIZE));

  console.log(regionRight, regionLeft, regionTop, regionBottom);

  if (regionLeft && newRegion.left === undefined) {
    newRegion.left = regionLeft[0];
  }
  if (regionRight && newRegion.right === undefined) {
    newRegion.right = regionRight[0];
  }
  if (regionTop && newRegion.top === undefined) {
    newRegion.top = regionTop[0];
  }
  if (regionBottom && newRegion.bottom === undefined) {
    newRegion.bottom = regionBottom[0];
  }
}

function light() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(-60, 100, -10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.mapSize.width = 4096;
  dirLight.shadow.mapSize.height = 4096;
  scene.add(dirLight);
}
