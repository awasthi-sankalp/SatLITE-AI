// @ts-nocheck
'use client';

import React, { useEffect } from 'react';
import './landing.css';
import DashboardClient from './dashboard/DashboardClient';
import Script from 'next/script';
import logoImg from '../Logo/logo.jpg';
import farmingImg from '../SampleImg/5_india_farming.jpg';
import { SignIn, UserButton } from '@clerk/nextjs';

export default function LandingPage({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).initLandingScripts = () => {
        const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if ((window as any).gsap && (window as any).ScrollTrigger) {
            (window as any).gsap.registerPlugin((window as any).ScrollTrigger);
        }

        const MockData = {
          stages: [
            { idx:'01', title:'Input Validation', tags:[['TIFF / PNG / JPG','opt'],['Modality check','sar'],['Co-registration','agt']],
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

        // Hero Scene
        (function heroScene(){
          const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement;
          if(!canvas) return;
          let hasWebGL = true;
          try {
            const test = document.createElement('canvas');
            hasWebGL = !!(window.WebGLRenderingContext && (test.getContext('webgl') || test.getContext('experimental-webgl')));
          } catch(e){ hasWebGL = false; }

          if (!hasWebGL || !(window as any).THREE) {
            const fallback = document.getElementById('heroFallback');
            if (fallback) fallback.style.display = 'block';
            canvas.style.display = 'none';
            return;
          }
          const THREE = (window as any).THREE;

          const scene = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(48, window.innerWidth/window.innerHeight, 0.1, 100);
          camera.position.set(0, 0.4, 7.2);
          const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          renderer.setSize(window.innerWidth, window.innerHeight);

          const isMobile = window.innerWidth < 760;

          const core = new THREE.Group();
          const shellDefs = [
            { r:0.62, color:0x57e8c9, wire:true },
            { r:0.9,  color:0xf2a65a, wire:true },
            { r:1.2,  color:0x9c8cf5, wire:true }
          ];
          const shells = shellDefs.map(d => {
            const geo = new THREE.IcosahedronGeometry(d.r, 1);
            const mat = new THREE.MeshBasicMaterial({ color:d.color, wireframe:true, transparent:true, opacity:0.55 });
            const mesh = new THREE.Mesh(geo, mat);
            core.add(mesh);
            return mesh;
          });
          const centerGeo = new THREE.SphereGeometry(0.34, 32, 32);
          const centerMat = new THREE.MeshBasicMaterial({ color:0xe7ecf2, transparent:true, opacity:0.9 });
          const centerSphere = new THREE.Mesh(centerGeo, centerMat);
          core.add(centerSphere);
          scene.add(core);

          const ringGeo = new THREE.RingGeometry(2.05, 2.07, 128);
          const ringMat = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.12, side:THREE.DoubleSide });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI/2.3;
          scene.add(ring);

          const satGeo = new THREE.OctahedronGeometry(0.06);
          const satMat = new THREE.MeshBasicMaterial({ color:0x57e8c9 });
          const sat = new THREE.Mesh(satGeo, satMat);
          scene.add(sat);

          const pCount = isMobile ? 260 : 700;
          const pGeo = new THREE.BufferGeometry();
          const positions = new Float32Array(pCount*3);
          for (let i=0;i<pCount;i++){
            const r = 3 + Math.random()*5;
            const theta = Math.random()*Math.PI*2;
            const phi = Math.acos((Math.random()*2)-1);
            positions[i*3] = r*Math.sin(phi)*Math.cos(theta);
            positions[i*3+1] = r*Math.sin(phi)*Math.sin(theta)*0.6;
            positions[i*3+2] = r*Math.cos(phi);
          }
          pGeo.setAttribute('position', new THREE.BufferAttribute(positions,3));
          const pMat = new THREE.PointsMaterial({ color:0x8a93a3, size:0.02, transparent:true, opacity:0.5 });
          const particles = new THREE.Points(pGeo, pMat);
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
              (window as any).gsap.to(s.position, { z: dist*(i+1)*0.5, duration:0.9, ease:'power3.out' });
              (window as any).gsap.to(s.scale, { x:1+dist*0.35*(i+1), y:1+dist*0.35*(i+1), z:1+dist*0.35*(i+1), duration:0.9, ease:'power3.out' });
            });
            (window as any).gsap.to(camera.position, { z: exploded ? 5.6 : 7.2, duration:1, ease:'power3.inOut' });
          });
          canvas.style.cursor = 'pointer';

          let angle = 0;
          const clock = new THREE.Clock();
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

        if ((window as any).gsap) {
          (window as any).gsap.timeline({ delay:0.2 })
            .to('#h-eyebrow', { opacity:1, y:0, duration:0.6 })
            .fromTo('#h-title', {opacity:0,y:20}, { opacity:1, y:0, duration:0.8 }, '-=0.3')
            .fromTo('#h-sub', {opacity:0,y:16}, { opacity:1, y:0, duration:0.7 }, '-=0.4')
            .fromTo('#h-cta', {opacity:0,y:14}, { opacity:1, y:0, duration:0.6 }, '-=0.4')
            .to('#h-scroll', { opacity:1, duration:0.6 }, '-=0.3');
        }

        document.querySelectorAll('.reveal').forEach((el, i)=>{
          if ((window as any).gsap && (window as any).ScrollTrigger){
            (window as any).gsap.to(el, {
              opacity:1, y:0, duration:0.8, ease:'power2.out',
              scrollTrigger:{ trigger:el, start:'top 88%' }
            });
          } else { (el as HTMLElement).style.opacity = '1'; (el as HTMLElement).style.transform='none'; }
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
          stage.innerHTML = '<div class="grid-lines" style="opacity:.25;"></div>';
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
              if ((window as any).gsap) (window as any).gsap.to(el, { left:x, top:y, rotate:rot, duration:1.2, ease:'power2.out' });
              else { el.style.left=x+'px'; el.style.top=y+'px'; }
            });
          }
          items.forEach(el=>{ el.style.left='50%'; el.style.top='50%'; });
          if ((window as any).ScrollTrigger){
            (window as any).ScrollTrigger.create({ trigger: stage, start:'top 75%', once:true, onEnter: scatter });
          } else { scatter(); }
        })();

        (function pipelineViz(){
          const wrap = document.getElementById('pipeline');
          const detail = document.getElementById('stageDetail');
          if(!wrap) return;
          wrap.innerHTML = '';
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

        // commandCenter block removed because we replaced it with Visual Grounding

        (function counters(){
          document.querySelectorAll('.num[data-count]').forEach(el=>{
            const target = parseInt((el as HTMLElement).dataset.count,10);
            if ((window as any).ScrollTrigger){
              (window as any).ScrollTrigger.create({
                trigger: el, start:'top 90%', once:true,
                onEnter: ()=>{
                  let cur = 0;
                  const t = setInterval(()=>{ cur++; el.textContent = cur.toString(); if(cur>=target) clearInterval(t); }, 220);
                }
              });
            } else { el.textContent = target.toString(); }
          });
        })();

        (function judgeMode(){
          const btn = document.getElementById('judgeBtn');
          const caption = document.getElementById('judgeCaption');
          const progress = document.getElementById('judgeProgress');
          if(!btn) return;
          const steps = [
            { sel:'#hero', step:'STEP 1 / 6', title:'One query, every sensor', text:'SatLITE AI answers plain-language questions about optical and SAR satellite imagery.' , dur:9000},
            { sel:'#system', step:'STEP 2 / 6', title:'The problem', text:'Remote-sensing AI today ships as isolated single-task tools — this section shows the fragmentation.', dur:9000 },
            { sel:'#pipeline', step:'STEP 3 / 6', title:'The agentic pipeline', text:'One controller classifies, routes, and audits every step — nothing is a black box.', dur:9000 },
            { sel:'#demo', step:'STEP 4 / 6', title:'Live demo', text:'Upload an image and run a prompt to see the agent execute live.', dur:14000 },
            { sel:'#technology', step:'STEP 5 / 6', title:'Domain-adapted technology', text:'Powered by Gemini Flash and Next.js, customized for remote sensing.', dur:9000 },
            { sel:'#impact', step:'STEP 6 / 6', title:'Impact', text:'One interface now serves agriculture, disaster response, urban planning, and more.', dur:9000 }
          ];
          let idx = 0, timer: any = null, paused = false, remaining = 0, startedAt = 0;
          let active = false;

          function goTo(i: number){
            idx = ((i % steps.length) + steps.length) % steps.length;
            const s = steps[idx];
            const el = document.querySelector(s.sel);
            if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
            document.getElementById('jcStep').textContent = s.step;
            document.getElementById('jcTitle').textContent = s.title;
            document.getElementById('jcText').textContent = s.text;
            runTimer(s.dur);
          }
          function runTimer(dur: number){
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
          const newBtn = btn.cloneNode(true);
          btn.parentNode.replaceChild(newBtn, btn);
          newBtn.addEventListener('click', ()=> active ? exit() : start());
          document.getElementById('jcExit').onclick = exit;
          document.getElementById('jcNext').onclick = ()=> goTo(idx+1);
          document.getElementById('jcPrev').onclick = ()=> goTo(idx-1);
          document.getElementById('jcPause').onclick = function(){
            paused = !paused;
            this.textContent = paused ? '▶' : '❚❚';
          };
        })();
      };
    }
  }, []);

  useEffect(() => {
    const checkDeps = setInterval(() => {
      if ((window as any).THREE && (window as any).gsap && (window as any).ScrollTrigger) {
        clearInterval(checkDeps);
        if (typeof window !== 'undefined' && (window as any).initLandingScripts) {
          (window as any).initLandingScripts();
        }
      }
    }, 100);
    return () => clearInterval(checkDeps);
  }, []);

  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" strategy="afterInteractive" />

      <div className="signal-thread" id="thread"></div>
      <div className="judge-progress" id="judgeProgress"></div>

      <nav className="lp-nav" id="nav">
        <a href="#hero" className="brand">
          <img src={logoImg.src} alt="SatLITE AI Logo" className="w-5 h-5 rounded-full object-cover mr-1" />
          <span>SatLITE AI</span>
        </a>
        <a href="#hero">Project</a>
        <a href="#system">System</a>
        <a href="#demo">Demo</a>
        <a href="#technology">Technology</a>
        <a href="#impact">Impact</a>
        <button className="judge-btn" id="judgeBtn">▶ Judge Mode</button>
        {userId && <div className="ml-2 flex items-center"><UserButton /></div>}
      </nav>

      <section className="hero" id="hero" style={{maxWidth:'none', padding:0}}>
        <canvas id="hero-canvas" aria-hidden="true"></canvas>
        <div className="hero-fallback" id="heroFallback"></div>
        <div className="hero-content">
          <div className="hero-eyebrow mono" id="h-eyebrow">Hackathon Project 167 · <b>ISRO / SAC</b> Remote Sensing Challenge</div>
          <h1 id="h-title">One query. Every sensor.<br/><span className="o">Optical</span> + <span className="s">SAR</span>. One answer.</h1>
          <p id="h-sub">SatLITE AI is an agentic vision-language assistant that reads a satellite image — or two — and answers plain-language questions about what changed, what's there, and where. No GIS pipeline required.</p>
          <div className="cta-row" id="h-cta">
            <a href="#system" className="btn-primary">Explore the System</a>
            <a href="#demo" className="btn-ghost">Jump to Live Demo</a>
          </div>
        </div>
        <div className="scroll-cue" id="h-scroll"><div className="line"></div><span>Scroll</span></div>
      </section>

      <section id="system" className="lp-section">
        <div className="section-head reveal">
          <div className="section-num"><i></i>01 — THE PROBLEM</div>
          <h2>Every question needs a different tool.</h2>
          <p>Land classification. Object detection. Change detection. Visual question answering. Remote-sensing AI today ships as isolated, single-task applications — so before getting an answer, a user has to already know which model, which format, and which workflow to reach for.</p>
        </div>
        <div className="problem-stage reveal" id="chaosStage">
          <div className="grid-lines" style={{opacity:0.25}}></div>
        </div>
        <div className="problem-line reveal">Non-expert users stall <b>before the first answer</b> — even when the imagery already holds it.</div>
      </section>

      <section className="lp-section">
        <div className="section-head reveal">
          <div className="section-num"><i></i>02 — OUR APPROACH</div>
          <h2>SatLITE AI reads the question first.</h2>
          <p>An agentic controller classifies the task, validates the inputs, and routes to the right specialist model — or combination of models — before returning one evidence-grounded response.</p>
        </div>
        <div className="flow reveal" id="flowDiagram">
          <div className="flow-node input"><div className="icon">◧</div><h4>Input</h4><p>Image(s) + natural-<br/>language query</p></div>
          <div className="flow-arrow">→</div>
          <div className="flow-node router"><div className="icon">◎</div><h4>Agent Router</h4><p>Task classification +<br/>compatibility check</p></div>
          <div className="flow-arrow">→</div>
          <div className="flow-node specialist"><div className="icon">▤</div><h4>Specialist Models</h4><p>VQA · Grounding · Change ·<br/>Optical–SAR Fusion</p></div>
          <div className="flow-arrow">→</div>
          <div className="flow-node output"><div className="icon">◈</div><h4>Grounded Output</h4><p>Answer + visual evidence<br/>+ confidence</p></div>
        </div>
      </section>

      <section className="lp-section">
        <div className="section-head reveal">
          <div className="section-num"><i></i>03 — HOW IT WORKS</div>
          <h2>An auditable pipeline, not a black box.</h2>
          <p>Click a stage to see what the controller actually does at that step.</p>
        </div>
        <div className="pipeline reveal" id="pipeline"></div>
        <div className="stage-detail reveal" id="stageDetail"></div>
      </section>

      <section id="demo" className="lp-section">
        <div className="section-head reveal" style={{marginBottom: '24px'}}>
          <div className="section-num"><i></i>04 — LIVE DEMO</div>
          <h2>Ask it something.</h2>
          <p>Our agent uses Gemini 1.5 Flash behind the scenes as a single master model that dynamically routes to specialized zero-shot techniques based on your prompt.</p>
        </div>
        
        <div className="w-full animate-fade-in relative z-10" id="dashboard-injection-point">
          {!userId ? (
            <div className="flex flex-col items-center justify-center p-10 border border-gray-600 rounded-2xl bg-gray-900/50 backdrop-blur">
              <h3 className="text-xl font-bold text-white mb-6">Sign in to access the Live Agent</h3>
              <SignIn routing="hash" forceRedirectUrl="/" signUpForceRedirectUrl="/" />
            </div>
          ) : (
            <div className="w-full bg-black border border-gray-600 rounded-2xl p-4 sm:p-8">
               <DashboardClient />
            </div>
          )}
        </div>
      </section>

      <section className="lp-section">
        <div className="section-head reveal">
          <div className="section-num"><i></i>05 - VISUAL GROUNDING</div>
          <h2>Evidence you can see.</h2>
          <p>SatLITE AI doesn't just return text. It outputs precise coordinate bounding boxes and visual highlights directly on your uploaded imagery to ground its reasoning, ensuring every claim is verifiable.</p>
        </div>
        <div className="cc reveal">
          <div className="cc-map flex items-center justify-center bg-[#0b1117] overflow-hidden relative" style={{ minHeight: '380px' }}>
            <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url(${farmingImg.src})` }}></div>
            
            <div className="absolute border-2 border-[#57e8c9] bg-[#57e8c9]/20" style={{ top: '35%', left: '40%', width: '120px', height: '80px' }}>
              <div className="absolute -top-6 left-0 bg-[#57e8c9] text-black text-[10px] font-bold px-2 py-1 uppercase tracking-wider whitespace-nowrap">Agricultural Parcels</div>
            </div>
          </div>
          <div className="cc-panel bg-[#0d131b] p-6 flex flex-col justify-center">
            <div className="mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">User Query</div>
              <div className="bg-[#141a23] border border-[#1a2129] p-4 rounded-xl text-sm text-gray-200">"Locate the active agricultural fields in this optical image and assess their status."</div>
            </div>
            
            <div className="mt-4">
              <div className="text-xs text-[#9c8cf5] uppercase tracking-wider mb-2 font-mono flex items-center gap-2">
                SatLITE AI Response
              </div>
              <div className="bg-[#1a2129] border border-[rgba(156,140,245,0.3)] p-4 rounded-xl text-sm text-gray-200 shadow-[0_0_15px_rgba(156,140,245,0.1)]">
                <p className="mb-3 leading-relaxed">I have identified a cluster of distinct agricultural parcels in the central-western sector of the region showing active cultivation.</p>
                <div className="inline-flex items-center gap-2 bg-[#57e8c9]/10 text-[#57e8c9] px-2 py-1 rounded border border-[#57e8c9]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#57e8c9] animate-pulse"></span>
                  <span className="font-mono text-[10px] uppercase tracking-wider">Visual grounding generated</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="technology" className="lp-section">
        <div className="section-head reveal">
          <div className="section-num"><i></i>06 — TECHNOLOGY</div>
          <h2>Domain-adapted, not generic.</h2>
          <p>A general-purpose VLM can't reliably answer sensor-specific questions without adaptation. Every specialist here is fine-tuned or evaluated on remote-sensing benchmarks.</p>
        </div>
        <div className="tech-grid reveal">
          <div className="tech-card"><div className="k">Adaptation dataset</div><h4>BigEarthNet</h4><p>Primary corpus for adapting image–text representations to multisensor remote-sensing data.</p></div>
          <div className="tech-card"><div className="k">Evaluation benchmark</div><h4>VRSBench</h4><p>Single-image captioning and text-guided region grounding.</p></div>
          <div className="tech-card"><div className="k">Evaluation benchmark</div><h4>RSVQA</h4><p>Single-image visual question answering.</p></div>
          <div className="tech-card"><div className="k">Evaluation benchmark</div><h4>CDVQA</h4><p>Multitemporal, change-based visual question answering.</p></div>
          <div className="tech-card"><div className="k">Specialist module</div><h4>RS-VQA Engine</h4><p>Answers direct questions about land cover, objects, and scene content.</p></div>
          <div className="tech-card"><div className="k">Specialist module</div><h4>Caption &amp; Grounding Net</h4><p>Scene description and text-guided region localization.</p></div>
          <div className="tech-card"><div className="k">Specialist module</div><h4>Change-VQA Module</h4><p>Bi-temporal comparison, change description, and change localization.</p></div>
          <div className="tech-card"><div className="k">Specialist module</div><h4>Optical–SAR Fusion Net</h4><p>Joint reasoning over co-registered optical and radar image pairs.</p></div>
        </div>
      </section>

      <section id="impact" className="lp-section">
        <div className="section-head reveal">
          <div className="section-num"><i></i>07 — IMPACT</div>
          <h2>One interface, many domains.</h2>
          <p>The same natural-language query pattern applies wherever satellite imagery already gets used — just without the GIS expertise usually required to use it.</p>
        </div>
        <div className="impact-stats reveal">
          <div className="stat-card"><div className="num" data-count="4">0</div><div className="lbl">Sensor / temporal input modes unified — single, cross-modal, bi-temporal</div></div>
          <div className="stat-card"><div className="num" data-count="5">0</div><div className="lbl">Specialist models orchestrated by one agent controller</div></div>
          <div className="stat-card"><div className="num" data-count="1">0</div><div className="lbl">Natural-language interface — no task selection required</div></div>
        </div>
        <div className="usecases reveal">
          <div className="usecase-chip">Agricultural monitoring</div>
          <div className="usecase-chip">Disaster management</div>
          <div className="usecase-chip">Urban planning</div>
          <div className="usecase-chip">Water-resource assessment</div>
          <div className="usecase-chip">Infrastructure mapping</div>
          <div className="usecase-chip">Environmental analysis</div>
        </div>
      </section>

      <footer className="lp-footer">
        <p>SATLITE AI — PROJECT 167 · BUILT FOR AN AGENTIC REMOTE-SENSING VLM CHALLENGE</p>
      </footer>

      <div className="judge-caption" id="judgeCaption">
        <div className="step mono" id="jcStep">STEP 1 / 6</div>
        <h3 id="jcTitle">The problem</h3>
        <p id="jcText">Remote-sensing AI ships as isolated single-task tools.</p>
        <div className="judge-controls">
          <button id="jcPrev">‹</button>
          <button id="jcPause">❚❚</button>
          <button id="jcNext">›</button>
          <button id="jcExit">✕</button>
        </div>
      </div>
    </>
  );
}
