/* pile.js — the hero: a close view of terry pile that the visitor can brush.

   Two passes, WebGL 1 (it runs on every phone that has a GPU):
   1. the nap field — a texture at a third of the canvas size holding, per texel, the direction the loops lean.
      A pointer stroke writes its direction into the texels under it; every few frames every texel steps back toward
      "no lean" by a fixed amount (a fixed step, not a multiply: an 8-bit texture would stall a multiply short of zero).
   2. the cloth — every pixel finds its nearest loop on a jittered grid (3 × 3 cells), lights it as a soft nub whose top
      shifts and tilts the way the nap says, and lays one broad drape of light over the whole cloth. A brushed patch's
      loops all lean one way, so it catches the light differently — the stroke a finger leaves on velvet.
   Without WebGL, or if the context is lost, the still image under the canvas stays. Reduced motion: no demo stroke;
   brushing still answers the visitor's own hand (it is direct manipulation, not motion). */
(() => {
  const host = document.querySelector('[data-pile]');
  if (!host) return;
  const canvas = host.querySelector('canvas');
  const hero = host.closest('.hero');
  const data = JSON.parse(document.getElementById('site-data').textContent);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rtl = document.documentElement.dir === 'rtl';
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false,
    premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
  if (!gl) return;

  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const FIELD = `precision highp float;varying vec2 v;
uniform sampler2D prev;uniform vec2 res,a,b,dir;uniform float rad,on,relax;
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-4),0.,1.);return length(pa-ba*h);}
void main(){
  vec2 n=texture2D(prev,v).rg*2.-1.;
  float l=length(n); if(l>0.){n*=max(l-relax,0.)/l;}
  if(on>.5){float d=seg(v*res,a,b);float w=1.-smoothstep(rad*.2,rad,d);n=mix(n,dir,w*.9);}
  gl_FragColor=vec4(n*.5+.5,0.,1.);
}`;
  const CLOTH = `precision highp float;varying vec2 v;
uniform sampler2D nap;uniform vec2 res,light;uniform float cell;uniform vec3 albedo;
vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return fract(sin(p)*43758.5453);}
float h1(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 px=v*res;
  vec2 lean0=texture2D(nap,v).rg*2.-1.;
  vec2 g=px/cell;vec2 id=floor(g);vec2 f=fract(g);
  float ws=0.;vec3 na=vec3(0.);float fa=0.;
  for(int j=-1;j<=1;j++){for(int i=-1;i<=1;i++){
    vec2 o=vec2(float(i),float(j));vec2 cid=id+o;vec2 hh=h2(cid);
    vec2 c=o+.5+(hh-.5)*.78;
    vec2 rl=(h2(cid+19.7)-.5)*1.1;
    vec2 lean=rl*.5+lean0*.8;
    vec2 q=f-c-lean*.17;
    float r=.66+hh.x*.2;
    float d2=dot(q,q)/(r*r);
    float ring=1.-abs(sqrt(d2)-.32)*1.65;
    float ht=mix(1.-d2,ring,.45)+hh.y*.25;
    float w=exp(ht*7.);
    vec2 gr=-2.*q/(r*r);
    na+=w*normalize(vec3(-gr*.42+rl*.375+lean0*.3,1.));
    fa+=w*sin(atan(q.y,q.x)*3.+hh.x*30.+sqrt(d2)*9.);
    ws+=w;
  }}
  float best=log(ws)/7.-.16;vec3 nr=normalize(na);float fib=fa/ws;
  vec2 k1=vec2(.0026,.0014),k2=vec2(-.0016,.0035);
  vec2 dg=cos(dot(px,k1)+.6)*k1*1.0+cos(dot(px,k2)+2.1)*k2*.8;
  vec3 L=normalize(vec3(light,.85));
  float diff=max(dot(nr,L),0.);
  float rim=pow(1.-nr.z,1.6);
  float cover=smoothstep(-.4,.75,best);
  float drape=1.+dot(dg*190.,light)*.55;
  float bl0=length(lean0);
  float brush=bl0*.34+dot(lean0,light)*.06;   // a brushed patch catches the light — a sheen, never a smudge
  vec3 alb=pow(albedo,vec3(2.2))*1.26;
  vec3 col=alb*(.42+.80*diff)*mix(.4,1.,cover);
  col+=alb*rim*(.22+bl0*.6)+vec3(.04+bl0*.05)*rim;
  col*=drape*(1.+brush);
  col*=1.+fib*.035*cover;
  col*=.94+.12*h1(floor(px));
  gl_FragColor=vec4(pow(max(col,0.),vec3(1./2.2)),1.);
}`;

  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function prog(fs) {
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  }
  let field, cloth;
  try { field = prog(FIELD); cloth = prog(CLOTH); } catch (e) { console.warn('pile: shader', e); return; }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  let W = 0, H = 0, FW = 0, FH = 0, dpr = 1, targets = [], cur = 0;
  function tex(w, h) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const px = new Uint8Array(w * h * 4); for (let i = 0; i < px.length; i += 4) { px[i] = 128; px[i + 1] = 128; px[i + 3] = 255; }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { t, fb };
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, r.width < 700 ? 1.5 : 1.75);
    W = Math.max(2, Math.round(r.width * dpr)); H = Math.max(2, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H;
    FW = Math.max(2, Math.round(r.width / 3)); FH = Math.max(2, Math.round(r.height / 3));
    targets.forEach(x => { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.fb); });
    targets = [tex(FW, FH), tex(FW, FH)]; cur = 0;
    kick();
  }

  // ── colour ──
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const sw = data.swatches || [];
  let col = hex(sw[0] ? sw[0].hex : '#E9E2D6'), from = col.slice(), to = col.slice(), colT = 1;
  function setSwatch(s, btn) {
    from = col.slice(); to = hex(s.hex); colT = 0;
    const tone = s.dark ? 'dark' : 'light';
    hero.dataset.tone = tone; document.body.dataset.tone = tone;
    host.parentElement.querySelectorAll('.sw').forEach(b => {
      const on = b === btn; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1;
    });
    kick();
  }
  const btns = [...hero.querySelectorAll('.sw')];
  btns.forEach((b, i) => {
    b.tabIndex = i === 0 ? 0 : -1;
    b.addEventListener('click', () => setSwatch(sw[i], b));
    b.addEventListener('keydown', e => {
      const fwd = rtl ? 'ArrowLeft' : 'ArrowRight', back = rtl ? 'ArrowRight' : 'ArrowLeft';
      let j = null;
      if (e.key === fwd || e.key === 'ArrowDown') j = (i + 1) % btns.length;
      if (e.key === back || e.key === 'ArrowUp') j = (i - 1 + btns.length) % btns.length;
      if (j !== null) { e.preventDefault(); btns[j].focus(); setSwatch(sw[j], btns[j]); }
    });
  });

  // ── strokes ──
  const queue = [];
  let last = null, lastT = 0, active = 0;
  function local(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * FW, (1 - (e.clientY - r.top) / r.height) * FH];
  }
  function stroke(a, b, strength) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    if (l < 0.25) return;
    queue.push({ a, b, dir: [dx / l * strength, dy / l * strength] });
    active = performance.now(); kick();
  }
  canvas.addEventListener('pointermove', e => {
    const p = local(e);
    // a pause longer than a hand's step starts a new stroke: a mouse that leaves and comes back never draws the jump
    if (e.timeStamp - lastT > 120) last = null;
    lastT = e.timeStamp;
    if (last) {
      const sp = Math.hypot(p[0] - last[0], p[1] - last[1]);
      stroke(last, p, Math.min(1, 0.45 + sp / 14));
    }
    last = p; demo = null;
  }, { passive: true });
  ['pointerleave', 'pointercancel', 'pointerup'].forEach(t => canvas.addEventListener(t, () => { last = null; }));

  // the demo stroke: an arch, the loop of the n, drawn once across the open side of the cloth
  let demo = null;
  function startDemo() {
    if (reduce) return;
    const side = rtl ? 0.08 : 0.5;
    demo = { t0: performance.now() + 700, dur: 2100, prev: null, side };
    kick();
  }
  function demoPoint(u, side) {
    const t = u * Math.PI;                                     // an arch: up one leg, over, down the other
    const x = side + 0.06 + 0.36 * (0.5 - 0.5 * Math.cos(t));
    const y = 0.30 + 0.34 * Math.sin(t);
    return [x * FW, y * FH];
  }

  // ── frame ──
  let raf = 0, visible = true, frame = 0, restUntil = 0;
  function kick() { if (!raf && visible) raf = requestAnimationFrame(draw); }
  function draw(now) {
    raf = 0;
    if (demo && now >= demo.t0) {
      const u = Math.min(1, (now - demo.t0) / demo.dur);
      const e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const p = demoPoint(e, demo.side);
      if (demo.prev) stroke(demo.prev, p, 0.95);
      demo.prev = p;
      if (u >= 1) demo = null;
    }
    if (colT < 1) {
      colT = Math.min(1, colT + 1 / 36);
      const k = colT * colT * (3 - 2 * colT);
      col = from.map((v, i) => v + (to[i] - v) * k);
    }
    // field passes: every queued stroke, then the relax step every 5th frame
    gl.useProgram(field.p);
    gl.uniform2f(field.u.res, FW, FH);
    gl.uniform1f(field.u.rad, Math.max(9, 34 / 3));
    gl.viewport(0, 0, FW, FH);
    const jobs = queue.splice(0, 24);
    const relaxNow = frame % 6 === 0;
    if (!jobs.length) jobs.push(null);
    jobs.forEach((j, idx) => {
      const src = targets[cur], dst = targets[1 - cur];
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.t);
      gl.uniform1i(field.u.prev, 0);
      gl.uniform1f(field.u.on, j ? 1 : 0);
      gl.uniform1f(field.u.relax, relaxNow && idx === 0 ? 0.012 : 0);
      if (j) { gl.uniform2f(field.u.a, j.a[0], j.a[1]); gl.uniform2f(field.u.b, j.b[0], j.b[1]); gl.uniform2f(field.u.dir, j.dir[0], j.dir[1]); }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      cur = 1 - cur;
    });
    // cloth
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(cloth.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, targets[cur].t);
    gl.uniform1i(cloth.u.nap, 0);
    gl.uniform2f(cloth.u.res, W, H);
    gl.uniform2f(cloth.u.light, -0.55, 0.62);
    gl.uniform1f(cloth.u.cell, 7.2 * dpr);
    gl.uniform3f(cloth.u.albedo, col[0], col[1], col[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    frame++;
    if (frame === 2) host.classList.add('is-live');
    // keep going while anything moves: a stroke in the last 9 s is still relaxing back
    if (queue.length || demo || colT < 1 || now - active < 11000) kick();
  }

  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); host.classList.remove('is-live'); cancelAnimationFrame(raf); raf = 0; });
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(hero);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) kick(); });
  let rt = 0;
  new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(resize, 120); }).observe(canvas);
  resize();
  startDemo();
})();
