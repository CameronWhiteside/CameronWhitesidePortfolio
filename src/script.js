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
import { gsap } from 'gsap'


const loadingBarElement = document.querySelector('.loading-bar')
let sceneReady = false
const loadingManager = new THREE.LoadingManager(
    // Loaded
    () =>
    {
        // Wait a little
        window.setTimeout(() =>
        {
            // Animate overlay
            gsap.to(overlayMaterial.uniforms.uAlpha, { duration: 3, value: 0, delay: 1 })

            // Update loadingBarElement
            loadingBarElement.classList.add('ended')
            loadingBarElement.style.transform = ''
        }, 500)

        window.setTimeout(() => {
            sceneReady = true
        }, 3000)
    },

    // Progress
    (itemUrl, itemsLoaded, itemsTotal) =>
    {
        // Calculate the progress and update the loadingBarElement
        const progressRatio = itemsLoaded / itemsTotal
        loadingBarElement.style.transform = `scaleX(${progressRatio})`
    }
)

/**
 * Debug
 */
// const gui = new dat.GUI()
// const debugObject = {}
const raycasterObjects = []
const cannonObjects = []
let focusedObject, currentIntersect



// debugObject.createBox = () =>
// {
//     createBox(
//         8.5/2,
//         11/2,
//         .1,
//         {
//             x: (Math.random() - 0.5) * 2,
//             y: 100 * Math.random(),
//             z: (Math.random() - 0.5) * 2
//         }
//     )
// }
// gui.add(debugObject, 'createBox')

// debugObject.createResume = () => { createResume() }
// gui.add(debugObject, 'createResume')

// Reset
const reset = () =>
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


/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()


const overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1)
const overlayMaterial = new THREE.ShaderMaterial({
    // wireframe: true,
    transparent: true,
    uniforms:
    {
        uAlpha: { value: 1 }
    },
    vertexShader: `
        void main()
        {
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uAlpha;

        void main()
        {
            gl_FragColor = vec4(0.584, 0.1254, 0.3137, uAlpha);
        }
    `
})
const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial)
scene.add(overlay)




const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')

const gltfLoader = new GLTFLoader(loadingManager)
gltfLoader.setDRACOLoader(dracoLoader)




/**
 * Sounds
 */
const hitSound = new Audio('/sounds/hit.mp3')

const playHitSound = (collision) =>
{
    const impactStrength = collision.contact.getImpactVelocityAlongNormal()

    if(impactStrength > 10)
    {
        hitSound.volume = Math.random()/10
        hitSound.currentTime = 0
        hitSound.play()
    }
}

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const yellowTexture = textureLoader.load('textures/matcaps/toasty-yellow.png')
const whiteTexture = textureLoader.load('textures/matcaps/whitematcap.png')
const blackTexture = textureLoader.load('textures/matcaps/black-1.png')
const cheeseTexture = textureLoader.load('textures/matcaps/cheese.png')
const chalkboardTexture = textureLoader.load('textures/matcaps/chalkboard.png')
const pinkTexture = textureLoader.load('textures/matcaps/pink.png')
const purpleTexture = textureLoader.load('textures/matcaps/purplestretch.png')
const orangeTexture = textureLoader.load('textures/matcaps/orangetoon.png')
const lightPinkTexture = textureLoader.load('textures/matcaps/lightpink.png')
const durpleTexture = textureLoader.load('textures/matcaps/durple.png')
const redTexture = textureLoader.load('textures/matcaps/red-plastic.png')
const resumeTexture = textureLoader.load('textures/portfolioItems/resume-image.jpg')
const blueTexture = textureLoader.load('textures/matcaps/blue.png')
const greenTexture = textureLoader.load('textures/matcaps/green.png')
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
const whiteMaterial = new THREE.MeshMatcapMaterial({
    matcap: whiteTexture
})

const blackMaterial = new THREE.MeshMatcapMaterial({
    matcap: blackTexture
})

const chalkboardMaterial = new THREE.MeshMatcapMaterial({
    matcap: chalkboardTexture
})

const orangeMaterial = new THREE.MeshMatcapMaterial({
    matcap: orangeTexture
})

const redMaterial = new THREE.MeshMatcapMaterial({
    matcap: redTexture
})
const blueMaterial = new THREE.MeshMatcapMaterial({
    matcap: blueTexture
})
const greenMaterial = new THREE.MeshMatcapMaterial({
    matcap: greenTexture
})

const durpleMaterial = new THREE.MeshMatcapMaterial({
    matcap: durpleTexture
})

const purpleMaterial = new THREE.MeshMatcapMaterial({
    matcap: purpleTexture
})

const lightPinkMaterial = new THREE.MeshMatcapMaterial({
    matcap: lightPinkTexture
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
        friction: 0.5,
        restitution: 0.05
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
    '/models/cameron-whiteside-new.glb',
    (gltf) =>
    {
        let children = gltf.scene.children.slice()
        // console.log(children.length)
        let text = children[1]
        // console.log(text)
        text.scale.set(150, 1, 150)
        text.position.set(0, 2.9, 0)
        text.material = chalkboardMaterial
        // console.log(text)
        scene.add(text)

        let box = new THREE.Box3()
        box.setFromObject(text)
        // console.log(box.min.x)
        let xSize = Math.abs(box.min.x - box.max.x)
        let ySize = Math.abs(box.min.y - box.max.y)
        let zSize = Math.abs(box.min.z - box.max.z)
        let xCenter = 0.5 * (box.min.x + box.max.x)
        let yCenter = 0.5 * (box.min.y + box.max.y)
        let zCenter = 0.5 * (box.min.z + box.max.z)
        // let zCenter = 3
        let position = {x: xCenter, y: yCenter, z: zCenter}
        // console.log({ xSize, ySize, zSize, zCenter, yCenter, zCenter })
        const textShape = new CANNON.Box(new CANNON.Vec3(xSize/2, ySize/2, zSize/2))
        const textBody = new CANNON.Body({
            mass: 0,
            shape: textShape
        })

        textBody.position.copy(position)
        world.addBody(textBody)
    }
)


let model

gltfLoader.load(
    '/models/extruded-tech-stack-ring.glb',
    (gltf) =>
    {
        // console.log(gltf.scene.children.length)
        let techStack = gltf.scene.children[0]
        techStack.scale.set(500, 200, 500)
        techStack.position.set(0, -7, -50)
        techStack.material = whiteMaterial
        model = techStack
        scene.add(model)
        // console.log(scene)
    }
)


let githubLink

gltfLoader.load(
    '/models/github.glb',
    (gltf) =>
    {
        console.log(gltf.scene.children.length)
        let techStack = gltf.scene.children[1]
        techStack.scale.set(50, 7, 50)
        techStack.position.set(-7, 13, -20)
        techStack.rotation.x = Math.PI/2
        techStack.material = greenMaterial
        githubLink = techStack
        raycasterObjects.push(githubLink)
        scene.add(githubLink)
        // console.log(scene)
    }
)

let linkedInLink

gltfLoader.load(
    '/models/linkedin.glb',
    (gltf) =>
    {
        console.log(gltf.scene.children.length)
        let techStack = gltf.scene.children[0]
        techStack.scale.set(50, 7, 50)
        techStack.position.set(7, 13, -20)
        techStack.rotation.x = Math.PI/2
        techStack.material = blueMaterial
        linkedInLink = techStack
        raycasterObjects.push(linkedInLink)
        scene.add(linkedInLink)
        // console.log(scene)
    }
)


let aboutText
//about text
gltfLoader.load(
    '/models/about-text.glb',
    (gltf) =>
    {
        // console.log(gltf.scene.children.length)
        let aboutTextObj = gltf.scene.children[1]
        aboutTextObj.scale.set(35, 35, 35)
        aboutTextObj.position.set(0, -2.5, 10.1)
        // weatherSign.rotation.x = -Math.PI / 20
        // weatherSign.rotation.z = -Math.PI / 20
        // weatherSign.rotation.y = -Math.PI/12
        aboutTextObj.material = durpleMaterial
        aboutText = aboutTextObj
        // raycasterObjects.push(aboutText)
        scene.add(aboutText)
        // console.log(scene)
    }
    )

let weatherSignBoard
gltfLoader.load(
    '/models/vertical-sign.glb',
    (gltf) =>
    {
        // console.log(gltf.scene.children.length)
        let weatherSign = gltf.scene.children[0]
        weatherSign.scale.set(.261, .261, .261)
        weatherSign.position.set(21, 0, -20)
        weatherSign.rotation.x = -Math.PI / 20
        weatherSign.rotation.z = -Math.PI / 20
        weatherSign.rotation.y = -Math.PI/12
        weatherSign.material = pinkMaterial
        weatherSignBoard = weatherSign
        raycasterObjects.push(weatherSignBoard)
        scene.add(weatherSignBoard)
        // console.log(scene)
    }
)


let groggoSignBoard

gltfLoader.load(
    '/models/vertical-sign.glb',
    (gltf) =>
    {
        // console.log(gltf.scene.children.length)
        let groggoSign = gltf.scene.children[0]
        groggoSign.scale.set(.201, .171, .201)
        groggoSign.position.set(-15, 3.5, -6.7)
        // gui.add(groggoSign.rotation, 'x').min(-2 * Math.PI).max(2 * Math.PI).step(0.01)
        // gui.add(groggoSign.rotation, 'y').min(-2 * Math.PI).max(2 * Math.PI).step(0.01)
        // gui.add(groggoSign.rotation, 'z').min(-2 * Math.PI).max(2 * Math.PI).step(0.01)
        groggoSign.rotation.x = -0.05
        groggoSign.rotation.y = 0.1
        groggoSign.rotation.z = 0.26
        groggoSign.material = orangeMaterial
        groggoSignBoard = groggoSign
        raycasterObjects.push(groggoSignBoard)
        scene.add(groggoSignBoard)
        // console.log(scene)
    }
)


let recipeopleSignBoard

gltfLoader.load(
    '/models/vertical-sign.glb',
    (gltf) =>
    {
        // console.log(gltf.scene.children.length)
        let recipeopleSign = gltf.scene.children[0]
        recipeopleSign.scale.set(.171, .101, .101)
        recipeopleSign.position.set(13, -1.5, 6)
        // gui.add(recipeopleSign.rotation, 'x').min(-2 * Math.PI).max(2 * Math.PI).step(0.01)
        // gui.add(recipeopleSign.rotation, 'y').min(-2 * Math.PI).max(2 * Math.PI).step(0.01)
        // gui.add(recipeopleSign.rotation, 'z').min(-2 * Math.PI).max(2 * Math.PI).step(0.01)
        recipeopleSign.rotation.x = -0.05
        recipeopleSign.rotation.y = -0.1
        recipeopleSign.rotation.z = -0.26
        recipeopleSign.material = lightPinkMaterial
        recipeopleSignBoard = recipeopleSign
        raycasterObjects.push(recipeopleSignBoard)
        scene.add(recipeopleSignBoard)
        // console.log(scene)
    }
)


let recipeopleSignWords


gltfLoader.load(
    '/models/recipeople-text.glb',
    (gltf) =>
    {
        // console.log(gltf.scene.children.length)
        let recipeopleSignText = gltf.scene
        recipeopleSignWords = recipeopleSignText
        recipeopleSignText.scale.set(1.601, 1.601, 1.601)
        recipeopleSignText.position.set(14.22, 3.2, 6.4)
        // gui.add(recipeopleSignText.rotation, 'x').min(-3).max(3).step(0.001)
        // gui.add(recipeopleSignText.rotation, 'y').min(-3).max(3).step(0.001)
        // gui.add(recipeopleSignText.rotation, 'z').min(-1).max(1).step(0.001)
        recipeopleSignText.rotation.x = 1.451
        recipeopleSignText.rotation.y = -0.27
        recipeopleSignText.rotation.z = 0.08
        recipeopleSignText.children.forEach(child => {
            child.material = whiteMaterial
        })

        scene.add(recipeopleSignWords)
        // console.log(scene)
    }
)

let oneTenSignBoard

gltfLoader.load(
    '/models/vertical-sign.glb',
    (gltf) =>
    {
        // console.log(gltf.scene.children.length)
        let oneTenSign = gltf.scene.children[0]
        oneTenSign.scale.set(.201, .061, .101)
        oneTenSign.position.set(-13, 0.5, 6)
        // gui.add(oneTenSign.rotation, 'x').min(-2 * Math.PI).max(2 * Math.PI).step(0.01)
        // gui.add(oneTenSign.rotation, 'y').min(-2 * Math.PI).max(2 * Math.PI).step(0.01)
        // gui.add(oneTenSign.rotation, 'z').min(-2 * Math.PI).max(2 * Math.PI).step(0.01)
        oneTenSign.rotation.x = -0.05
        oneTenSign.rotation.y = 0.1
        oneTenSign.rotation.z = 0.26
        oneTenSign.material = redMaterial
        oneTenSignBoard = oneTenSign
        raycasterObjects.push(oneTenSignBoard)
        scene.add(oneTenSignBoard)
        // console.log(scene)
    }
)


let oneTenSignWords


gltfLoader.load(
    '/models/one-ten-text.glb',
    (gltf) =>
    {
        // console.log(gltf.scene.children.length)
        let oneTenSignText = gltf.scene
        oneTenSignWords = oneTenSignText
        oneTenSignText.scale.set(1.301, 1.301, 1.301)
        oneTenSignText.position.set(-13.32, 3.2, 6.2)
        // gui.add(oneTenSignText.rotation, 'x').min(-3).max(3).step(0.001)
        // gui.add(oneTenSignText.rotation, 'y').min(-3).max(3).step(0.001)
        // gui.add(oneTenSignText.rotation, 'z').min(-1).max(1).step(0.001)
        oneTenSignText.rotation.x = 1.451
        oneTenSignText.rotation.y = 0.27
        oneTenSignText.rotation.z = -0.08
        oneTenSignText.children.forEach(child => {
            child.material = nameMaterial
        })

        scene.add(oneTenSignWords)
        // console.log(scene)
    }
)

let weatherSignWords


gltfLoader.load(
    '/models/raining-resume-text.glb',
    (gltf) =>
    {
        // console.log(gltf.scene.children.length)
        let weatherSignText = gltf.scene
        weatherSignWords = weatherSignText
        weatherSignText.scale.set(.008, 1.61, 1.61)
        weatherSignText.position.set(22.0, 10, -20)
        // gui.add(weatherSignText.rotation, 'x').min(-1).max(1).step(0.001)
        // gui.add(weatherSignText.rotation, 'y').min(-3).max(3).step(0.001)
        // gui.add(weatherSignText.rotation, 'z').min(-1).max(1).step(0.001)
        weatherSignText.rotation.x = .263
        weatherSignText.rotation.y = -2.015
        weatherSignText.rotation.z = 0.44
        weatherSignText.children.forEach(child => {
            child.material = nameMaterial
        })

        scene.add(weatherSignWords)
        // console.log(scene)
    }
)


let groggoSignWords


gltfLoader.load(
    '/models/dijkstra-text.glb',
    (gltf) =>
    {
        // console.log(gltf.scene.children.length)
        let groggoSignText = gltf.scene
        groggoSignWords = groggoSignText
        groggoSignText.scale.set(1.9, .01, 1.9)
        groggoSignText.position.set(-16.8, 10.2, -6.3)

        groggoSignText.rotation.x = 1.51
        groggoSignText.rotation.y = .271
        groggoSignText.rotation.z = -.08
        groggoSignText.children.forEach(child => {
        child.material = whiteMaterial
        })

        scene.add(groggoSignWords)
        // console.log(scene)
    }
    )





const resumeScale = [8.5 / 2.5, 11/ 2.5, 0.1]

const createResume = () => {

    const resumeMaterial = new THREE.MeshBasicMaterial({ map: resumeTexture })
    const resume = new THREE.Mesh(boxGeometry, resumeMaterial)
    const height = 11/2.5
    const width = 8.5/2.5
    const depth = 0.15

    resume.scale.set(...resumeScale)
    // resumeMesh.castShadow = true
    const position =   {
                    x: (Math.random() - 0.5) * 12,
                    y: 40,
                    z: (Math.random() - 0.5) * 8 + 2
    }

    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(new THREE.Vector3(Math.random(), Math.random(), Math.random()), Math.random())

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
    console.log(camera.aspect)
    camera.position.z = 40 - camera.aspect * 9
    camera.fov = 105 - window.innerWidth / window.innerHeight * 12
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera( 105 - window.innerWidth / window.innerHeight * 12, sizes.width / sizes.height, 0.1, 1000)
camera.position.set(-5, 6, 40 - window.innerWidth / window.innerHeight * 9)
camera.fov = 105 - window.innerWidth / window.innerHeight * 12
console.log(camera)
let pedastal1Origin = new THREE.Vector3(0, 3, 0)

// gui.add(camera.position, 'x').min(-10).max(10).step(0.001)
// gui.add(camera.position, 'y').min(-10).max(20).step(0.001)
// gui.add(camera.position, 'z').min(-35).max(30).step(0.001)
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


let groggoPop = document.getElementById('groggo')
groggoPop.addEventListener('click', (e)=> e.stopPropagation())
let onetotenPop = document.getElementById('onetoten')
onetotenPop.addEventListener('click', (e)=> e.stopPropagation())
let recipeoplePop = document.getElementById('recipeople')
recipeoplePop.addEventListener('click', (e) => e.stopPropagation())

window.addEventListener('click', () => {



    if (!focusedObject && currentIntersect) {

        if (currentIntersect.object === githubLink) {
            window.open('https://github.com/CameronWhiteside', '_blank')
        }

        if (currentIntersect.object === linkedInLink) {
            window.open('https://www.linkedin.com/in/cameronwhiteside/', '_blank')
        }

        if (currentIntersect.object === groggoSignBoard) {
            console.log('grog')
            focusedObject = groggoPop
            reset()
        }

        if (currentIntersect.object === recipeopleSignBoard) {
            focusedObject = recipeoplePop
            reset()
        }

        if (currentIntersect.object === oneTenSignBoard) {
            focusedObject = onetotenPop
            reset()
        }

        if (currentIntersect.object === weatherSignBoard) {
            for (let i = 0; i < 5; i++) {
                setTimeout(createResume, 100 * i)
            }
        }

        if (focusedObject) {
            focusedObject.classList.add('visible')
        }
    } else if (focusedObject) {
        focusedObject.classList.remove('visible')
        focusedObject = null
    }

    if (currentIntersect) {
        let object = currentIntersect.object;


        const material = object.material.clone()
        const scale = object.scale.clone()
        const resumeMaterial = new THREE.MeshBasicMaterial({ map: resumeTexture })

        if (material.map === resumeMaterial.map && scale.x === resumeScale[0]) {
            // console.log('lorp')
            window.open('https://drive.google.com/file/d/1s1uBYYcPuPqNzedr_LpXSohZyVJ6aMNv/view')
            // const largeResume = new THREE.Mesh(boxGeometry, resumeMaterial)
            // const height = 11 * 2.5
            // const width = 8.5 * 2.5
            // const depth = 0.1

            // largeResume.scale.set(width, height, depth)

            // const position = {
            //     x: 0,
            //     y: 3.5,
            //     z: 14
            // }

            // const quaternion = new THREE.Quaternion();
            // quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/15)
            // largeResume.quaternion.copy(quaternion)
            // largeResume.position.copy(position)

            // const resumeShape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5))
            // const resumeBody = new CANNON.Body({
            //     mass: 0,
            //     shape: resumeShape,
            //     material: defaultMaterial
            // })

            // resumeBody.position.copy(position)
            // resumeBody.quaternion.copy(quaternion)
            // resumeBody.addEventListener('collide', playHitSound)

            // scene.add(largeResume)
            // focusedObject = { mesh: largeResume, body: resumeBody }
            // world.addBody(resumeBody)
            // cannonObjects.push({ mesh: largeResume, body: resumeBody })
            // raycasterObjects.push(largeResume)
        }

    }
  })



// Controls
// const controls = new OrbitControls(camera, canvas)
// controls.minDistance = 16;
// controls.maxDistance = 35;
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
let prevTest = false

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    let resumeTest = (Math.floor(elapsedTime / 2 +  5) % 3 === 0)
    if (prevTest == false && resumeTest == true && !focusedObject) {
        // console.log('drop')
        createResume()
        prevTest = true
    } else {
        prevTest = resumeTest
    }

    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime
    if (model) {
        model.rotation.y = -elapsedTime/18
    }


    camera.position.x = (cursor.x)
    // camera.position.y = -(cursor.y) + 8
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
            if(intersect === intersects[0]) intersect.object.material.color.set('#eeddbb')
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
