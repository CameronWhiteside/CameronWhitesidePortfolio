import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import * as CANNON from 'cannon-es'
import { ColorKeyframeTrack, TextureDataType } from 'three'
import { BODY_SLEEP_STATES } from 'cannon-es'
import { generateUUID } from 'three/src/math/MathUtils'

/**
 * Debug
 */
const gui = new dat.GUI()
const debugObject = {}

debugObject.createSphere = () =>
{
    createSphere(
        Math.random() * 8,
        {
            x: 0,
            y: 9,
            z: 0
        }
    )
}

gui.add(debugObject, 'createSphere')

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
    for(const object of objectsToUpdate)
    {
        // Remove body
        object.body.removeEventListener('collide', playHitSound)
        world.removeBody(object.body)
        // Remove mesh
        scene.remove(object.mesh)
    }

    objectsToUpdate.splice(0, objectsToUpdate.length)
}
gui.add(debugObject, 'reset')

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

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
const resumeTexture = textureLoader.load('textures/portfolioItems/resume-image.jpg')


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
        restitution: 0.12
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
const objectsToUpdate = []

// Create sphere
const sphereGeometry = new THREE.SphereGeometry(1, 20, 20)
const sphereMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    // envMap: environmentMapTexture,
    // envMapIntensity: 0.5
})

const createSphere = (radius, position) =>
{
    // Three.js mesh
    const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
    mesh.castShadow = true
    mesh.scale.set(radius, radius, radius)
    mesh.position.copy(position)
    scene.add(mesh)

    // Cannon.js body
    const shape = new CANNON.Sphere(radius)

    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, 3, 0),
        shape: shape,
        material: defaultMaterial
    })
    body.position.copy(position)
    body.addEventListener('collide', playHitSound)
    world.addBody(body)

    // Save in objects
    objectsToUpdate.push({ mesh, body })
}

// Create box
const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
const yellowMaterial = new THREE.MeshMatcapMaterial({
    matcap: yellowTexture
})
const resumeMaterial = new THREE.MeshBasicMaterial({ map: resumeTexture })



const createPedestal = (width, material, xOffset = 0) => {
    const mainPedestal = new THREE.Mesh(boxGeometry, material)
    mainPedestal.scale.set(width, 1000, width)
    mainPedestal.receiveShadow = true
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


const createResume = () => {

    const resume = new THREE.Mesh(boxGeometry, resumeMaterial)
    const height = 11/4
    const width = 8.5/4
    const depth = 0.05

    resume.scale.set(width, height, depth)
    // resumeMesh.castShadow = true
    const position =   {
                    x: (Math.random() - 0.5) * 10,
                    y: 100 * Math.random()+30,
                    z: (Math.random() - 0.5) * 10
    }

    resume.position.copy(position)

    const resumeShape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5))
    const resumeBody = new CANNON.Body({
        mass: 1,
        shape: resumeShape,
        material: defaultMaterial
    })

    resumeBody.position.copy(position)
    resumeBody.addEventListener('collide', playHitSound)

    scene.add(resume)
    world.addBody(resumeBody)
    objectsToUpdate.push({ mesh: resume, body: resumeBody })

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
    objectsToUpdate.push({ mesh, body })
}


//pedestal
// createBox(20, 1000, 20, {x: 0, y: -500, z:0}, 0)
createBox(1, 1.5, 2, { x: 0, y: 3, z: 0 })

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, .58)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.57)
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
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000)
camera.position.set(5, 10, 5)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.minDistance = 0;
controls.maxDistance = 40;
controls.maxPolarAngle = Math.PI/2;
controls.minPolarAngle = Math.PI/4.5;
controls.enableDamping = true

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

    // Update physics
    world.step(1 / 60, deltaTime, 3)

    for(const object of objectsToUpdate)
    {
        object.mesh.position.copy(object.body.position)
        object.mesh.quaternion.copy(object.body.quaternion)
    }

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
