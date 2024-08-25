import React from 'react'
import * as THREE from 'three';
import { PostProcessMaterial } from './postProcess';

export interface IThreeCanvasProps {
    onResize?: (width: number, height: number) => void,
    onUpdate?: () => void,
    styles?: React.CSSProperties,
}

export enum EBufferType {
    Color = 'color',
    Normal = 'normal',
    WorldPosition = 'position',
    Output = 'output',
}

export const BufferTypeValues = Object.values(EBufferType);

export class ThreeCanvas extends React.Component<IThreeCanvasProps> {
    public canvas: React.RefObject<HTMLCanvasElement> = React.createRef();
    protected canvasContainer: React.RefObject<HTMLDivElement> = React.createRef();
    protected defaultCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000000000000);
    protected resizeTimer: NodeJS.Timer | null = null;
    protected buffers: {[T in EBufferType]: THREE.WebGLRenderTarget} = {
        [EBufferType.Color]: new THREE.WebGLRenderTarget(),
        [EBufferType.Normal]: new THREE.WebGLRenderTarget(),
        [EBufferType.WorldPosition]: new THREE.WebGLRenderTarget(),
        [EBufferType.Output]: new THREE.WebGLRenderTarget(),
    };
    
    public renderer: THREE.WebGLRenderer | null = null;
    public scene = new THREE.Scene();
    public camera: THREE.PerspectiveCamera = this.defaultCamera;
    public squareRenderCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, -1);
    public postProcessScene = new THREE.Scene();
    public postProcessSquare: THREE.Mesh;
    public postProcessMaterial = new PostProcessMaterial(this.buffers[EBufferType.Color]);

    constructor(props: IThreeCanvasProps) {
        super(props);
        const pos = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];
        const uv = [0, 0, 1, 0, 1, 1, 0, 1];
        const sqGeom = new THREE.BufferGeometry();
        sqGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
        sqGeom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
        sqGeom.setIndex([0, 1, 2, 0, 2, 3]);
        this.postProcessSquare = new THREE.Mesh(sqGeom, this.postProcessMaterial);
        this.postProcessScene.add(this.postProcessSquare);
    }

    protected onUpdate = () => {
        this.renderer?.setRenderTarget(this.buffers[EBufferType.Color]);
        this.renderer?.render(this.scene, this.camera);
        this.renderer?.setRenderTarget(null);
        this.renderer?.render(this.postProcessScene, this.squareRenderCamera);
        if (this.props.onUpdate) {
            this.props.onUpdate();
        }
        requestAnimationFrame(this.onUpdate);
    };

    protected onResize = () => {
        if (this.canvas.current && this.canvasContainer.current) {
            const width = this.canvasContainer.current.clientWidth;
            const height = this.canvasContainer.current.clientHeight;
            const size = new THREE.Vector2();
            this.renderer?.getSize(size);
            if (width !== size.width || height !== size.height) {
                this.defaultCamera.aspect = width / height;
                this.defaultCamera.updateProjectionMatrix();
                if (this.camera instanceof THREE.PerspectiveCamera && this.camera !== this.defaultCamera) {
                    this.camera.aspect = width / height;
                    this.camera.updateProjectionMatrix();
                }
                if (this.props.onResize) {
                    this.props.onResize(width, height);
                }
                this.renderer?.setSize(width, height);
                this.postProcessMaterial.uniforms.size.value = new THREE.Vector2(width, height);
                for (const bufferType of BufferTypeValues) {
                    this.buffers[bufferType].setSize(width, height);
                }
            }
        }
    };

    public componentDidMount(): void {
        if (this.canvas.current) {
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas.current,
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance',
                depth: true,
                logarithmicDepthBuffer: true,
            });
            this.renderer.setClearColor('#0E1130');
            requestAnimationFrame(this.onUpdate);
            this.resizeTimer = setInterval(this.onResize.bind(this), 100);
        }
    }

    public render() {
        return <div style={this.props.styles} ref={this.canvasContainer} onResize={this.onResize}>
            <canvas ref={this.canvas} onResize={this.onResize} style={{width: '100%', height: '100%', position: 'absolute', top: 0, left: 0}}/>
        </div>;
    }
}
