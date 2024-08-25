import * as React from "react";
import * as THREE from "three";
import { createRoot } from 'react-dom/client';
import { ThreeCanvas } from "./three/ThreeCanvas";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

class SpriteMaterial extends THREE.ShaderMaterial {
    constructor() {
        super({
            vertexShader: `
            varying vec2 vUv;
            uniform sampler2D colorTexture;
            uniform float ratio;
            const float EPSILON = 1e-10;

            vec3 RGBtoHCV(in vec3 rgb)
            {
                // RGB [0..1] to Hue-Chroma-Value [0..1]
                // Based on work by Sam Hocevar and Emil Persson
                vec4 p = (rgb.g < rgb.b) ? vec4(rgb.bg, -1., 2. / 3.) : vec4(rgb.gb, 0., -1. / 3.);
                vec4 q = (rgb.r < p.x) ? vec4(p.xyw, rgb.r) : vec4(rgb.r, p.yzx);
                float c = q.x - min(q.w, q.y);
                float h = abs((q.w - q.y) / (6. * c + EPSILON) + q.z);
                return vec3(h, c, q.x);
            }

            vec3 RGBtoHSV(in vec3 rgb)
            {
                // RGB [0..1] to Hue-Saturation-Value [0..1]
                vec3 hcv = RGBtoHCV(rgb);
                float s = hcv.y / (hcv.z + EPSILON);
                return vec3(hcv.x, s, hcv.z);
            }

            vec3 RGBtoHSL(in vec3 rgb)
            {
                // RGB [0..1] to Hue-Saturation-Lightness [0..1]
                vec3 hcv = RGBtoHCV(rgb);
                float z = hcv.z - hcv.y * 0.5;
                float s = hcv.y / (1. - abs(z * 2. - 1.) + EPSILON);
                return vec3(hcv.x, s, z);
            }

            vec3 SRGBtoRGB(vec3 srgb) {
                // See http://chilliant.blogspot.co.uk/2012/08/srgb-approximations-for-hlsl.html
                // This is a better approximation than the common "pow(rgb, 2.2)"
                return pow(srgb, vec3(2.1632601288));
            }

            void main() {
                vec3 color = texture2D(colorTexture, uv).rgb;
                vec3 hsl = RGBtoHSL(color);
                float h = (hsl.z - 0.5) * 2.0;
                float r = sqrt(1.0 - h * h);
                vec3 hslPos = vec3(cos(hsl.x * 3.1415926 * 2.0) * r * hsl.y, h, sin(hsl.x * 3.1415926 * 2.0) * r * hsl.y) * 10.0;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(hslPos, 1.0) + vec4(position.x, position.y * ratio, position.z, 0.0);
                vUv = uv;
            }`,
            fragmentShader: `
            varying vec2 vUv;
            uniform sampler2D colorTexture;

            void main() {
                vec4 color = texture2D(colorTexture, vUv);
                gl_FragColor = color;
            }
            `,
            side: THREE.DoubleSide,
            uniforms: {
                colorTexture: {
                    value: new THREE.Texture(),
                },
                ratio: {
                    value: 1.0,
                }
            },
            depthTest: true,
            depthWrite: true,
        })
    }
}

const spriteMaterial = new SpriteMaterial();

class App extends React.Component {
    protected canvas = React.createRef<ThreeCanvas>();
    protected scene: THREE.Scene | undefined = undefined;
    protected camera: THREE.Camera | undefined = undefined;
    protected sphere = new THREE.Mesh(
        new THREE.SphereGeometry(10, 12, 12),
        new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: "#888888", wireframe: true }),
    );
    protected points = new THREE.Group();
    protected control: OrbitControls | undefined = undefined;

    constructor(props: {}) {
        super(props);
    }

    public componentDidMount(): void {
        if (this.canvas.current?.canvas.current) {
            this.scene = this.canvas.current.scene;
            this.scene.add(this.sphere);
            this.scene.add(this.points);
            this.camera = this.canvas.current.camera;
            this.camera.position.set(0, 0, 30);
            this.control = new OrbitControls(this.camera, this.canvas.current.canvas.current);
            for (let i = 0; i < 10000; i++) {
                const spriteGeometry = new THREE.PlaneGeometry(0.2, 0.2);
                const u = Math.random();
                const v = Math.random();
                spriteGeometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([u, v, u, v, u, v, u, v]), 2, false));
                const point = new THREE.Mesh(spriteGeometry, spriteMaterial);
                this.points.add(point);
            }
        }
    }

    protected loadImage = () => {
        const loader = document.createElement("input");
        loader.setAttribute("type", "file");
        loader.setAttribute("accept", "image/png, image/jpeg");
        loader.onchange = () => {
            if (!loader.files) {
                return;
            }
            const file = loader.files[0];
            const fileReader = new FileReader();
            fileReader.onload = (e) => {
                const data = e.target?.result;
                if (data) {
                    const map = new THREE.TextureLoader().load(data.toString());
                    map.magFilter = THREE.NearestFilter;
                    spriteMaterial.uniforms.colorTexture.value = map;
                    spriteMaterial.needsUpdate = true;
                }
            }
            fileReader.readAsDataURL(file);
        }
        loader.click();
    };

    onResize = (width: number, height: number) => {
        spriteMaterial.uniforms.ratio.value = width / height;
    };

    public render() {
        return <div style={{ width: '100%', height: '100%', top: 0, left: 0, position: 'absolute', display: "flex", flexDirection: "column"}}>
            <div id="menu" style={{ display: "flex", height: "30px", flexGrow: 0}}>
                <button onClick={this.loadImage}>Open Image</button>
            </div>
            <div style={{ display: "flex", flexGrow: 1, width: '100%', height: '100%'}}>
                <ThreeCanvas ref={this.canvas} styles={{ width: '100%', height: '100%', transform: "translate(0, 0)"}} onResize={this.onResize}/>
            </div>
        </div>;
    }
}

const domElement = document.getElementById('app');
if (domElement) {
    const root = createRoot(domElement);
    root.render(<App></App>);
}