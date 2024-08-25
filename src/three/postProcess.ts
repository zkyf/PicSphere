import * as THREE from 'three'

export class PostProcessMaterial extends THREE.ShaderMaterial {
    constructor(colorRt: THREE.WebGLRenderTarget) {
        super({
            vertexShader: `
            varying vec2 vUv;
            void main() {
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                vUv = uv;
            }`,
            fragmentShader: `
            varying vec2 vUv;
            uniform sampler2D colorTexture;
            uniform vec2 size;

            void main() {
                vec4 color = texture2D(colorTexture, vUv);
                gl_FragColor = color;
            }
            `,
            side: THREE.DoubleSide,
            uniforms: {
                colorTexture: {
                    value: colorRt.texture,
                },
                size: {
                    value: new THREE.Vector2(0, 0),
                }
            }
        })
    }
}