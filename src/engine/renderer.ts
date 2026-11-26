import cosmos from '../shaders/cosmos.glsl?raw'
import { presets, type Level } from './quality'
import type { Frame } from './timeline'

// Stable content IDs select authored shader fields independently of chapter order.
const fieldIds = ['unknown', 'inflation', 'energy', 'nucleosynthesis', 'recombination',
  'dark-ages', 'cosmic-dawn', 'galaxies', 'cosmic-web', 'solar-system', 'earth', 'milky-way']
const vertexSource = 'attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}'
const fragmentSource = `precision highp float;
varying vec2 uv;
uniform int field;
uniform vec2 focus;
uniform float aspect, local, detail, alpha, zoom, ambient;
${cosmos}
void main(){
 vec2 pos = focus+(uv-focus)/zoom;
 vec3 colour=cosmos(field,pos,focus,aspect,local,detail);
 gl_FragColor=vec4(colour,alpha);
}`
function compile(gl: WebGLRenderingContext, kind: number, source: string) {
  const shader = gl.createShader(kind)!
  gl.shaderSource(shader, source); gl.compileShader(shader)
  return shader
}

export class CosmosRenderer {
  private gl: WebGLRenderingContext | null = null
  private program: WebGLProgram | null = null
  private triangle: WebGLBuffer | null = null
  private uniforms: Record<string, WebGLUniformLocation | null> = {}
  private ids: number[]
  private level: Level = 'Balanced'
  private portrait = false
  private aspect = 1
  draws = 0
  constructor(private canvas: HTMLCanvasElement, ids: string[], private invalidate: () => void) {
    this.ids = ids.map(id => Math.max(0, fieldIds.indexOf(id)))
    canvas.addEventListener('webglcontextlost', this.lost)
    canvas.addEventListener('webglcontextrestored', this.restore)
    this.init()
  }
  private init() {
    try {
      const gl = this.canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference:'low-power' })
      if (!gl) { this.fallback(); return }
      this.gl = gl
      const vert = compile(gl, gl.VERTEX_SHADER, vertexSource)
      const frag = compile(gl, gl.FRAGMENT_SHADER, fragmentSource)
      const program = gl.createProgram()!
      gl.attachShader(program, vert); gl.attachShader(program, frag); gl.linkProgram(program)
      const linked = gl.getProgramParameter(program, gl.LINK_STATUS)
      const failure = linked ? '' : gl.getShaderInfoLog(frag) || gl.getProgramInfoLog(program)
      gl.deleteShader(vert); gl.deleteShader(frag)
      if (!linked) { gl.deleteProgram(program); throw Error(failure || 'Shader linking failed') }
      this.program = program; gl.useProgram(program)
      this.triangle = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, this.triangle)
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW)
      const pos = gl.getAttribLocation(program,'position')
      gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0)
      for (const key of ['field','focus','aspect','local','detail','alpha','zoom','ambient']) this.uniforms[key] = gl.getUniformLocation(program,key)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      this.canvas.dataset.renderer = 'webgl'
      this.canvas.hidden = false
      this.resize(this.level)
    } catch (err) {
      console.warn('Cosmic graphics unavailable.',err)
      this.fallback()
    }
  }
  private fallback() { this.canvas.hidden = true; this.canvas.dataset.renderer = 'fallback'; this.draws = 0 }
  private lost = (event: Event) => { event.preventDefault(); this.program=null; this.fallback(); this.invalidate() }
  private restore = () => { this.init(); this.invalidate() }
  resize(level: Level) {
    this.level = level
    const gl = this.gl
    if (!gl || !this.program) return
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight
    if (w < 1 || h < 1) return
    const preset = presets[level]
    const ratio = Math.min(devicePixelRatio,preset.dpr, Math.sqrt(preset.pixels / (w*h)))
    this.canvas.width = Math.max(1,Math.round(w*ratio)); this.canvas.height = Math.max(1,Math.round(h*ratio))
    this.aspect = w/h; this.portrait = w<=750 && h>w
    gl.viewport(0,0,this.canvas.width,this.canvas.height)
    gl.uniform1f(this.uniforms.aspect,this.aspect); gl.uniform1f(this.uniforms.detail,preset.detail)
  }
  private pass(index:number, local:number, alpha:number, zoom:number) {
    const gl = this.gl!, u = this.uniforms
    gl.uniform1i(u.field,this.ids[index])
    gl.uniform2f(u.focus,this.portrait ? .53 : .59,this.portrait ? .58 : .54)
    gl.uniform1f(u.local,local); gl.uniform1f(u.alpha,alpha); gl.uniform1f(u.zoom,zoom)
    gl.drawArrays(gl.TRIANGLES,0,3)
  }
  render(frame:Frame, reduced:boolean, seconds:number) {
    const gl=this.gl
    this.draws=0
    if (!gl || !this.program || gl.isContextLost()) return
    const {index, local, mix} = frame
    gl.uniform1f(this.uniforms.ambient, reduced ? 0 : seconds)
    gl.disable(gl.BLEND)
    this.pass(index, reduced ? .55 : local,1,reduced ? 1 : 1+.14*mix)
    this.draws=1
    if (mix>0 && index+1<this.ids.length) {
      gl.enable(gl.BLEND)
      this.pass(index+1,reduced ? .55 : 0,mix,reduced ? 1 : .84+.16*mix)
      this.draws++
    }
  }
  dispose() {
    this.canvas.removeEventListener('webglcontextlost',this.lost)
    this.canvas.removeEventListener('webglcontextrestored',this.restore)
    if(this.gl){this.gl.deleteProgram(this.program);this.gl.deleteBuffer(this.triangle)}
  }
}
