// The opening: a lattice of glass discs, drawn in one fragment shader. Where four discs touch, the space left
// between them is the star of the BRINJI wordmark; it lights the moment they meet. Scrolling pulls the camera back
// until the four are a field of circles with a star in every gap.
// Without WebGL, or when the visitor prefers reduced motion, the CSS picture underneath stays (four discs, one star).

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `
precision highp float;
uniform vec2 uRes, uC, uPtr;
uniform float uR, uT, uP, uIn, uFlash, uPtrOn, uLatOn;
uniform sampler2D uHero, uLat;

float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
vec3 sat(vec3 c,float s){ float l = dot(c,vec3(.299,.587,.114)); return mix(vec3(l),c,s); }

void main(){
  vec2 frag = gl_FragCoord.xy;
  float zp = smoothstep(.08,.80,uP);
  float zoom = mix(1.,.27,zp*zp*(3.-2.*zp));
  float cellPx = 2.*uR*zoom;
  vec2 q = (frag-uC)/cellPx;
  vec2 cell = floor(q);
  vec2 f = fract(q)-.5;
  float rad = .5*mix(.84,1.,uIn);
  float r = length(f);
  float aa = 1.25/cellPx;
  float disc = 1.-smoothstep(rad-aa,rad+aa,r);

  // the nearest corner: where a star lives
  vec2 cq = floor(q+.5);
  vec2 g = q-cq;
  float dc = length(g);
  float cring = max(abs(cq.x),abs(cq.y));
  float home = 1.-step(.5,cring);
  float wave = smoothstep(0.,1.,zp*7.5-cring*1.05);
  float lit = mix(wave,1.,home)*smoothstep(.93,1.,uIn);
  float tw = .86+.14*sin(uT*1.15+hash(cq+3.1)*6.2832);

  // the picture inside this disc
  vec2 cc = cell+.5;
  float ring = max(abs(cc.x),abs(cc.y))-.5;
  float rr = clamp(r/rad,0.,1.);
  vec2 uv = f/(2.*rad);
  float bulge = 1.-.14*rr*rr;
  vec2 par = uPtrOn*(uPtr-uC)/uRes.y*.03;
  float breathe = 1.+.012*sin(uT*.35+hash(cell)*6.2832);
  vec2 luv = uv*bulge*.93*breathe-par*(1.-rr*.6)+.5;
  luv = clamp(luv,.004,.996);
  vec3 pic; float show = 1.;
  if(ring<.5){
    vec2 tile = vec2(cell.x+1.,-cell.y);
    vec2 a = (tile+vec2(luv.x,1.-luv.y))*.5;
    pic = texture2D(uHero,vec2(a.x,1.-a.y)).rgb;
  }else{
    float idx = floor(fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453)*16.);
    vec2 tile = vec2(mod(idx,4.),floor(idx/4.));
    vec2 a = (tile+vec2(luv.x,1.-luv.y))*.25;
    vec3 raw = texture2D(uLat,vec2(a.x,1.-a.y)).rgb;
    float lum = dot(raw,vec3(.299,.587,.114));
    vec3 duo = mix(vec3(.0,.16,.15),vec3(.93,.84,.70),smoothstep(.02,.92,lum));
    pic = mix(duo,raw,.42)*uLatOn + vec3(.01,.2,.18)*(1.-uLatOn);
    show = smoothstep(0.,1.,zp*7.-ring*.95);
  }

  vec3 deep = vec3(.004,.102,.094);
  vec3 gold = vec3(.922,.824,.675);
  vec3 goldHot = vec3(1.,.93,.80);

  // glass: darker toward the rim, a breath of teal, and the star's light caught on the edge nearest to it
  vec3 d = pic*mix(1.,.46,smoothstep(.5,1.,rr));
  d = mix(d,d*vec3(.78,1.03,.99),.22);
  d *= mix(.9,.56,zp);
  float rim = smoothstep(rad-.05,rad-.004,r);
  float near = exp(-dc*dc*26.);
  d += gold*rim*near*lit*(.6+.8*uFlash)*tw;
  d += gold*exp(-dc*dc*9.)*lit*(.09+.4*uFlash);
  d += vec3(.6,.9,.85)*rim*.05;
  float pd = length(frag-uPtr)/uRes.y;
  float spot = uPtrOn*exp(-pd*pd*16.);
  d += d*spot*.55;
  d = mix(deep,d,show);

  // the gap: dark until the discs touch, then the star
  float heart = 1.-smoothstep(0.,.5,dc);
  float arm = pow(max(0.,1.-min(abs(g.x),abs(g.y))*9.),2.);
  vec3 starC = mix(gold*.86,goldHot,heart*.5+uFlash*.5)*(.80+.22*heart+.10*arm)*tw*(1.+.75*uFlash+.3*spot);
  vec3 gap = mix(vec3(.004,.135,.124),starC,lit);

  vec3 col = mix(gap,d,disc);
  col += goldHot*exp(-dc*dc*mix(70.,18.,uFlash))*lit*(.10+uFlash*.55)*(1.-disc*.5);
  vec2 v = (frag-.5*uRes)/uRes.y;
  col *= 1.-.42*dot(v,v);
  col += (hash(frag+fract(uT)*91.7)-.5)*.022;
  gl_FragColor = vec4(col,1.);
}`;

function load(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}

export async function start(hero) {
  const canvas = hero.querySelector('.hero-gl');
  const starEl = hero.querySelector('.hero-star');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return false;

  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) {
    console.warn('The opening falls back to its still picture:', e.message);
    return false;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const n of ['uRes', 'uC', 'uPtr', 'uR', 'uT', 'uP', 'uIn', 'uFlash', 'uPtrOn', 'uLatOn', 'uHero', 'uLat']) U[n] = gl.getUniformLocation(prog, n);

  const tex = (unit, img) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    if (img) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([1, 51, 47]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };

  // The four opening pictures are the ones the still picture underneath already shows (so they are downloaded once):
  // laid 2 × 2 on a canvas, they are the shader's texture. Each still is a disc on white; only the disc's box is drawn.
  const atlasFrom = async (urls, tile) => {
    const ims = await Promise.all(urls.map(load));
    const c = document.createElement('canvas');
    c.width = c.height = tile * 2;
    const g = c.getContext('2d');
    ims.forEach((im, i) => {
      const k = Math.min(im.naturalWidth, im.naturalHeight) * .985;
      g.drawImage(im, (im.naturalWidth - k) / 2, (im.naturalHeight - k) / 2, k, k, (i % 2) * tile, Math.floor(i / 2) * tile, tile, tile);
    });
    return c;
  };
  let atlas;
  try { atlas = await atlasFrom(hero.dataset.stills.split('|'), 720); } catch { return false; }
  const heroTex = tex(0, atlas);
  tex(1, null);
  gl.uniform1i(U.uHero, 0);
  gl.uniform1i(U.uLat, 1);
  let latOn = 0;
  const conn = navigator.connection;
  const slow = !!conn && (conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType || ''));
  const later = (fn, ms) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: ms }) : setTimeout(fn, ms));
  // the wall of circles is only seen after scrolling: fetch its pictures once the opening is on screen
  later(() => load(hero.dataset.lattice).then((im) => { tex(1, im); latOn = 1; dirty = true; hero.dispatchEvent(new Event('hero:draw')); }).catch(() => {}), 1800);
  // on a large sharp screen and a good connection, the same four pictures again at full size
  const sharpen = () => {
    if (slow || !hero.dataset.stillsHd || R * 2 < 860) return;
    atlasFrom(hero.dataset.stillsHd.split('|'), 1024).then((c) => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, heroTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, c);
      hero.dispatchEvent(new Event('hero:draw'));
    }).catch(() => {});
  };

  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 0;
  const size = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, r.width < 700 ? 2 : 1.75);
    W = Math.max(2, Math.round(r.width * dpr));
    H = Math.max(2, Math.round(r.height * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
    const s = starEl.getBoundingClientRect();
    cx = (s.left + s.width / 2 - r.left) * dpr;
    cy = H - (s.top + s.height / 2 - r.top) * dpr;
    R = (s.width / 2) * dpr;
    dirty = true;
  };

  let dirty = true, visible = true, t0 = performance.now(), intro = calm ? 1 : 0, flash = 0, touched = calm;
  let ptr = [0, 0], ptrOn = 0, ptrTarget = 0, ptrSm = [0, 0];
  const pin = hero.querySelector('.hero-pin');
  pin.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = canvas.getBoundingClientRect();
    ptr = [(e.clientX - r.left) * dpr, H - (e.clientY - r.top) * dpr];
    ptrTarget = 1;
  }, { passive: true });
  pin.addEventListener('pointerleave', () => { ptrTarget = 0; }, { passive: true });

  new ResizeObserver(size).observe(canvas);
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) loop(); }, { rootMargin: '80px' }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) loop(); });

  let raf = 0, last = performance.now();
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    const t = (now - t0) / 1000;
    if (!calm) {
      if (intro < 1) {
        intro = Math.min(1, intro + dt / 1.7);
        if (intro >= 1 && !touched) { touched = true; flash = 1; hero.classList.add('is-met'); }
      }
      flash *= Math.pow(.07, dt);
      ptrOn += (ptrTarget - ptrOn) * Math.min(1, dt * 5);
      ptrSm[0] += (ptr[0] - ptrSm[0]) * Math.min(1, dt * 7);
      ptrSm[1] += (ptr[1] - ptrSm[1]) * Math.min(1, dt * 7);
    }
    const e = 1 - Math.pow(1 - intro, 3);
    const p = parseFloat(hero.style.getPropertyValue('--p')) || 0;
    gl.uniform2f(U.uRes, W, H);
    gl.uniform2f(U.uC, cx, cy);
    gl.uniform2f(U.uPtr, ptrSm[0], ptrSm[1]);
    gl.uniform1f(U.uR, R);
    gl.uniform1f(U.uT, calm ? 0 : t);
    gl.uniform1f(U.uP, hero.classList.contains('is-flat') ? 0 : p);
    gl.uniform1f(U.uIn, e);
    gl.uniform1f(U.uFlash, flash);
    gl.uniform1f(U.uPtrOn, ptrOn);
    gl.uniform1f(U.uLatOn, latOn);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    dirty = false;
    if (!calm && visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  function loop() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  hero.addEventListener('hero:draw', loop);
  size();
  loop();
  requestAnimationFrame(() => hero.classList.add('is-live'));
  later(sharpen, 2500);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); hero.classList.remove('is-live'); });
  return true;
}
