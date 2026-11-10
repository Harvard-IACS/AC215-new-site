import { siteUrl } from './site-url';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { createSECModel } from './sec-model';
import { createLectureHallModel } from './lecture-hall-model';
import { createSECJourney, SEC_POSTER_SIZE } from './sec-journey';
const pausePreferenceKey = 'ac215-sec-paused';
const paletteKeys = ['paper','metal','band','glass','frame','roof','grass','tree','trunk','path','ground','road','interior','light','shadow','rooftop','bench','window-light','night-light','room-wall','room-wood','room-ceiling','room-seat-red','room-seat-orange','room-seat-gold','room-rail','room-trim','room-screen','room-foyer-floor','room-foyer-wall','room-foyer-yellow','room-light'];
export function SECScene({ trackRef }) {
  const mountRef=useRef(null), pausedRef=useRef(false);
  const [paused,setPaused]=useState(false), [ready,setReady]=useState(false), [fallback,setFallback]=useState(false);
  const [posterDark,setPosterDark]=useState(null);
  const [insideHall,setInsideHall]=useState(false);
  useEffect(()=>{
    try {
      pausedRef.current=localStorage.getItem(pausePreferenceKey)==='true';
      setPaused(pausedRef.current);
    } catch {}
  },[]);
  useEffect(()=>{
    const update=()=>setPosterDark(document.documentElement.dataset.theme==='dark');
    update();
    const observer=new MutationObserver(update);
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    let disposed=false,cleanup=()=>{};
    async function start(){
      try{
        const [T,{RoomEnvironment}]=await Promise.all([import('three'),import('three/addons/environments/RoomEnvironment.js')]);
        if(disposed)return;
        const mount=mountRef.current, mobile=matchMedia('(max-width:760px)'), motion=matchMedia('(prefers-reduced-motion:reduce)');
        const getPalette=()=>{const css=getComputedStyle(document.documentElement);return {...Object.fromEntries(paletteKeys.map(key=>[key,css.getPropertyValue('--scene-'+key).trim()])),dark:document.documentElement.dataset.theme==='dark'};};
        let palette=getPalette();
        const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
        renderer.setPixelRatio(Math.min(devicePixelRatio,mobile.matches?1.5:1.8));
        renderer.setClearColor(palette.paper,0);renderer.outputColorSpace=T.SRGBColorSpace;
        renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
        renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
        renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
        renderer.domElement.setAttribute('aria-hidden','true');mount.appendChild(renderer.domElement);
        const scene=new T.Scene();
        scene.fog=new T.Fog(palette.paper,115,180);
        const environment=new RoomEnvironment();const pmrem=new T.PMREMGenerator(renderer);
        const envTarget=pmrem.fromScene(environment,.04);scene.environment=envTarget.texture;
        environment.dispose();pmrem.dispose();
        const hemi=new T.HemisphereLight(palette.light,palette.shadow,1.1);scene.add(hemi);
        const key=new T.DirectionalLight(palette.light,2.4);key.position.set(-27,48,30);key.castShadow=true;
        key.shadow.mapSize.set(mobile.matches?1024:2048,mobile.matches?1024:2048);
        Object.assign(key.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:120});key.shadow.normalBias=.035;key.shadow.bias=-.00015;scene.add(key);
        const fill=new T.DirectionalLight(palette.light,.4);fill.position.set(30,20,-20);scene.add(fill);
        const model=createSECModel(T,palette);
        const building=new T.Group();building.rotation.y=-.06;model.group.rotation.y=0;building.add(model.group);scene.add(building);
        const classroom=createLectureHallModel(T,palette);
        // Level 1 is the lowest glazed floor. The rear landing is at its floor
        // plate; the raked seating descends below it, away from the perimeter.
        const hallFrame=new T.Group();hallFrame.position.set(-2,.12-4.3*.5,2);hallFrame.rotation.y=-Math.PI/2;hallFrame.scale.setScalar(.5);hallFrame.add(classroom.group);building.add(hallFrame);hallFrame.visible=false;
        const roomLights=[];classroom.group.traverse(item=>{if(item.isLight)roomLights.push(item);});
        const journey=createSECJourney(T,hallFrame);
        const camera=new T.PerspectiveCamera(33,1,.03,240);
        const atriumLights=[];
        for(const x of [-8.1,10.15]) { const light=new T.PointLight(palette['window-light'],0,14,2); light.position.set(x,2.4,5); scene.add(light);atriumLights.push(light); }
        const classroomHeading=document.getElementById('classroom');
        let anchorOffset=40;
        let frame=0,visible=true,lastTime=0,hasRendered=false,lastProgress=-1,lastInside=false,themeTransition=null;
        const render=(time,force=false)=>{
          if(disposed)return;
          if(themeTransition){
            const amount=motion.matches?1:Math.max(0,Math.min(1,(time-themeTransition.start)/themeTransition.duration));
            themeTransition.update(amount*amount*(3-2*amount));
            if(amount===1)themeTransition=null;
            force=true;
          }
          const rect=trackRef.current?.getBoundingClientRect();
          const headingRect=classroomHeading?.getBoundingClientRect();
          // Arrive when the classroom heading reaches the navigation baseline,
          // while the canvas is still pinned beside the heading.
          const range=rect&&headingRect?headingRect.top-rect.top-anchorOffset:rect?.height-innerHeight;
          const rawProgress=!rect?0:Math.max(0,Math.min(1,-rect.top/Math.max(1,range)));
          const progress=mobile.matches?0:motion.matches?(rawProgress>.78?1:rawProgress>.42?.42:0):rawProgress;
          if(hasRendered&&!force&&(pausedRef.current||Math.abs(progress-lastProgress)<.00001)){lastTime=time;return;}
          if(!pausedRef.current||!hasRendered){
            const view=journey.sample(progress,camera.aspect);
            camera.position.copy(view.position);camera.lookAt(view.target);
            if(Math.abs(camera.fov-view.fov)>.001){camera.fov=view.fov;camera.updateProjectionMatrix();}
            model.group.visible=!view.inside;hallFrame.visible=view.inside;
            classroom.setDoorProgress(view.outerDoorOpen,view.innerDoorOpen);
            mount.style.filter=view.blur>.01?`blur(${view.blur.toFixed(2)}px)`:'none';
            mount.style.opacity=view.opacity.toFixed(4);
            for(const light of [hemi,key,fill,...atriumLights])light.visible=!view.inside;
            for(const light of roomLights)light.visible=view.inside;
            if(view.inside!==lastInside){lastInside=view.inside;setInsideHall(view.inside);renderer.shadowMap.needsUpdate=true;}
            lastProgress=progress;
          }
          renderer.render(scene,camera);lastTime=time;hasRendered=true;
        };
        const resize=()=>{const {width,height}=mount.getBoundingClientRect();if(!width||!height)return;anchorOffset=parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)||40;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();render(lastTime,true);};
        const animate=time=>{frame=requestAnimationFrame(animate);if(visible&&!document.hidden&&time-lastTime>30)render(time);};
        const observer=new ResizeObserver(resize);observer.observe(mount);
        const visibility=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;});visibility.observe(mount);
        const recolor=()=>{
          palette=getPalette();renderer.setClearColor(palette.paper,0);
          // Capture the current visual state so a second click reverses smoothly.
          const colors=[[scene.fog.color,palette.paper],[hemi.color,palette.dark?palette['night-light']:palette.light],[hemi.groundColor,palette.shadow],[key.color,palette.dark?palette['night-light']:palette.light]]
            .map(([color,target])=>({color,from:color.clone(),to:new T.Color(target)}));
          const values=[[hemi,'intensity',palette.dark?.65:1.1],[key,'intensity',palette.dark?1:2.4],[fill,'intensity',palette.dark?.16:.4],[scene,'environmentIntensity',palette.dark?.22:.58],[renderer,'toneMappingExposure',palette.dark?1.05:.92],...atriumLights.map(light=>[light,'intensity',palette.dark?20:0])]
            .map(([object,key,to])=>({object,key,from:object[key],to}));
          const updateMaterials=model.transitionTo(palette);
          const updateRoom=classroom.transitionTo(palette);
          const update=amount=>{
            updateMaterials(amount);updateRoom(amount);
            for(const {color,from,to} of colors)color.copy(from).lerp(to,amount);
            for(const {object,key,from,to} of values)object[key]=from+(to-from)*amount;
          };
          const durationValue=getComputedStyle(document.documentElement).getPropertyValue('--dur-theme').trim();
          const duration=motion.matches||!hasRendered?0:parseFloat(durationValue)*(durationValue.endsWith('ms')?1:1000);
          if(duration>0)themeTransition={start:performance.now(),duration,update};
          else{themeTransition=null;update(1);}
          if(hasRendered)render(performance.now(),true);
        };
        const themeObserver=new MutationObserver(recolor);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
        const lost=event=>{event.preventDefault();setFallback(true);};renderer.domElement.addEventListener('webglcontextlost',lost);
        recolor();resize();frame=requestAnimationFrame(animate);setReady(true);
        cleanup=()=>{cancelAnimationFrame(frame);observer.disconnect();visibility.disconnect();themeObserver.disconnect();renderer.domElement.removeEventListener('webglcontextlost',lost);model.dispose();classroom.dispose();envTarget.dispose();key.shadow.map?.dispose();renderer.dispose();renderer.domElement.remove();};
      }catch(error){console.warn('SEC scene unavailable; showing the static architectural view.');if(!disposed)setFallback(true);}
    }
    start();return()=>{disposed=true;cleanup();};
  },[trackRef]);
  function togglePause(){
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    try {
      if(next) localStorage.setItem(pausePreferenceKey,'true');
      else localStorage.removeItem(pausePreferenceKey);
    } catch {}
  }
  return <figure className="sec-scene" aria-label="Architectural model of Harvard’s Science and Engineering Complex">
    <div className="scene-frame">
      <picture>
        <source media={posterDark===null?'(prefers-color-scheme: dark)':posterDark?'all':'not all'} srcSet={siteUrl('/sec-poster-dark.png')} />
        <img className={ready&&!fallback?'scene-poster scene-poster-hidden':'scene-poster'} src={siteUrl('/sec-poster-light.png')} width={SEC_POSTER_SIZE.width} height={SEC_POSTER_SIZE.height} alt="SEC laboratory wings above three stepped glazed levels and planted courtyard terraces" fetchPriority="high" />
      </picture>
      <div ref={mountRef} className={fallback?'scene-canvas scene-canvas-failed':'scene-canvas'} aria-hidden="true" />
    </div>
    <figcaption className="scene-caption"><span>{insideHall?'SEC 1.321':'Science and Engineering Complex'}</span>
      <button type="button" className="scene-pause" onClick={togglePause} aria-label={paused?'Resume scene movement':'Pause scene movement'} aria-pressed={paused}>{paused?<Play aria-hidden="true"/>:<Pause aria-hidden="true"/>}<span>{paused?'Resume':'Pause'}</span></button>
    </figcaption>
  </figure>;
}
