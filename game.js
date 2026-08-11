// ===========================
// 3D Car Game - Main Logic
// ===========================

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 500, 1000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.far = 1000;
directionalLight.shadow.camera.left = -500;
directionalLight.shadow.camera.right = 500;
directionalLight.shadow.camera.top = 500;
directionalLight.shadow.camera.bottom = -500;
scene.add(directionalLight);

// ===========================
// Car Object
// ===========================
const car = {
    mesh: null,
    velocity: 0,
    maxSpeed: 0.5,
    acceleration: 0.02,
    friction: 0.95,
    reverseSpeed: -0.3,
    rotation: 0,
    rotationSpeed: 0.08,
    returnToStraightSpeed: 0.05,
    distanceTraveled: 0,
};

function createCar() {
    const carGroup = new THREE.Group();

    // Car body
    const bodyGeometry = new THREE.BoxGeometry(2, 1.5, 4);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75;
    body.castShadow = true;
    body.receiveShadow = true;
    carGroup.add(body);

    // Car top
    const topGeometry = new THREE.BoxGeometry(1.6, 1, 1.8);
    const topMaterial = new THREE.MeshPhongMaterial({ color: 0xFF3333 });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 2;
    top.position.z = -0.3;
    top.castShadow = true;
    top.receiveShadow = true;
    carGroup.add(top);

    // Wheels
    const wheels = [];
    const wheelPositions = [
        { x: -1, z: 1 },
        { x: 1, z: 1 },
        { x: -1, z: -1 },
        { x: 1, z: -1 },
    ];

    wheelPositions.forEach((pos, index) => {
        const wheel = createWheel();
        wheel.position.set(pos.x, 0.5, pos.z);
        wheel.userData.index = index;
        wheels.push(wheel);
        carGroup.add(wheel);
    });

    car.wheels = wheels;
    carGroup.castShadow = true;
    carGroup.receiveShadow = true;
    car.mesh = carGroup;
    scene.add(carGroup);
}

function createWheel() {
    const wheelGroup = new THREE.Group();

    // Wheel rim
    const rimGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    const rimMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.z = Math.PI / 2;
    rim.castShadow = true;
    rim.receiveShadow = true;
    wheelGroup.add(rim);

    // Tire
    const tireGeometry = new THREE.TorusGeometry(0.5, 0.15, 8, 32);
    const tireMaterial = new THREE.MeshPhongMaterial({ color: 0x111111 });
    const tire = new THREE.Mesh(tireGeometry, tireMaterial);
    tire.rotation.y = Math.PI / 2;
    tire.castShadow = true;
    tire.receiveShadow = true;
    wheelGroup.add(tire);

    return wheelGroup;
}

// ===========================
// Road System
// ===========================
const roadSegments = [];
const ROAD_SEGMENT_LENGTH = 20;
const ROAD_WIDTH = 6;
const MAX_ROAD_SEGMENTS = 100;

function createRoadSegment(index) {
    const segmentGroup = new THREE.Group();
    const zPosition = -index * ROAD_SEGMENT_LENGTH;

    // Road surface
    const roadGeometry = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_SEGMENT_LENGTH);
    const roadMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0;
    road.position.z = zPosition + ROAD_SEGMENT_LENGTH / 2;
    road.receiveShadow = true;
    segmentGroup.add(road);

    // Road markings (center line)
    const markingGeometry = new THREE.PlaneGeometry(0.3, ROAD_SEGMENT_LENGTH);
    const markingMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFF00 });
    const marking = new THREE.Mesh(markingGeometry, markingMaterial);
    marking.rotation.x = -Math.PI / 2;
    marking.position.y = 0.01;
    marking.position.z = zPosition + ROAD_SEGMENT_LENGTH / 2;
    marking.receiveShadow = true;
    segmentGroup.add(marking);

    // Grass left
    const grassLeftGeometry = new THREE.PlaneGeometry(10, ROAD_SEGMENT_LENGTH);
    const grassMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 });
    const grassLeft = new THREE.Mesh(grassLeftGeometry, grassMaterial);
    grassLeft.rotation.x = -Math.PI / 2;
    grassLeft.position.y = -0.01;
    grassLeft.position.x = -(ROAD_WIDTH / 2 + 5);
    grassLeft.position.z = zPosition + ROAD_SEGMENT_LENGTH / 2;
    grassLeft.receiveShadow = true;
    segmentGroup.add(grassLeft);

    // Grass right
    const grassRightGeometry = new THREE.PlaneGeometry(10, ROAD_SEGMENT_LENGTH);
    const grassRight = new THREE.Mesh(grassRightGeometry, grassMaterial);
    grassRight.rotation.x = -Math.PI / 2;
    grassRight.position.y = -0.01;
    grassRight.position.x = ROAD_WIDTH / 2 + 5;
    grassRight.position.z = zPosition + ROAD_SEGMENT_LENGTH / 2;
    grassRight.receiveShadow = true;
    segmentGroup.add(grassRight);

    // Road boundaries (simple barriers)
    const barrierLeft = createBarrier();
    barrierLeft.position.set(-(ROAD_WIDTH / 2 + 0.5), 0, zPosition + ROAD_SEGMENT_LENGTH / 2);
    segmentGroup.add(barrierLeft);

    const barrierRight = createBarrier();
    barrierRight.position.set(ROAD_WIDTH / 2 + 0.5, 0, zPosition + ROAD_SEGMENT_LENGTH / 2);
    segmentGroup.add(barrierRight);

    segmentGroup.userData = { index: index, zPosition: zPosition };
    scene.add(segmentGroup);
    roadSegments.push(segmentGroup);
}

function createBarrier() {
    const barrierGeometry = new THREE.BoxGeometry(0.3, 0.5, ROAD_SEGMENT_LENGTH);
    const barrierMaterial = new THREE.MeshPhongMaterial({ color: 0xFF6600 });
    const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    barrier.castShadow = true;
    barrier.receiveShadow = true;
    return barrier;
}

function updateRoadSegments() {
    const carZ = car.mesh.position.z;

    // Remove segments that are too far behind
    for (let i = roadSegments.length - 1; i >= 0; i--) {
        if (roadSegments[i].userData.zPosition > carZ + 100) {
            scene.remove(roadSegments[i]);
            roadSegments.splice(i, 1);
        }
    }

    // Add new segments ahead
    if (roadSegments.length === 0) {
        for (let i = 0; i < 10; i++) {
            createRoadSegment(i);
        }
    } else {
        const lastSegment = roadSegments[roadSegments.length - 1];
        while (lastSegment.userData.zPosition > carZ - 100) {
            const nextIndex = lastSegment.userData.index + 1;
            createRoadSegment(nextIndex);
            roadSegments.push(scene.getObjectByProperty('userData.index', nextIndex));
        }
    }
}

// ===========================
// Input Handling
// ===========================
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    keys[e.key] = false;
});

function handleInput() {
    // Accelerate
    if (keys['arrowup']) {
        car.velocity = Math.min(car.velocity + car.acceleration, car.maxSpeed);
    }
    // Brake/Reverse
    else if (keys['arrowdown']) {
        if (car.velocity > 0.05) {
            car.velocity *= 0.9; // Brake
        } else {
            car.velocity = Math.max(car.velocity - car.acceleration * 0.7, car.reverseSpeed);
        }
    }
    // Natural friction
    else {
        car.velocity *= car.friction;
    }

    // Steering
    if (keys['arrowleft']) {
        car.rotation = Math.min(car.rotation + car.rotationSpeed, 0.5);
    }
    if (keys['arrowright']) {
        car.rotation = Math.max(car.rotation - car.rotationSpeed, -0.5);
    }

    // Return to straight when no steering input
    if (!keys['arrowleft'] && !keys['arrowright']) {
        car.rotation *= (1 - car.returnToStraightSpeed);
    }
}

// ===========================
// Update Car Position & Movement
// ===========================
function updateCar() {
    handleInput();

    // Update car rotation (steering)
    car.mesh.rotation.y = car.rotation;

    // Move the road (simulate car movement)
    car.mesh.position.z += car.velocity;
    car.distanceTraveled += Math.abs(car.velocity);

    // Keep car centered on screen
    car.mesh.position.x += Math.sin(car.rotation) * car.velocity * 0.3;

    // Clamp car X position to stay on road
    if (car.mesh.position.x > ROAD_WIDTH / 2 - 1) {
        car.mesh.position.x = ROAD_WIDTH / 2 - 1;
    }
    if (car.mesh.position.x < -(ROAD_WIDTH / 2 - 1)) {
        car.mesh.position.x = -(ROAD_WIDTH / 2 - 1);
    }

    // Rotate wheels based on velocity
    if (car.wheels) {
        car.wheels.forEach((wheel, index) => {
            const isRearWheel = index >= 2;
            const wheelRotationAmount = car.velocity * 0.1;
            wheel.rotation.z += wheelRotationAmount;

            // Front wheels rotate with steering
            if (!isRearWheel) {
                wheel.rotation.y = car.rotation;
            }
        });
    }
}

// ===========================
// Update Camera
// ===========================
function updateCamera() {
    const targetX = car.mesh.position.x;
    const targetY = car.mesh.position.y + 6;
    const targetZ = car.mesh.position.z + 15;

    // Smooth camera follow
    camera.position.x += (targetX - camera.position.x) * 0.1;
    camera.position.y += (targetY - camera.position.y) * 0.1;
    camera.position.z += (targetZ - camera.position.z) * 0.1;

    camera.lookAt(car.mesh.position.x, car.mesh.position.y + 1, car.mesh.position.z - 5);
}

// ===========================
// Update HUD
// ===========================
function updateHUD() {
    const speedKmH = Math.round(Math.abs(car.velocity) * 100);
    const speedPercentage = (Math.abs(car.velocity) / car.maxSpeed) * 100;
    const distanceM = Math.round(car.distanceTraveled);

    document.getElementById('speed').textContent = speedKmH;
    document.getElementById('speedBar').style.width = Math.min(speedPercentage, 100) + '%';
    document.getElementById('distance').textContent = distanceM;
}

// ===========================
// Animation Loop
// ===========================
function animate() {
    requestAnimationFrame(animate);

    updateRoadSegments();
    updateCar();
    updateCamera();
    updateHUD();

    renderer.render(scene, camera);
}

// ===========================
// Handle Window Resize
// ===========================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===========================
// Initialize Game
// ===========================
createCar();
createRoadSegment(0);
createRoadSegment(1);
createRoadSegment(2);
createRoadSegment(3);
createRoadSegment(4);
createRoadSegment(5);

camera.position.set(0, 6, 15);
animate();
