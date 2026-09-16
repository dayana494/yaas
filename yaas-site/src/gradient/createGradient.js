// Ported from gradient.js (root asset folder) — the WebGL2/WebGL1 shader,
// uniform wiring, bloom/vignette post pass and per-frame point animation are
// kept byte-for-byte identical to the original except for one addition: a
// separate u_pt_asp uniform (see its own comment at the gl.uniform1f call
// below) that fixes a white blowout on portrait/mobile aspect ratios
// without touching the desktop look. The only other changes are
// structural: it takes a <canvas> element and a config override directly
// instead of doing document.getElementById + an inline <script>, and it
// returns a controller so a React effect can tear it down on unmount
// (original had no stop path — it ran until the tab closed).

// Real desktop canvases here always sit comfortably above 1.5 (1366/768 =
// 1.78, 1440/900 = 1.6, ...), so this floor only ever engages on
// portrait/narrow-mobile widths — see u_pt_asp's own comment below for why.
// 0.75 was tried first and visibly wasn't enough: the point positions are
// still compressed into a narrow horizontal band at that ratio, so enough
// of the additive-blend layers still overlap to clip large areas to solid
// white. 1.5 (close to the desktop ratios the point config was actually
// tuned against) spreads the points out enough that the blowout is gone,
// verified on a 390x844 viewport across all 4 usage sites.
var MIN_PT_ASPECT = 1.5;

const DEFAULT_CFG = {
  bg: '#000000',
  pts: [
    { x: 0.4708003866328608, y: 0.9027061996303873, r: 0.6, a: 1, c: '#77BC29', s: 0, rt: 3.06, d: 0, rgb: 0 },
    { x: 1, y: 1, r: 1.1, a: 0.6, c: '#EFCC04', s: 0.6, rt: -2.44, d: 0, rgb: 0 },
    { x: 0.08175882831792165, y: 0.8260309367038479, r: 2.5, a: 1, c: '#D9325F', d: 0.2, rgb: 0, s: 0, rt: 0 },
    { x: 0.07746477138287818, y: 0.1510953564220184, r: 1, a: 1, c: '#0085C6', d: 0.2, rgb: 0, s: 0, rt: 0 },
    { x: 0.9139470623293476, y: 0.16881442893538384, r: 1, a: 1, c: '#F18221', d: 0.2, rgb: 0, s: 0, rt: 0 },
  ],
  speed: 0.6,
  flow: 0,
  noise: 0,
  hard: 1,
  gamma: 0.9,
  pulse: 0.4,
  spin: 0,
  distort: 0.3,
  globalDistort: true,
  mouse: 0.4,
  mouseActive: true,
  rgb: 0,
  globalRGB: true,
  blendMode: 1,
  grainSize: 0.5,
  banding: 0,
  bloom: 0,
  bloomThreshold: 1,
  vignette: 0,
  vignetteSoft: 0.2,
  contrast: 0.95,
  saturation: 1,
  temperature: 0,
  noiseDetail: 1,
};

function hex(h) {
  var i = parseInt(h.slice(1), 16);
  return [(i >> 16) & 255, (i >> 8) & 255, i & 255].map(function (x) {
    return x / 255;
  });
}

export function createGradient(cvs, overrides) {
  var cfg = Object.assign({}, DEFAULT_CFG, overrides || {});
  var stopped = false;
  var rafId = null;
  var observer = null;
  var sizeObserver = null;

  if (!cvs) return { stop: function () {} };

  var gl = cvs.getContext('webgl2', { alpha: false });
  var isGL2 = !!gl;
  if (!gl) gl = cvs.getContext('webgl', { alpha: false });
  if (!gl) return { stop: function () {} };

  var pp = null;
  function onContextLost(e) {
    e.preventDefault();
    gl = null;
    pp = null;
  }
  cvs.addEventListener('webglcontextlost', onContextLost);

  var vsSrc = isGL2
    ? '#version 300 es\nin vec2 position;out vec2 v_uv;void main(){v_uv=position*0.5+0.5;gl_Position=vec4(position,0.0,1.0);}'
    : 'attribute vec2 position;varying vec2 v_uv;void main(){v_uv=position*0.5+0.5;gl_Position=vec4(position,0.0,1.0);}';
  var fsSrc = isGL2
    ? '#version 300 es\nprecision highp float; uniform float u_time;uniform vec2 u_res;uniform vec3 u_bg;uniform float u_hard; uniform float u_flow;uniform float u_pulse_amp;uniform float u_spin;uniform float u_banding; uniform float u_gamma;uniform float u_global_rgb;uniform float u_global_distort; uniform vec2 u_mouse;uniform float u_mouse_force; uniform int u_blend_mode;uniform vec4 u_pts[8];uniform vec3 u_cols[8]; uniform vec3 u_pt_params[8];uniform float u_pt_rot[8]; uniform bool u_use_global_distort;uniform bool u_use_global_rgb; uniform int u_count;uniform int u_noise_detail;uniform float u_pt_asp; in vec2 v_uv;out vec4 fragColor; vec3 mod289v(vec3 x){return x-floor(x*(1.0/289.0))*289.0;} vec4 mod289v(vec4 x){return x-floor(x*(1.0/289.0))*289.0;} vec4 permute(vec4 x){return mod289v(((x*34.0)+10.0)*x);} vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;} float snoise(vec3 v){ const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0); vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx); vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy); vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy; i=mod289v(i); vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0)); float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_); vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y); vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw); vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0)); vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww; vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w); vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w; vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m; return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3))); } float fbm(vec3 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){if(i>=u_noise_detail)break;v+=a*snoise(p);p*=2.0;a*=0.5;}return v;} float rand(vec2 n){return fract(sin(dot(n,vec2(12.9898,4.1414)))*43758.5453);} vec3 getLayer(vec2 uv,float chOff){ float asp=u_pt_asp;uv.x*=asp;vec2 ctr=vec2(0.5*asp,0.5); float s=sin(u_spin*u_time),c=cos(u_spin*u_time);mat2 rot=mat2(c,-s,s,c);uv-=ctr;uv*=rot;uv+=ctr; if(length(u_mouse)>0.0&&u_mouse_force!=0.0){vec2 m=u_mouse;m.x*=asp;float md=distance(uv,m);uv+=(uv-m)*(0.1*u_mouse_force/(md+0.05));} vec3 accCol=vec3(0.0);float accW=0.0; for(int i=0;i<8;i++){if(i<u_count){ vec4 pt=u_pts[i];vec3 col=u_cols[i];vec3 par=u_pt_params[i];float ang=u_pt_rot[i]; float dS=u_use_global_distort?u_global_distort:par.x;float rgbS=u_use_global_rgb?u_global_rgb:par.y;float str=par.z; vec2 lUV=uv;lUV+=vec2(chOff*rgbS,0.0); if(dS>0.0){float n=u_noise_detail>1?fbm(vec3(lUV*3.0,u_time*0.2)):snoise(vec3(lUV*3.0,u_time*0.2));lUV+=n*dS*0.3;} vec2 pos=pt.xy;pos.x*=asp;float sa=sin(ang),ca=cos(ang);mat2 pR=mat2(ca,sa,-sa,ca); vec2 dV=lUV-pos;dV=pR*dV;dV.y/=(1.0-str*0.9); float pulse=sin(u_time*(1.0+float(i)*0.2))*u_pulse_amp;float d=length(dV);float r=pt.z+pulse; float w=max(0.0,1.0-d/(r+0.01));w=pow(w,u_hard); if(u_banding>0.5){w=floor(w*u_banding)/u_banding;}w*=pt.w; if(u_blend_mode==1){accCol+=col*w;}else{accCol+=col*w;accW+=w;} }} if(u_blend_mode==1)return u_bg+accCol; if(accW>0.001)return mix(u_bg,accCol/accW,clamp(accW,0.0,1.0));return u_bg; } void main(){ vec2 uv=gl_FragCoord.xy/u_res; float r=getLayer(uv,-1.0).r;float g=getLayer(uv,0.0).g;float b=getLayer(uv,1.0).b; vec3 col=pow(vec3(r,g,b),vec3(1.0/u_gamma)); fragColor=vec4(col,1.0); }'
    : 'precision mediump float; uniform float u_time; uniform vec2 u_res; uniform vec3 u_bg; uniform float u_noise; uniform float u_grain_size; uniform float u_hard; uniform float u_flow; uniform float u_pulse_amp; uniform float u_spin; uniform float u_banding; uniform float u_gamma; uniform float u_global_rgb; uniform float u_global_distort; uniform vec2 u_mouse; uniform float u_mouse_force; uniform int u_blend_mode; uniform vec4 u_pts[8]; uniform vec3 u_cols[8]; uniform vec3 u_pt_params[8]; uniform float u_pt_rot[8]; uniform bool u_use_global_distort; uniform bool u_use_global_rgb; uniform int u_count; uniform float u_pt_asp; varying vec2 v_uv; float rand(vec2 n) { return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); } float noise(vec2 p){ vec2 ip = floor(p); vec2 u = fract(p); u = u*u*(3.0-2.0*u); float res = mix(mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x), mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x), u.y); return res*res; } vec3 getLayer(vec2 uv, float channelOffset) { float aspect=u_pt_asp; uv.x*=aspect; vec2 center=vec2(0.5*aspect,0.5); float s=sin(u_spin*u_time),c=cos(u_spin*u_time); mat2 rot=mat2(c,-s,s,c); uv-=center; uv*=rot; uv+=center; if(length(u_mouse)>0.0 && u_mouse_force!=0.0){ vec2 m=u_mouse; m.x*=aspect; float md=distance(uv,m); uv+=(uv-m)*(0.1*u_mouse_force/(md+0.05)); } vec3 accCol=vec3(0.0); float accW=0.0; for(int i=0;i<8;i++){ if(i<u_count){ vec4 pt=u_pts[i]; vec3 col=u_cols[i]; vec3 params=u_pt_params[i]; float angle=u_pt_rot[i]; float dStr = u_use_global_distort ? u_global_distort : params.x; float rgbStr = u_use_global_rgb ? u_global_rgb : params.y; float stretch = params.z; vec2 localUV = uv; localUV += vec2(channelOffset * rgbStr, 0.0); if(dStr > 0.0) { float n = noise(localUV * 3.0 + u_time * 0.2); localUV += (n - 0.5) * dStr * 0.3; } vec2 pos=pt.xy; pos.x*=aspect; float sa=sin(angle), ca=cos(angle); mat2 ptRot = mat2(ca, sa, -sa, ca); vec2 dVec = localUV - pos; dVec = ptRot * dVec; dVec.y /= (1.0 - stretch * 0.9); float pulse=sin(u_time*(1.0+float(i)*0.2))*u_pulse_amp; float d=length(dVec); float r=pt.z+pulse; float w=max(0.0,1.0-d/(r+0.01)); w=pow(w,u_hard); if (u_banding > 0.5) { w = floor(w * u_banding) / u_banding; } w*=pt.w; if (u_blend_mode == 1) { accCol += col * w; } else { accCol += col * w; accW += w; } }} if (u_blend_mode == 1) return u_bg + accCol; else { if(accW>0.001) return mix(u_bg, accCol/accW, clamp(accW,0.0,1.0)); return u_bg; } } void main(){ vec2 uv = gl_FragCoord.xy / u_res; float vig = 1.0 - smoothstep(0.5, 1.5, length(uv - 0.5)); float r = getLayer(uv, -1.0).r; float g = getLayer(uv, 0.0).g; float b = getLayer(uv, 1.0).b; vec3 final = vec3(r,g,b); final = pow(final, vec3(1.0/u_gamma)); final *= vig; float grainVal = (rand(v_uv * (u_res/u_grain_size) + u_time) - 0.5) * u_noise; gl_FragColor=vec4(final+grainVal,1.0); }';

  var prog = gl.createProgram();
  var cs = function (type, src) {
    var x = gl.createShader(type);
    gl.shaderSource(x, src);
    gl.compileShader(x);
    if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) {
      gl.deleteShader(x);
      return null;
    }
    return x;
  };
  var vs = cs(gl.VERTEX_SHADER, vsSrc),
    fs = cs(gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return { stop: function () {} };
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return { stop: function () {} };
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  gl.useProgram(prog);
  var u = {};
  var uNames = [
    'u_time', 'u_res', 'u_bg', 'u_noise', 'u_grain_size', 'u_hard', 'u_flow', 'u_pulse_amp', 'u_spin',
    'u_banding', 'u_mouse', 'u_mouse_force', 'u_gamma', 'u_global_distort', 'u_global_rgb',
    'u_use_global_distort', 'u_use_global_rgb', 'u_blend_mode', 'u_pts', 'u_cols', 'u_pt_params', 'u_pt_rot', 'u_count',
    'u_pt_asp',
  ];
  if (isGL2) uNames.push('u_noise_detail');
  uNames.forEach(function (n) {
    u[n] = gl.getUniformLocation(prog, n);
  });
  var posLoc = gl.getAttribLocation(prog, 'position');

  function mkFBO(w, h, useF) {
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    var tx = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tx);
    var fmt = useF ? gl.RGBA16F : gl.RGBA8;
    var tp = useF ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt, w, h, 0, gl.RGBA, tp, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tx, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb: fb, tex: tx, w: w, h: h };
  }
  function mkPProg(fSrc) {
    var p2 = gl.createProgram();
    var v2 = cs(
      gl.VERTEX_SHADER,
      '#version 300 es\nin vec2 position;out vec2 v_uv;void main(){v_uv=position*0.5+0.5;gl_Position=vec4(position,0.0,1.0);}'
    );
    var f2 = cs(gl.FRAGMENT_SHADER, fSrc);
    if (!v2 || !f2) return null;
    gl.attachShader(p2, v2);
    gl.attachShader(p2, f2);
    gl.linkProgram(p2);
    if (!gl.getProgramParameter(p2, gl.LINK_STATUS)) return null;
    return p2;
  }
  function drawQ(p2) {
    var loc = gl.getAttribLocation(p2, 'position');
    gl.enableVertexAttribArray(loc);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  if (isGL2) {
    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('EXT_color_buffer_half_float');
    var iw = cvs.clientWidth || 800,
      ih = cvs.clientHeight || 600;
    var hw = Math.max(1, iw >> 1),
      hh = Math.max(1, ih >> 1);
    pp = { sceneFBO: mkFBO(iw, ih, true), halfA: mkFBO(hw, hh, true), halfB: mkFBO(hw, hh, true) };
    pp.brightProg = mkPProg(
      '#version 300 es\nprecision highp float; uniform sampler2D u_tex;uniform float u_threshold;in vec2 v_uv;out vec4 fragColor; void main(){vec3 c=texture(u_tex,v_uv).rgb;float br=dot(c,vec3(0.2126,0.7152,0.0722));fragColor=vec4(c*clamp((br-u_threshold)/(1.0-u_threshold+0.001),0.0,1.0),1.0);}'
    );
    pp.blurProg = mkPProg(
      '#version 300 es\nprecision highp float; uniform sampler2D u_tex;uniform vec2 u_dir;in vec2 v_uv;out vec4 fragColor; void main(){vec3 c=vec3(0.0);float w[5]=float[](0.227027,0.1945946,0.1216216,0.054054,0.016216);c+=texture(u_tex,v_uv).rgb*w[0];for(int i=1;i<5;i++){vec2 o=u_dir*float(i)*2.0;c+=texture(u_tex,v_uv+o).rgb*w[i];c+=texture(u_tex,v_uv-o).rgb*w[i];}fragColor=vec4(c,1.0);}'
    );
    pp.compositeProg = mkPProg(
      '#version 300 es\nprecision highp float; uniform sampler2D u_scene;uniform sampler2D u_bloom_tex; uniform float u_bloom_intensity;uniform float u_vignette;uniform float u_vignette_soft; uniform float u_contrast;uniform float u_saturation;uniform float u_temperature; uniform float u_noise_amount;uniform float u_grain_size;uniform float u_time;uniform vec2 u_res; in vec2 v_uv;out vec4 fragColor; float rand(vec2 n){return fract(sin(dot(n,vec2(12.9898,4.1414)))*43758.5453);} void main(){ vec3 sc=texture(u_scene,v_uv).rgb;vec3 bl=texture(u_bloom_tex,v_uv).rgb; vec3 c=sc+bl*u_bloom_intensity; float d=length(v_uv-0.5);float vig=1.0-smoothstep(u_vignette_soft*0.5,1.5,d);c*=mix(1.0,vig,u_vignette); c=(c-0.5)*u_contrast+0.5; float lm=dot(c,vec3(0.2126,0.7152,0.0722));c=mix(vec3(lm),c,u_saturation); c.r+=u_temperature*0.1;c.b-=u_temperature*0.1; c+=((rand(v_uv*(u_res/u_grain_size)+u_time)-0.5)*u_noise_amount); fragColor=vec4(clamp(c,0.0,1.0),1.0); }'
    );
    if (pp.brightProg && pp.blurProg && pp.compositeProg) {
      pp.bL = { u_tex: gl.getUniformLocation(pp.brightProg, 'u_tex'), u_threshold: gl.getUniformLocation(pp.brightProg, 'u_threshold') };
      pp.blL = { u_tex: gl.getUniformLocation(pp.blurProg, 'u_tex'), u_dir: gl.getUniformLocation(pp.blurProg, 'u_dir') };
      var cp = pp.compositeProg;
      pp.cL = {};
      ['u_scene', 'u_bloom_tex', 'u_bloom_intensity', 'u_vignette', 'u_vignette_soft', 'u_contrast', 'u_saturation', 'u_temperature', 'u_noise_amount', 'u_grain_size', 'u_time', 'u_res'].forEach(
        function (n) {
          pp.cL[n] = gl.getUniformLocation(cp, n);
        }
      );
      var eT = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, eT);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      pp.emptyTex = eT;
    } else {
      pp = null;
    }
  }
  var t = 0,
    m = { x: -1, y: -1 };
  function onMouseMove(e) {
    var r = cvs.getBoundingClientRect();
    if (r.width && r.height) {
      m.x = (e.clientX - r.left) / r.width;
      m.y = 1.0 - (e.clientY - r.top) / r.height;
      // The cursor is the other input the output depends on, so a move is a
      // reason to draw — the only one left, now that the loop no longer draws
      // unprompted. Setting a flag rather than drawing here also coalesces a
      // burst of pointer events down to one frame.
      requestRender();
    }
  }
  if (cfg.mouseActive) window.addEventListener('mousemove', onMouseMove);

  // This canvas used to redraw as fast as the display allowed, forever, for as
  // long as the page was open. The limits below cut that down to the frames
  // that actually differ from the one already on screen. None of them changes
  // what it looks like.
  //
  // The big one is that this shader is usually not animating at all. Its clock
  // only advances by cfg.speed (see the t += line in f()), and the preset this
  // site ships — dsgnmax.ru_19544_config.json — sets speed to 0. Everything
  // time-based in the shader is driven off that clock, so with it frozen the
  // output depends on exactly two things: the cursor and the canvas size.
  // Between changes to those, the loop was reproducing a pixel-identical image
  // ~60 times a second. So it now renders on demand and stops in between, and
  // only keeps itself running frame after frame when the clock really moves.
  var isAnimated = cfg.speed !== 0;
  var needsRender = true;

  // A ceiling for the animated case, not a target. This is a slow drifting
  // backdrop; nothing in its motion is resolved by 60 samples a second and lost
  // at 30. Halving the frame count does not halve its speed — see the t += line
  // below, which now advances by elapsed time.
  var MAX_FPS = 30;
  var MIN_FRAME_MS = 1000 / MAX_FPS;
  var lastFrameMs = 0;
  var prevMs = 0;

  var isVisible = typeof document === 'undefined' || !document.hidden;
  var isOnScreen = true;
  function isRunningNow() {
    return isVisible && isOnScreen;
  }
  function resume() {
    if (stopped || rafId != null) return;
    // Re-baseline the clock so time spent paused is not handed to the animation
    // in one step, which would make the gradient jump on the way back.
    prevMs = 0;
    rafId = requestAnimationFrame(f);
  }
  function pause() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }
  function requestRender() {
    needsRender = true;
    if (isRunningNow()) resume();
  }

  // Backgrounded tab. The browser already throttles rAF hard here, but stopping
  // outright makes it deterministic rather than up to the throttle, and leaves
  // nothing running behind another window.
  function onVisibilityChange() {
    isVisible = !document.hidden;
    if (isRunningNow()) resume();
    else pause();
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        isOnScreen = entry.isIntersecting;
        if (isRunningNow()) resume();
        else pause();
      });
    });
    observer.observe(cvs);
  }

  // f() used to notice a size change by re-reading clientWidth every frame,
  // which only works while it runs every frame. Now that it stops, the size has
  // to announce itself.
  if (typeof ResizeObserver !== 'undefined') {
    sizeObserver = new ResizeObserver(function () {
      requestRender();
    });
    sizeObserver.observe(cvs);
    if (cvs.parentNode) sizeObserver.observe(cvs.parentNode);
  } else {
    window.addEventListener('resize', requestRender);
  }

  function f(nowMs) {
    rafId = null;
    if (stopped || !isRunningNow() || !gl) return;

    // Nothing has changed since the last frame and the clock is not moving, so
    // stop. requestRender() starts it up again once the cursor or the size
    // gives it something new to draw.
    if (!isAnimated && !needsRender) return;

    if (isAnimated && nowMs - lastFrameMs < MIN_FRAME_MS - 0.5) {
      rafId = requestAnimationFrame(f);
      return;
    }

    // Advance by elapsed time rather than a fixed step per drawn frame. The old
    // fixed step tied the drift speed to how often this happened to run, so a
    // frame cap would have slowed it down (and a 120Hz display was already
    // running it at double speed). Normalising to a 60fps step keeps the speed
    // exactly what it has always been on a 60Hz screen, at any frame rate.
    // Clamped so a long stall resumes smoothly instead of lurching.
    var dtMs = prevMs ? Math.min(nowMs - prevMs, 4 * MIN_FRAME_MS) : 1000 / 60;
    prevMs = nowMs;
    lastFrameMs = nowMs;
    needsRender = false;
    t += 0.01 * cfg.speed * (dtMs / (1000 / 60));
    var w = cvs.clientWidth || cvs.parentNode.clientWidth,
      h = cvs.clientHeight || cvs.parentNode.clientHeight;
    if (cvs.width !== w || cvs.height !== h) {
      cvs.width = w;
      cvs.height = h;
      gl.viewport(0, 0, w, h);
      if (pp) {
        var d = function (o) {
          gl.deleteTexture(o.tex);
          gl.deleteFramebuffer(o.fb);
        };
        d(pp.sceneFBO);
        d(pp.halfA);
        d(pp.halfB);
        pp.sceneFBO = mkFBO(w, h, true);
        var hw2 = Math.max(1, w >> 1),
          hh2 = Math.max(1, h >> 1);
        pp.halfA = mkFBO(hw2, hh2, true);
        pp.halfB = mkFBO(hw2, hh2, true);
      }
    }
    if (pp) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, pp.sceneFBO.fb);
      gl.viewport(0, 0, pp.sceneFBO.w, pp.sceneFBO.h);
    }
    gl.useProgram(prog);
    gl.enableVertexAttribArray(posLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(u.u_time, t);
    gl.uniform2f(u.u_res, w, h);
    // u_res.x/u_res.y (the real canvas aspect) drives both the pixel->uv
    // mapping (gl_FragCoord/u_res, needs the real value) *and*, inside
    // getLayer(), the horizontal stretch used to keep circular points round
    // regardless of aspect ratio (uv.x*=asp, pos.x*=asp) — which effectively
    // measures each point's radius in units of screen *height*. The point
    // config (r up to ~2.5) was tuned against a landscape canvas, where
    // height is the smaller dimension; on a portrait mobile screen height
    // becomes the *larger* dimension, so those same radii blow up into a
    // white/blown-out mess. u_pt_asp is that same ratio but floored so it
    // never drops below MIN_PT_ASPECT — real desktop ratios (always >1,
    // landscape) never hit the floor, so this doesn't touch the desktop
    // look at all; only portrait/narrow canvases get the point math
    // computed against a less-extreme effective aspect.
    gl.uniform1f(u.u_pt_asp, Math.max(w / h, MIN_PT_ASPECT));
    gl.uniform1f(u.u_noise, pp ? 0.0 : cfg.noise);
    gl.uniform1f(u.u_grain_size, cfg.grainSize);
    gl.uniform1f(u.u_hard, cfg.hard);
    gl.uniform1f(u.u_flow, cfg.flow);
    gl.uniform1f(u.u_pulse_amp, cfg.pulse);
    gl.uniform1f(u.u_spin, cfg.spin);
    gl.uniform1f(u.u_banding, cfg.banding || 0.0);
    gl.uniform1f(u.u_global_distort, cfg.distort);
    gl.uniform1i(u.u_use_global_distort, cfg.globalDistort ? 1 : 0);
    gl.uniform1f(u.u_global_rgb, cfg.rgb);
    gl.uniform1i(u.u_use_global_rgb, cfg.globalRGB ? 1 : 0);
    gl.uniform1i(u.u_blend_mode, cfg.blendMode);
    gl.uniform1f(u.u_mouse_force, cfg.mouseActive ? cfg.mouse : 0.0);
    gl.uniform2f(u.u_mouse, m.x, m.y);
    gl.uniform1f(u.u_gamma, cfg.gamma);
    if (isGL2 && u.u_noise_detail !== null) gl.uniform1i(u.u_noise_detail, cfg.noiseDetail || 1);
    var bg = hex(cfg.bg);
    gl.uniform3f(u.u_bg, bg[0], bg[1], bg[2]);
    var fP = [],
      fC = [],
      fPar = [],
      fRot = [];
    cfg.pts.forEach(function (pt, i) {
      var mx = Math.sin(t * 0.5 + i) * 0.1 + Math.sin(t * 0.2) * cfg.flow;
      var my = Math.cos(t * 0.3 + i) * 0.1;
      fP.push(pt.x + mx, 1.0 - (pt.y + my), pt.r, pt.a);
      var c = hex(pt.c);
      fC.push(c[0], c[1], c[2]);
      fPar.push(pt.d || 0.0, pt.rgb || 0.0, pt.s || 0.0);
      fRot.push(pt.rt || 0.0);
    });
    for (var i = cfg.pts.length; i < 8; i++) {
      fP.push(0, 0, 0, 0);
      fC.push(0, 0, 0);
      fPar.push(0, 0, 0);
      fRot.push(0);
    }
    gl.uniform4fv(u.u_pts, new Float32Array(fP));
    gl.uniform3fv(u.u_cols, new Float32Array(fC));
    gl.uniform3fv(u.u_pt_params, new Float32Array(fPar));
    gl.uniform1fv(u.u_pt_rot, new Float32Array(fRot));
    gl.uniform1i(u.u_count, cfg.pts.length);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (pp) {
      var hasB = cfg.bloom > 0;
      if (hasB) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, pp.halfA.fb);
        gl.viewport(0, 0, pp.halfA.w, pp.halfA.h);
        gl.useProgram(pp.brightProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, pp.sceneFBO.tex);
        gl.uniform1i(pp.bL.u_tex, 0);
        gl.uniform1f(pp.bL.u_threshold, cfg.bloomThreshold);
        drawQ(pp.brightProg);
        gl.bindFramebuffer(gl.FRAMEBUFFER, pp.halfB.fb);
        gl.viewport(0, 0, pp.halfB.w, pp.halfB.h);
        gl.useProgram(pp.blurProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, pp.halfA.tex);
        gl.uniform1i(pp.blL.u_tex, 0);
        gl.uniform2f(pp.blL.u_dir, 1.0 / pp.halfB.w, 0.0);
        drawQ(pp.blurProg);
        gl.bindFramebuffer(gl.FRAMEBUFFER, pp.halfA.fb);
        gl.viewport(0, 0, pp.halfA.w, pp.halfA.h);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, pp.halfB.tex);
        gl.uniform1i(pp.blL.u_tex, 0);
        gl.uniform2f(pp.blL.u_dir, 0.0, 1.0 / pp.halfA.h);
        drawQ(pp.blurProg);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(pp.compositeProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, pp.sceneFBO.tex);
      gl.uniform1i(pp.cL.u_scene, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, hasB ? pp.halfA.tex : pp.emptyTex);
      gl.uniform1i(pp.cL.u_bloom_tex, 1);
      gl.uniform1f(pp.cL.u_bloom_intensity, cfg.bloom);
      gl.uniform1f(pp.cL.u_vignette, cfg.vignette);
      gl.uniform1f(pp.cL.u_vignette_soft, cfg.vignetteSoft);
      gl.uniform1f(pp.cL.u_contrast, cfg.contrast);
      gl.uniform1f(pp.cL.u_saturation, cfg.saturation);
      gl.uniform1f(pp.cL.u_temperature, cfg.temperature);
      gl.uniform1f(pp.cL.u_noise_amount, cfg.noise);
      gl.uniform1f(pp.cL.u_grain_size, cfg.grainSize || 1.0);
      gl.uniform1f(pp.cL.u_time, t);
      gl.uniform2f(pp.cL.u_res, w, h);
      drawQ(pp.compositeProg);
    }
    rafId = requestAnimationFrame(f);
  }
  rafId = requestAnimationFrame(f);

  return {
    stop: function () {
      stopped = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
      if (cfg.mouseActive) window.removeEventListener('mousemove', onMouseMove);
      if (sizeObserver) sizeObserver.disconnect();
      else window.removeEventListener('resize', requestRender);
      if (observer) observer.disconnect();
      cvs.removeEventListener('webglcontextlost', onContextLost);
    },
  };
}
