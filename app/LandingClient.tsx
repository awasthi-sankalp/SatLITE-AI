
'use client';

import React from 'react';
import Script from 'next/script';
import DashboardClient from './dashboard/DashboardClient';
import './landing.css';

export default function LandingClient() {
  return (
    <div className="landing-page">
      <div className="signal-thread" id="thread"></div>
      <div className="judge-progress" id="judgeProgress"></div>

      <nav className="nav" id="nav">
        <a href="#hero" className="brand"><span className="dot"></span><span>SatQuery AI</span></a>
        <a href="#hero">Project</a>
        <a href="#system">System</a>
        <a href="#demo">Demo</a>
        <a href="#technology">Technology</a>
        <a href="#impact">Impact</a>
        <a href="/dashboard" className="judge-btn" style={{ background: '#fff', color: '#000', textDecoration: 'none' }}>Go to App</a>
        <button className="judge-btn" id="judgeBtn">▶ Judge Mode</button>
      </nav>

      <section className="hero" id="hero" style={{ maxWidth: 'none', padding: 0 }}>
        <canvas id="hero-canvas" aria-hidden="true" />
        <div className="hero-fallback" id="heroFallback"></div>
        <div className="hero-scrim"></div>
        <div className="hero-grid">
          <div className="hero-content">
            <div className="hero-eyebrow mono" id="h-eyebrow">Hackathon Project 167 · <b>ISRO / SAC</b> Remote Sensing Challenge</div>
            <h1 id="h-title">Don't select a model.<br/>Just <span className="o">ask the</span> <span className="s">imagery</span>.</h1>
            <p className="hero-sub" id="h-sub">SatQuery AI is an agentic vision-language assistant for optical and SAR satellite imagery — it routes plain-language questions to the right specialist model and answers with visual evidence.</p>
            <div className="hero-cta" id="h-cta">
              <a href="#system" className="btn-primary" style={{ textDecoration: 'none' }}>Explore the System</a>
              <a href="#demo" className="btn-ghost" style={{ textDecoration: 'none' }}>See the full demo →</a>
            </div>
          </div>
          <div aria-hidden="true"></div>
        </div>
        <div className="hero-hud tl mono" id="hudTop">
          <div className="row"><span id="hudAlt">ALT 705.2 KM</span><i></i></div>
          <div className="row"><span id="hudInc">INC 98.1°</span><i></i></div>
        </div>
        <div className="hero-hud bl mono" id="hudBottom">
          <div className="row"><span id="hudPass">PASS 06 / 14 — NOMINAL</span><i></i></div>
        </div>
        <div className="scroll-cue" id="h-scroll"><div className="line"></div><span>Scroll</span></div>
      </section>

      <section id="system" className="landing-section">
      <div className="section-head reveal">
        <div className="section-num"><i></i>01 — THE PROBLEM</div>
        <h2>Every question needs a different tool.</h2>
        <p>Land classification. Object detection. Change detection. Visual question answering. Remote-sensing AI today ships as isolated, single-task applications — so before getting an answer, a user has to already know which model, which format, and which workflow to reach for.</p>
      </div>
      <div className="problem-stage reveal" id="chaosStage">
        <div className="grid-lines" style={{ opacity: 0.25 }}></div>
      </div>
      <div className="problem-line reveal">Non-expert users stall <b>before the first answer</b> — even when the imagery already holds it.</div>
      </section>

      <section className="landing-section">
      <div className="section-head reveal">
        <div className="section-num"><i></i>02 — OUR APPROACH</div>
        <h2>SatQuery AI reads the question first.</h2>
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

      <section className="landing-section">
      <div className="section-head reveal">
        <div className="section-num"><i></i>03 — HOW IT WORKS</div>
        <h2>An auditable pipeline, not a black box.</h2>
        <p>Click a stage to see what the controller actually does at that step.</p>
      </div>
      <div className="pipeline reveal" id="pipeline"></div>
      <div className="stage-detail reveal" id="stageDetail"></div>
      </section>

      <section id="demo" className="landing-section">
      <div className="section-head reveal">
        <div className="section-num"><i></i>04 — LIVE DEMO</div>
        <h2>Ask it something.</h2>
        <p>Drop your satellite images here to query the real AI controller. Select your mode, upload images, and enter a natural language question.</p>
      </div>
      <div className="demo-shell reveal" style={{ background: '#0a0e14', border: 'none', boxShadow: 'none' }}>
        <DashboardClient />
      </div>
      </section>

      <section className="landing-section">
      <div className="section-head reveal">
        <div className="section-num"><i></i>05 — COMMAND CENTER</div>
        <h2>Inspect the fused layers directly.</h2>
        <p>Toggle sensor layers, pick a region, and run a change simulation across the same underlying scene.</p>
      </div>
      <div className="cc reveal">
        <div className="cc-map" id="ccMap">
          <canvas id="ccCanvas" />
        </div>
        <div className="cc-panel">
          <div>
            <div className="field-label">Layers</div>
            <div className="layer-toggle" data-layer="optical"><div className="name"><span className="swatch" style={{ background: 'var(--optical)' }}></span>Optical</div><div className="switch on"></div></div>
            <div className="layer-toggle" data-layer="sar"><div className="name"><span className="swatch" style={{ background: 'var(--sar)' }}></span>SAR</div><div className="switch"></div></div>
            <div className="layer-toggle" data-layer="change"><div className="name"><span className="swatch" style={{ background: 'var(--agent)' }}></span>Change Map</div><div className="switch"></div></div>
          </div>
          <div className="cc-stat">
            <span className="big" id="ccBuiltup">18.4%</span>
            <span className="lbl">Built-up area, selected region</span>
          </div>
          <div className="cc-stat">
            <span className="big" id="ccChange">+2.1%</span>
            <span className="lbl">Change vs. prior acquisition</span>
          </div>
          <button className="sim-btn" id="simBtn">Run Change Simulation</button>
        </div>
      </div>
      </section>

      <section id="technology" className="landing-section">
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

      <section id="impact" className="landing-section">
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

      <footer>
        <p>SATQUERY AI — PROJECT 167 · BUILT FOR AN AGENTIC REMOTE-SENSING VLM CHALLENGE</p>
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

      <Script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" strategy="lazyOnload" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" strategy="lazyOnload" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" strategy="lazyOnload" />
      <Script src="/landing-script.js" strategy="lazyOnload" />
    </div>
  );
}
