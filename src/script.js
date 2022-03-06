import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import * as CANNON from 'cannon-es'
import { BODY_SLEEP_STATES } from 'cannon-es'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'

/**
 * Debug
 */
const gui = new dat.GUI()
const debugObject = {}
const raycasterObjects = []
const cannonObjects = []
let focusedObject, currentIntersect


// debugObject.createSphere = () =>
// {
//     createSphere(
//         Math.random() * 8,
//         {
//             x: 0,
//             y: 9,
//             z: 0
//         }
//     )
// }

// gui.add(debugObject, 'createSphere')

debugObject.createBox = () =>
{
    createBox(
        8.5/2,
        11/2,
        .1,
        {
            x: (Math.random() - 0.5) * 2,
            y: 100 * Math.random(),
            z: (Math.random() - 0.5) * 2
        }
    )
}
gui.add(debugObject, 'createBox')

debugObject.createResume = () => { createResume() }
gui.add(debugObject, 'createResume')

// Reset
debugObject.reset = () =>
{
    for(const object of cannonObjects)
    {
        // Remove body
        object.body.removeEventListener('collide', playHitSound)
        world.removeBody(object.body)
        // Remove mesh
        scene.remove(object.mesh)
    }

    cannonObjects.splice(0, cannonObjects.length)
}
gui.add(debugObject, 'reset')

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()




const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)




/**
 * Sounds
 */
const hitSound = new Audio('/sounds/hit.mp3')

const playHitSound = (collision) =>
{
    const impactStrength = collision.contact.getImpactVelocityAlongNormal()

    if(impactStrength > 4)
    {
        hitSound.volume = Math.random()
        hitSound.currentTime = 0
        hitSound.play()
    }
}

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const yellowTexture = textureLoader.load('textures/matcaps/toasty-yellow.png')
const cheeseTexture = textureLoader.load('textures/matcaps/cheese.png')
const pinkTexture = textureLoader.load('textures/matcaps/pink.png')
const resumeTexture = textureLoader.load('textures/portfolioItems/resume-image.jpg')
const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
const yellowMaterial = new THREE.MeshMatcapMaterial({
    matcap: yellowTexture
})
const nameMaterial = new THREE.MeshMatcapMaterial({
    matcap: cheeseTexture
})
const pinkMaterial = new THREE.MeshMatcapMaterial({
    matcap: pinkTexture
})




/**
 * Physics
 */
const world = new CANNON.World()
world.broadphase = new CANNON.SAPBroadphase(world)
world.allowSleep = true
world.gravity.set(0, -28, 0)

// Default material
const defaultMaterial = new CANNON.Material('default')
const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
        friction: 0.1,
        restitution: 0.02
    }
)
world.defaultContactMaterial = defaultContactMaterial

// Floor
const floorShape = new CANNON.Plane()
const floorBody = new CANNON.Body()
floorBody.mass = 0
floorBody.addShape(floorShape)
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(- 1, 0, 0), Math.PI * 0.5)


/**
 * Utils
 */


// Create sphere
// const sphereGeometry = new THREE.SphereGeometry(1, 20, 20)
// const sphereMaterial = new THREE.MeshStandardMaterial({
//     metalness: 0.3,
//     roughness: 0.4,
//     // envMap: environmentMapTexture,
//     // envMapIntensity: 0.5
// })

// const createSphere = (radius, position) =>
// {
//     // Three.js mesh
//     const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
//     mesh.castShadow = true
//     mesh.scale.set(radius, radius, radius)
//     mesh.position.copy(position)
//     scene.add(mesh)

//     // Cannon.js body
//     const shape = new CANNON.Sphere(radius)

//     const body = new CANNON.Body({
//         mass: 1,
//         position: new CANNON.Vec3(0, 3, 0),
//         shape: shape,
//         material: defaultMaterial
//     })
//     body.position.copy(position)
//     body.addEventListener('collide', playHitSound)
//     world.addBody(body)

//     // Save in objects
//     cannonObjects.push({ mesh, body })
// }

// Create box



const createPedestal = (width, material, xOffset = 0) => {
    const mainPedestal = new THREE.Mesh(boxGeometry, material)
    mainPedestal.scale.set(width, 1000, width)
    mainPedestal.position.copy({ x: 0, y: -500, z: 0 })

    const pedestalShape = new CANNON.Box(new CANNON.Vec3(width/2, 500, width/2))
    const pedestalBody = new CANNON.Body({
        mass: 0,
        shape: pedestalShape,
        matieral: defaultMaterial
    })

    pedestalBody.position.copy({ x: 0, y: -500, z: 0 })


    scene.add(mainPedestal)
    world.addBody(pedestalBody)
}

createPedestal(20, yellowMaterial)




gltfLoader.load(
    '/models/cameron-whiteside.glb',
    (gltf) =>
    {
        let children = gltf.scene.children.slice()
        let text = children[0]
        console.log(text)
        text.scale.set(4.5, 4.5, 4.5)
        text.position.set(0, 2.9, 0)
        text.material = nameMaterial
        scene.add(text)

        let box = new THREE.Box3()
        box.setFromObject(text)
        console.log(box.min.x)
        let xSize = Math.abs(box.min.x - box.max.x)
        let ySize = Math.abs(box.min.y - box.max.y)
        let zSize = Math.abs(box.min.z - box.max.z)
        let xCenter = 0.5 * (box.min.x + box.max.x)
        let yCenter = 0.5 * (box.min.y + box.max.y)
        let zCenter = 0.5 * (box.min.z + box.max.z)
        // let zCenter = 3
        let position = {x: xCenter, y: yCenter, z: zCenter}
        console.log({ xSize, ySize, zSize, zCenter, yCenter, zCenter })
        const textShape = new CANNON.Box(new CANNON.Vec3(xSize/2, ySize/2, zSize/2))
        const textBody = new CANNON.Body({
            mass: 0,
            shape: textShape
        })

        textBody.position.copy(position)
        world.addBody(textBody)
        // cannonObjects.push({ mesh: text, body: textBody })
        // console.log(text)
        // const nameBox = new CANNON.Body()
    }
)

gltfLoader.load(
    '/models/extruded-tech-stack-ring.glb',
    (gltf) =>
    {
        console.log(gltf.scene.children.length)
        let techStack = gltf.scene.children[0]
        techStack.scale.set(300, 300, 300)
        techStack.position.set(0, -10, -20)
        techStack.material = nameMaterial
        scene.add(techStack)
        console.log(scene)
    }
)




const resumeScale = [8.5 / 2.5, 11/ 2.5, 0.1]

const createResume = () => {

    const resumeMaterial = new THREE.MeshBasicMaterial({ map: resumeTexture })
    const resume = new THREE.Mesh(boxGeometry, resumeMaterial)
    const height = 11/2.5
    const width = 8.5/2.5
    const depth = 0.1

    resume.scale.set(...resumeScale)
    // resumeMesh.castShadow = true
    const position =   {
                    x: (Math.random() - 0.5) * 10,
                    y: 100 * Math.random()+30,
                    z: (Math.random() - 0.5) * 10
    }

    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(new THREE.Vector3(Math.random(), Math.random(), Math.random()), Math.random())
    console.log(quaternion)

    // object.mesh.quaternion.copy(object.body.quaternion)
    resume.quaternion.copy(quaternion)
    resume.position.copy(position)

    const resumeShape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5))

    const resumeBody = new CANNON.Body({
        mass: 1,
        shape: resumeShape,
        material: defaultMaterial
    })

    resumeBody.position.copy(position)
    resumeBody.quaternion.copy(quaternion)
    resumeBody.addEventListener('collide', playHitSound)

    scene.add(resume)
    world.addBody(resumeBody)
    cannonObjects.push({ mesh: resume, body: resumeBody })
    raycasterObjects.push(resume)

}


const createBox = (width, height, depth, position, mass = 1, material = yellowMaterial) =>
{
    // Three.js mesh
    const mesh = new THREE.Mesh(boxGeometry, material)
    mesh.scale.set(width, height, depth)
    mesh.castShadow = true
    mesh.position.copy(position)
    scene.add(mesh)

    // Cannon.js body
    const shape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5))

    const body = new CANNON.Body({
        mass,
        shape: shape,
        material: defaultMaterial
    })
    body.position.copy(position)
    body.addEventListener('collide', playHitSound)
    world.addBody(body)

    // Save in objects
    cannonObjects.push({ mesh, body })
}


//pedestal
// createBox(20, 1000, 20, {x: 0, y: -500, z:0}, 0)
createBox(1, 1.5, 2, { x: 0, y: 3, z: 0 })

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, .98)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.800)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(80, sizes.width / sizes.height, 0.1, 1000)
camera.position.set(-5, 5, 22)
let pedastal1Origin = new THREE.Vector3(0, 0, 0)

gui.add(camera.position, 'x').min(-10).max(10).step(0.001)
gui.add(camera.position, 'y').min(-10).max(20).step(0.001)
gui.add(camera.position, 'z').min(-35).max(30).step(0.001)
let cameraFocusVector = pedastal1Origin

scene.add(camera)


const cursor = {
    x: 0,
    y: 0
}

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()


window.addEventListener('mousemove', (event) =>
{
    cursor.x = event.clientX / sizes.width - 0.5
    cursor.y = event.clientY / sizes.height - 0.5
    mouse.x = event.clientX / sizes.width * 2 - 1
    mouse.y = - event.clientY / sizes.height * 2 + 1
})


window.addEventListener('click', () => {
    if (currentIntersect) {
        let object = currentIntersect.object;

        const material = object.material.clone()
        const geometry = object.geometry.clone()
        const scale = object.scale.clone()
        const resumeMaterial = new THREE.MeshBasicMaterial({ map: resumeTexture })
        console.log(scale, resumeScale)
        console.log(scale.x, resumeScale[0])

        if (material.map === resumeMaterial.map && scale.x === resumeScale[0]) {
            const largeResume = new THREE.Mesh(boxGeometry, resumeMaterial)
            const height = 11 * 1.2
            const width = 8.5 * 1.2
            const depth = 0.1

            largeResume.scale.set(width, height, depth)

            const position = {
                x: 0,
                y: 3.5,
                z: 13
            }

            const quaternion = new THREE.Quaternion();
            quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/15)
            largeResume.quaternion.copy(quaternion)
            largeResume.position.copy(position)

            const resumeShape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5))
            const resumeBody = new CANNON.Body({
                mass: 0,
                shape: resumeShape,
                material: defaultMaterial
            })

            resumeBody.position.copy(position)
            resumeBody.quaternion.copy(quaternion)
            resumeBody.addEventListener('collide', playHitSound)

            scene.add(largeResume)
            focusedObject = { mesh: largeResume, body: resumeBody }
            world.addBody(resumeBody)
            cannonObjects.push({ mesh: largeResume, body: resumeBody })
            // raycasterObjects.push(largeResume)
        }
    } else {
            console.log(`test`)
            if (focusedObject) {
            console.log(`removin`)
            focusedObject.body.removeEventListener('collide', playHitSound)
            world.removeBody(focusedObject.body)
            // Remove mesh
            scene.remove(focusedObject.mesh)
        }

        }
  })



// Controls
// const controls = new OrbitControls(camera, canvas)
// controls.minDistance = 0;
// controls.maxDistance = 40;
// controls.maxPolarAngle = Math.PI/2;
// controls.minPolarAngle = Math.PI/4.5;
// controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()
let oldElapsedTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime


    camera.position.x = (cursor.x)*0.5
    camera.position.y = -(cursor.y)*0.5 + 6
    camera.lookAt(cameraFocusVector)

    raycaster.setFromCamera(mouse, camera)
    // let raycasterTests = console.log(cannonObjects.m)
    // const intersects = raycaster.intersectObjects(cannonObjects)

    // Update physics
    world.step(1 / 60, deltaTime, 3)

    for(const object of cannonObjects)
    {
        object.mesh.position.copy(object.body.position)
        object.mesh.quaternion.copy(object.body.quaternion)
        // object.material.color.set('#ff0000')
    }

    const intersects = raycaster.intersectObjects(raycasterObjects)
    // console.log(intersects.length)
    for (let object of raycasterObjects) {
        object.material.color.set('#ffffff')
    }


    if (intersects.length) {

        if (!currentIntersect) {
            currentIntersect = intersects[0]
        }

        for (let intersect of intersects) {
            if(intersect === intersects[0]) intersect.object.material.color.set('#ffeecc')
        }

    } else {
        if (currentIntersect) {
            currentIntersect = null
        }
    }

    // for (let object of cannonObjects) {
    // }

    // Update controls
    // controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
