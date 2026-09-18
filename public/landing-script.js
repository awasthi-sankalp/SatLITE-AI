
'use strict';
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (window.gsap && window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);

const MockData = {
  stages: [
    { idx:'01', title:'Input Validation', tags:[['GeoTIFF / TIFF','opt'],['Modality check','sar'],['Co-registration','agt']],
      body:'Checks the number of images, sensor modality, file format, and whether a pair is spatially co-registered before anything downstream runs. Malformed or incompatible inputs are rejected here, not after a specialist model fails silently.' },
    { idx:'02', title:'Query Understanding', tags:[['Task classification','agt'],['Intent parsing','agt']],
      body:'The natural-language query is classified into one of the supported task families — captioning, VQA, grounding, change analysis, or cross-modal fusion — which determines every routing decision that follows.' },
    { idx:'03', title:'Model Registry Selection', tags:[['RS-VQA','opt'],['Change-VQA','agt'],['Fusion Net','sar']],
      body:'Given the task and the input configuration, the controller selects one or more specialist models from a predefined registry and configures only the parameters that task permits — no manual model picking required.' },
    { idx:'04', title:'Specialist Execution', tags:[['Inference','opt'],['Bi-temporal','agt'],['Optical + SAR','sar']],
      body:'The selected specialist(s) run against the validated input. For paired analysis, outputs from multiple models are computed in the same pass so they can be reconciled together in the next step.' },
    { idx:'05', title:'Evidence Synthesis', tags:[['Confidence score','agt'],['Visual evidence','opt'],['Execution log','sar']],
      body:'Textual and spatial outputs are combined into a single evidence-grounded response, with a confidence estimate and an auditable execution summary — the task, the models used, and the parameters applied.' }
  ]
};

(function heroScene(){
  const canvas = document.getElementById('hero-canvas');
  if(!canvas) return;
  let hasWebGL = true;
  try {
    const test = document.createElement('canvas');
    hasWebGL = !!(window.WebGLRenderingContext && (test.getContext('webgl') || test.getContext('experimental-webgl')));
  } catch(e){ hasWebGL = false; }

  if (!hasWebGL || !window.THREE) {
    const fb = document.getElementById('heroFallback');
    if(fb) fb.style.display = 'block';
    canvas.style.display = 'none';
    return;
  }

  const scene = new window.THREE.Scene();
  const camera = new window.THREE.PerspectiveCamera(48, window.innerWidth/window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.4, 7.2);
  const renderer = new window.THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const isMobile = window.innerWidth < 760;

  const core = new window.THREE.Group();
  const shellDefs = [
    { r:0.62, color:0x57e8c9, wire:true },
    { r:0.9,  color:0xf2a65a, wire:true },
    { r:1.2,  color:0x9c8cf5, wire:true }
  ];
  const shells = shellDefs.map(d => {
    const geo = new window.THREE.IcosahedronGeometry(d.r, 1);
    const mat = new window.THREE.MeshBasicMaterial({ color:d.color, wireframe:true, transparent:true, opacity:0.55 });
    const mesh = new window.THREE.Mesh(geo, mat);
    core.add(mesh);
    return mesh;
  });
  const centerGeo = new window.THREE.SphereGeometry(0.34, 32, 32);
  const centerMat = new window.THREE.MeshBasicMaterial({ color:0xe7ecf2, transparent:true, opacity:0.9 });
  const centerSphere = new window.THREE.Mesh(centerGeo, centerMat);
  core.add(centerSphere);
  scene.add(core);

  const ringGeo = new window.THREE.RingGeometry(2.05, 2.07, 128);
  const ringMat = new window.THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.12, side:window.THREE.DoubleSide });
  const ring = new window.THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI/2.3;
  scene.add(ring);

  const satGeo = new window.THREE.OctahedronGeometry(0.06);
  const satMat = new window.THREE.MeshBasicMaterial({ color:0x57e8c9 });
  const sat = new window.THREE.Mesh(satGeo, satMat);
  scene.add(sat);

  const pCount = isMobile ? 260 : 700;
  const pGeo = new window.THREE.BufferGeometry();
  const positions = new Float32Array(pCount*3);
  for (let i=0;i<pCount;i++){
    const r = 3 + Math.random()*5;
    const theta = Math.random()*Math.PI*2;
    const phi = Math.acos((Math.random()*2)-1);
    positions[i*3] = r*Math.sin(phi)*Math.cos(theta);
    positions[i*3+1] = r*Math.sin(phi)*Math.sin(theta)*0.6;
    positions[i*3+2] = r*Math.cos(phi);
  }
  pGeo.setAttribute('position', new window.THREE.BufferAttribute(positions,3));
  const pMat = new window.THREE.PointsMaterial({ color:0x8a93a3, size:0.02, transparent:true, opacity:0.5 });
  const particles = new window.THREE.Points(pGeo, pMat);
  scene.add(particles);

  let mouseX = 0, mouseY = 0, targetRotX = 0, targetRotY = 0;
  window.addEventListener('mousemove', (e)=>{
    mouseX = (e.clientX/window.innerWidth - 0.5);
    mouseY = (e.clientY/window.innerHeight - 0.5);
  }, { passive:true });
  window.addEventListener('touchmove', (e)=>{
    if(!e.touches[0]) return;
    mouseX = (e.touches[0].clientX/window.innerWidth - 0.5);
    mouseY = (e.touches[0].clientY/window.innerHeight - 0.5);
  }, { passive:true });

  let exploded = false;
  canvas.addEventListener('click', ()=>{
    exploded = !exploded;
    const dist = exploded ? 1 : 0;
    shells.forEach((s,i)=>{
      window.gsap.to(s.position, { z: dist*(i+1)*0.5, duration:0.9, ease:'power3.out' });
      window.gsap.to(s.scale, { x:1+dist*0.35*(i+1), y:1+dist*0.35*(i+1), z:1+dist*0.35*(i+1), duration:0.9, ease:'power3.out' });
    });
    window.gsap.to(camera.position, { z: exploded ? 5.6 : 7.2, duration:1, ease:'power3.inOut' });
  });
  canvas.style.cursor = 'pointer';

  let angle = 0;
  const clock = new window.THREE.Clock();
  let visible = true;
  document.addEventListener('visibilitychange', ()=>{ visible = !document.hidden; });

  function animate(){
    requestAnimationFrame(animate);
    if (!visible) return;
    const dt = clock.getDelta();
    const speed = REDUCED_MOTION ? 0.15 : 1;
    angle += dt*0.35*speed;
    core.rotation.y += dt*0.12*speed;
    core.rotation.x = Math.sin(angle*0.3)*0.08;
    shells.forEach((s,i)=>{ s.rotation.x += dt*(0.05+i*0.03)*speed; s.rotation.y -= dt*(0.04+i*0.02)*speed; });

    sat.position.set(Math.cos(angle)*2.06, Math.sin(angle*0.4)*0.4, Math.sin(angle)*2.06*Math.cos(1.15));
    particles.rotation.y += dt*0.01*speed;

    targetRotX += (mouseY*0.4 - targetRotX)*0.04;
    targetRotY += (mouseX*0.5 - targetRotY)*0.04;
    camera.position.x = targetRotY*1.4;
    camera.position.y = 0.4 - targetRotX*1.1;
    camera.lookAt(0,0,0);

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();

if (window.gsap) {
  window.gsap.timeline({ delay:0.2 })
    .to('#h-eyebrow', { opacity:1, y:0, duration:0.6 })
    .fromTo('#h-title', {opacity:0,y:20}, { opacity:1, y:0, duration:0.8 }, '-=0.3')
    .fromTo('#h-sub', {opacity:0,y:16}, { opacity:1, y:0, duration:0.7 }, '-=0.4')
    .fromTo('#h-cta', {opacity:0,y:14}, { opacity:1, y:0, duration:0.6 }, '-=0.4')
    .to('#h-scroll', { opacity:1, duration:0.6 }, '-=0.3');
}

document.querySelectorAll('.reveal').forEach((el, i)=>{
  if (window.gsap && window.ScrollTrigger){
    window.gsap.to(el, {
      opacity:1, y:0, duration:0.8, ease:'power2.out',
      scrollTrigger:{ trigger:el, start:'top 88%' }
    });
  } else { el.style.opacity = 1; el.style.transform='none'; }
});

const thread = document.getElementById('thread');
if(thread) {
  window.addEventListener('scroll', ()=>{
    const p = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    thread.style.setProperty('--thread-pos', (p*(document.body.scrollHeight-160))+'px');
  }, { passive:true });
}

const navEl = document.getElementById('nav');
if(navEl) {
  let lastY = window.scrollY;
  window.addEventListener('scroll', ()=>{
    const y = window.scrollY;
    navEl.style.transform = (y > lastY && y > 200) ? 'translateX(-50%) translateY(-90px)' : 'translateX(-50%) translateY(0)';
    lastY = y;
  }, { passive:true });
}

(function chaosViz(){
  const stage = document.getElementById('chaosStage');
  if(!stage) return;
  const labels = ['Land Classification','Object Detection','Change Detection API','GIS Toolchain','VQA Model v2','Grounding Script','SAR Preprocessor','Format Converter'];
  const items = labels.map((t,i)=>{
    const el = document.createElement('div');
    el.className = 'chaos-item';
    el.textContent = t;
    stage.appendChild(el);
    return el;
  });
  function scatter(){
    const w = stage.clientWidth, h = stage.clientHeight;
    items.forEach(el=>{
      const x = Math.random()*(w-160)+10;
      const y = Math.random()*(h-60)+10;
      const rot = (Math.random()*16)-8;
      if (window.gsap) window.gsap.to(el, { left:x, top:y, rotate:rot, duration:1.2, ease:'power2.out' });
      else { el.style.left=x+'px'; el.style.top=y+'px'; }
    });
  }
  items.forEach(el=>{ el.style.left='50%'; el.style.top='50%'; });
  if (window.ScrollTrigger){
    window.ScrollTrigger.create({ trigger: stage, start:'top 75%', once:true, onEnter: scatter });
  } else { scatter(); }
  window.addEventListener('resize', ()=>{});
})();

(function pipelineViz(){
  const wrap = document.getElementById('pipeline');
  const detail = document.getElementById('stageDetail');
  if(!wrap || !detail) return;
  MockData.stages.forEach((s, i)=>{
    const card = document.createElement('div');
    card.className = 'stage-card' + (i===0 ? ' active' : '');
    card.innerHTML = `<div class="stage-idx mono">${s.idx}</div><h4>${s.title}</h4>`;
    card.addEventListener('click', ()=> select(i));
    wrap.appendChild(card);
  });
  function select(i){
    [...wrap.children].forEach((c,ci)=>c.classList.toggle('active', ci===i));
    const s = MockData.stages[i];
    detail.innerHTML = `
      <div class="section-num mono" style="margin-bottom:14px;"><i></i>${s.idx} — ${s.title.toUpperCase()}</div>
      <p style="font-size:15px;color:var(--text-dim);line-height:1.7;max-width:640px;margin:0;">${s.body}</p>
      <div class="tag-row">${s.tags.map(t=>`<span class="tag ${t[1]}">${t[0]}</span>`).join('')}</div>
    `;
  }
  select(0);
})();

(function commandCenter(){
  const canvas = document.getElementById('ccCanvas');
  const map = document.getElementById('ccMap');
  if(!canvas || !map) return;
  const ctx = canvas.getContext('2d');
  const layers = { optical:true, sar:false, change:false };
  const regions = [{x:0.3,y:0.4},{x:0.62,y:0.28},{x:0.5,y:0.68}];
  let activeRegion = 0;

  function resize(){
    canvas.width = map.clientWidth * devicePixelRatio;
    canvas.height = map.clientHeight * devicePixelRatio;
    canvas.style.width = map.clientWidth+'px';
    canvas.style.height = map.clientHeight+'px';
  }
  resize();
  window.addEventListener('resize', resize);

  function seededRand(seed){ const x = Math.sin(seed)*10000; return x - Math.floor(x); }

  function draw(){
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#0b1117';
    ctx.fillRect(0,0,w,h);
    const cols = 22, rows = 14;
    const cw = w/cols, ch = h/rows;
    for (let x=0;x<cols;x++){
      for (let y=0;y<rows;y++){
        const seed = x*13.7 + y*91.3;
        const v = seededRand(seed);
        let color = null;
        if (layers.change && v > 0.9) color = 'rgba(156,140,245,0.5)';
        else if (layers.sar && v > 0.6) color = 'rgba(242,166,90,'+(0.08+v*0.12)+')';
        else if (layers.optical && v > 0.45) color = 'rgba(87,232,201,'+(0.05+v*0.14)+')';
        if (color){ ctx.fillStyle = color; ctx.fillRect(x*cw, y*ch, cw-1, ch-1); }
      }
    }
  }
  draw();

  document.querySelectorAll('.layer-toggle').forEach(t=>{
    t.addEventListener('click', ()=>{
      const key = t.dataset.layer;
      layers[key] = !layers[key];
      t.querySelector('.switch').classList.toggle('on', layers[key]);
      draw();
    });
  });

  regions.forEach((r,i)=>{
    const pin = document.createElement('div');
    pin.className = 'region-pin' + (i===0 ? ' active' : '');
    pin.style.left = (r.x*100)+'%';
    pin.style.top = (r.y*100)+'%';
    pin.addEventListener('click', ()=>{
      document.querySelectorAll('.region-pin').forEach(p=>p.classList.remove('active'));
      pin.classList.add('active');
      activeRegion = i;
      const builtup = (14 + i*6.2 + Math.random()*2).toFixed(1);
      document.getElementById('ccBuiltup').textContent = builtup+'%';
    });
    map.appendChild(pin);
  });

  const simBtn = document.getElementById('simBtn');
  if(simBtn) {
    simBtn.addEventListener('click', function(){
      this.textContent = 'Simulating…';
      layers.change = true;
      document.querySelector('.layer-toggle[data-layer="change"] .switch').classList.add('on');
      setTimeout(()=>{
        draw();
        const changeVal = (Math.random()*3+0.5).toFixed(1);
        document.getElementById('ccChange').textContent = '+'+changeVal+'%';
        this.textContent = 'Run Change Simulation';
      }, 700);
    });
  }
})();

(function counters(){
  document.querySelectorAll('.num[data-count]').forEach(el=>{
    const target = parseInt(el.dataset.count,10);
    if (window.ScrollTrigger){
      window.ScrollTrigger.create({
        trigger: el, start:'top 90%', once:true,
        onEnter: ()=>{
          let cur = 0;
          const t = setInterval(()=>{ cur++; el.textContent = cur; if(cur>=target) clearInterval(t); }, 220);
        }
      });
    } else { el.textContent = target; }
  });
})();

(function judgeMode(){
  const btn = document.getElementById('judgeBtn');
  const caption = document.getElementById('judgeCaption');
  const progress = document.getElementById('judgeProgress');
  if(!btn || !caption || !progress) return;
  const steps = [
    { sel:'#hero', step:'STEP 1 / 6', title:'One query, every sensor', text:'SatQuery AI answers plain-language questions about optical and SAR satellite imagery.' , dur:9000},
    { sel:'#system', step:'STEP 2 / 6', title:'The problem', text:'Remote-sensing AI today ships as isolated single-task tools — this section shows the fragmentation.', dur:9000 },
    { sel:'#pipeline', step:'STEP 3 / 6', title:'The agentic pipeline', text:'One controller classifies, routes, and audits every step — nothing is a black box.', dur:9000 },
    { sel:'#demo', step:'STEP 4 / 6', title:'Live demo', text:'Pick an input mode and a query, then watch the agent trace execute in real time.', dur:14000 },
    { sel:'#technology', step:'STEP 5 / 6', title:'Domain-adapted technology', text:'Every specialist model is fine-tuned or evaluated against real remote-sensing benchmarks.', dur:9000 },
    { sel:'#impact', step:'STEP 6 / 6', title:'Impact', text:'One interface now serves agriculture, disaster response, urban planning, and more.', dur:9000 }
  ];
  let idx = 0, timer = null, paused = false, remaining = 0, startedAt = 0;
  let active = false;

  function goTo(i){
    idx = ((i % steps.length) + steps.length) % steps.length;
    const s = steps[idx];
    const el = document.querySelector(s.sel);
    if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
    document.getElementById('jcStep').textContent = s.step;
    document.getElementById('jcTitle').textContent = s.title;
    document.getElementById('jcText').textContent = s.text;
    runTimer(s.dur);
  }
  function runTimer(dur){
    clearInterval(timer);
    remaining = dur; startedAt = Date.now();
    progress.style.width='0%';
    timer = setInterval(()=>{
      if (paused) { startedAt = Date.now() - (dur-remaining); return; }
      const elapsed = Date.now()-startedAt;
      remaining = dur - elapsed;
      progress.style.width = Math.min(100,(elapsed/dur)*100)+'%';
      if (elapsed >= dur){ clearInterval(timer); goTo(idx+1); }
    }, 60);
  }
  function start(){
    active = true; paused = false;
    caption.classList.add('show');
    btn.textContent = '✕ Exit Judge Mode';
    goTo(0);
  }
  function exit(){
    active = false;
    clearInterval(timer);
    caption.classList.remove('show');
    progress.style.width = '0%';
    btn.textContent = '▶ Judge Mode';
  }
  btn.addEventListener('click', ()=> active ? exit() : start());
  document.getElementById('jcExit').addEventListener('click', exit);
  document.getElementById('jcNext').addEventListener('click', ()=> goTo(idx+1));
  document.getElementById('jcPrev').addEventListener('click', ()=> goTo(idx-1));
  document.getElementById('jcPause').addEventListener('click', function(){
    paused = !paused;
    this.textContent = paused ? '▶' : '❚❚';
  });
})();
