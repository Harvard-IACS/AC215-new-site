// Reference-based reconstruction of the SEC. Layout traced from the supplied
// courtyard/street photographs and aerial reference; not a surveyed BIM model.
export function createSECModel(T, palette) {
  const group = new T.Group();
  const geometries = new Set();
  const materials = new Map();
  const unitBox = new T.BoxGeometry(1, 1, 1); geometries.add(unitBox);
  const matrix = new T.Object3D();
  let seed = 215;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  function material(key, options = {}) {
    const m = new T.MeshStandardMaterial({ color: palette[key], roughness: 0.6, metalness: 0.12, ...options });
    materials.set(m, key); return m;
  }
  const metal = material('metal', { metalness: 0.55, roughness: 0.43, side: T.DoubleSide });
  const band = material('band', { roughness: 0.65 });
  const glass = material('glass', { metalness: 0.48, roughness: 0.16, transparent: true, opacity: 0.84, side: T.DoubleSide, depthWrite: false, envMapIntensity: 1.4 });
  const frame = material('frame', { metalness: 0.65, roughness: 0.42 });
  const grass = material('grass', { roughness: 1 });
  const roof = material('roof', { roughness: 1 });
  const ground = material('ground', { roughness: 1 });
  const path = material('path', { roughness: 0.9 });
  const road = material('road', { roughness: 1 });
  const inside = material('interior', { roughness: 0.9 });
  const rooftop = material('rooftop', { metalness: 0.5, roughness: 0.5 });
  const tree = material('tree', { roughness: 1 });
  const trunk = material('trunk', { roughness: 1 });
  const bench = material('bench', { roughness: 0.8 });
  const windowLight = material('glass', { roughness: 0.3, metalness: 0.12, emissive: palette['window-light'], emissiveIntensity: 0 });
  const lampLight = material('band', { roughness: 0.4, emissive: palette['window-light'], emissiveIntensity: 0 });
  const shadowMaterial = new T.ShadowMaterial({ color: palette.shadow, opacity: 0.2 });
  materials.set(shadowMaterial, 'shadow');
  const shadowPlane = new T.Mesh(new T.PlaneGeometry(240,240), shadowMaterial);
  geometries.add(shadowPlane.geometry); shadowPlane.rotation.x = -Math.PI/2;
  shadowPlane.position.y = -0.24; shadowPlane.receiveShadow = true; group.add(shadowPlane);
  function mesh(geometry, mat, x = 0, y = 0, z = 0) {
    geometries.add(geometry);
    const m = new T.Mesh(geometry, mat); m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
  }
  function box(w, h, d, x, y, z, mat) {
    const m = mesh(unitBox, mat, x, y, z); m.scale.set(w, h, d); return m;
  }
  function slab(points, bottom, thickness, mat) {
    const shape = new T.Shape(points.map(([x, z]) => new T.Vector2(x, -z)));
    const geometry = new T.ExtrudeGeometry(shape, { depth: thickness, steps: 1, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);
    return mesh(geometry, mat, 0, bottom, 0);
  }
  function instances(geometry, mat, placements) {
    geometries.add(geometry);
    const m = new T.InstancedMesh(geometry, mat, placements.length);
    placements.forEach((p, index) => {
      matrix.position.set(...p.position); matrix.rotation.set(0, p.rotation || 0, 0); matrix.scale.set(...p.scale);
      matrix.updateMatrix(); m.setMatrixAt(index, matrix.matrix);
      if (p.variation !== undefined) m.setColorAt(index, new T.Color().setScalar(p.variation));
    });
    m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
  }
  const mullions = [], terracePosts = [], shadePanels = [], pipePlacements = [], windowPlacements = [];
  const addBar = (collection, position, scale, rotation = 0) => collection.push({ position, scale, rotation });
  // The three courtyard terraces sit to the right of the upper lab spine.
  // Setbacks are relative to the podium's own center on all three levels.
  const podiumOffset = 8.5;
  const footprint = [
    [-24.5, -9.5], [24, -9.5], [25.2, 6.5], [28.8, 16.2],
    [22.2, 20.6], [12.8, 18.4], [7.6, 11.4], [-3.2, 12.5],
    [-7.6, 16.2], [-8.8, 25], [-19.8, 22.2], [-24.7, 15.6],
  ];
  const tier = amount => footprint.map(([x, z]) => [
    podiumOffset + x * amount,
    -7 + (z + 7) * amount,
  ]);
  const streetZ = -9.5;
  const labLeftX = -24.05;
  const labRightX = -10.25;
  const labFrontZ = 9.2;
  // The first two floors extend below the left lab. The third meets its
  // side at the same street wall plane, with setbacks only toward the courtyard.
  for (let floor = 0; floor < 3; floor++) {
    const polygon = tier(1 - floor * 0.085);
    polygon[0] = [floor < 2 ? labLeftX : labRightX, streetZ];
    polygon[1] = [podiumOffset + footprint[1][0], streetZ];
    if (floor < 2) {
      polygon.push([polygon.at(-1)[0], labFrontZ], [labLeftX, labFrontZ]);
    } else {
      polygon.push([labRightX, labFrontZ]);
    }
    const y = floor * 1.56;
    slab(polygon, y - 0.12, 0.18, band);
    polygon.forEach(([x1,z1], i) => {
      const [x2,z2] = polygon[(i + 1) % polygon.length];
      const length = Math.hypot(x2-x1,z2-z1);
      const angle = -Math.atan2(z2-z1,x2-x1);
      const wall=mesh(new T.PlaneGeometry(length,1.28),glass,(x1+x2)/2,y+.7,(z1+z2)/2);
      wall.rotation.y=angle;
      for (let k = 0; k <= length; k += 0.58) {
        // Start the street grid at its fixed right end on every floor.
        const t = i === 0 ? 1 - k / length : k / length;
        addBar(mullions, [x1+(x2-x1)*t,y+0.7,z1+(z2-z1)*t], [0.035,1.3,0.045], angle);
      }
      for(const offset of [0.32,0.92]) addBar(mullions,[(x1+x2)/2,y+offset,(z1+z2)/2],[length,.025,.045],angle);
      // Real support columns sit behind the outer glazing, not on a blank plinth.
      for (let k = 0; k < length; k += 3.2) {
        const t = i === 0 ? 1 - (k + 0.3) / length : (k + 0.3) / length;
        addBar(terracePosts,[x1+(x2-x1)*t,y+0.68,z1+(z2-z1)*t],[0.12,1.36,0.12]);
      }
    });
    slab(polygon,y+1.36,floor < 2 ? 0.08 : 0.22,band);
    const planting = polygon.map(([x, z]) => [
      podiumOffset + (x - podiumOffset) * 0.984, -7 + (z + 7) * 0.984,
    ]);
    const terraceSurface = floor < 2 ? 1.44 : 1.58;
    slab(planting, y + terraceSurface, 0.035, grass);
    // Interior floor plates and partitions visible through the perimeter glazing.
    box(39,0.07,6.5,podiumOffset,y+0.1,-4.9,inside);
  }
  instances(unitBox,band,terracePosts);

  // Folded stainless shading module. Raised creases catch light independently.
  const panel = new T.BufferGeometry();
  const p = [-.5,-.5,0, .5,-.5,0, .43,-.02,.19, .5,.5,.025, -.5,.5,.025, -.43,.02,.19];
  panel.setAttribute('position',new T.Float32BufferAttribute(p,3));
  panel.setIndex([0,1,2,0,2,5,5,2,3,5,3,4]); panel.computeVertexNormals();
  function facade(cx,cy,cz,width,height,normal,front = true) {
    const cols = Math.round(width/0.28), rows = 32;
    const w = width/cols, h = height/rows;
    const rotation = Math.atan2(normal[0],normal[1]);
    for (let col=0;col<cols;col++) for (let row=0;row<rows;row++) {
      // Four storeys of tall, grouped openings; the screen remains three-dimensional.
      const gx=col%7, gy=row%8;
      const opening = front ? gx>=2 && gx<=4 && gy>=1 && gy<=6 : gx>=2 && gx<=3 && gy>=2 && gy<=5;
      if(opening) {
        const startRow = front ? 1 : 2;
        const windowColumns = front ? 3 : 2, windowRows = front ? 6 : 4;
        if (gx === 2 && gy === startRow && col + windowColumns <= cols && random() > 0.22) {
          const u = -width/2+(col+windowColumns/2)*w;
          windowPlacements.push({ position:[cx+u*Math.cos(rotation)-normal[0]*.07,cy+(row+windowRows/2)*h,cz-u*Math.sin(rotation)-normal[1]*.07],scale:[w*windowColumns*.96,h*windowRows*.96,.018],rotation,variation:.7+random()*.3 });
        }
        continue;
      }
      const u = -width/2+(col+.5)*w;
      shadePanels.push({position:[cx+u*Math.cos(rotation)+normal[0]*.065,cy+(row+.5)*h,cz-u*Math.sin(rotation)+normal[1]*.065],scale:[w*.94,h*.91,.20],rotation,variation:.88+random()*.20});
    }
    for (let col=0;col<=cols;col++) {
      if(col%7!==2 && col%7!==5) continue;
      const u=-width/2+col*w;
      addBar(mullions,[cx+u*Math.cos(rotation)-normal[0]*.05,cy+height/2,cz-u*Math.sin(rotation)-normal[1]*.05],[.025,height,.035],rotation);
    }
    // Fine transoms behind the screen reveal the separate floors and window depth.
    for(let story=1;story<4;story++) {
      const y=cy+height/4*story;
      addBar(mullions,[cx,y,cz],[width,.045,.04],rotation);
    }
  }
  const blocks = [
    { x:-17.15,z:-.15,w:13.8,d:18.7,y:3.12,h:8.15 },
    { x:1.25,z:-2.1,w:13.25,d:13.8,y:4.68,h:6.55 },
    { x:18.3,z:-.6,w:11.45,d:17.4,y:4.68,h:6.85 },
  ];
  for(const b of blocks) {
    const top=b.y+b.h;
    box(b.w-.25,b.h-.14,b.d-.25,b.x,b.y+b.h/2,b.z,glass);
    box(b.w-.85,b.h-.55,b.d-.85,b.x,b.y+b.h/2,b.z,inside);
    facade(b.x,b.y,b.z+b.d/2,b.w,b.h,[0,1],true);
    facade(b.x,b.y,b.z-b.d/2,b.w,b.h,[0,-1],false);
    facade(b.x+b.w/2,b.y,b.z,b.d,b.h,[1,0],false);
    facade(b.x-b.w/2,b.y,b.z,b.d,b.h,[-1,0],false);
    box(b.w+.12,.11,b.d+.12,b.x,top+.015,b.z,band);
    // Roof surface, parapet and technical rooms are visibly set back from the screen.
    box(b.w-.5,.09,b.d-.5,b.x,top+.12,b.z,roof);
    for(const x of [-1,1]) box(.065,.3,b.d,b.x+x*b.w/2,top+.22,b.z,metal);
    for(const z of [-1,1]) box(b.w,.3,.065,b.x,top+.22,b.z+z*b.d/2,metal);
    const roomZ=b.z-b.d*.2;
    box(b.w*.54,.88,b.d*.38,b.x,top+.54,roomZ,rooftop);
    box(b.w*.57,.08,b.d*.40,b.x,top+1.02,roomZ,band);
    for(let i=0;i<4;i++) {
      const x=b.x-b.w*.28+i*b.w*.18;
      box(.68,.28,1.08,x,top+.27,b.z+2.5,rooftop);
      pipePlacements.push({position:[x,top+.71,roomZ],scale:[.17,1.15,.17]});
    }
  }
  instances(panel,metal,shadePanels);
  instances(unitBox,frame,mullions);
  instances(unitBox,windowLight,windowPlacements);
  // Tall, recessed atria join the laboratory fingers and reach the courtyard floor.
  for(const atrium of [{x:-8.1,w:4.3,z:-1.9,d:12.7,h:10.9},{x:10.15,w:4.4,z:-2.15,d:12.2,h:11.15}]) {
    const a=atrium;
    box(a.w,a.h,a.d,a.x,a.h/2,a.z,glass);
    for(let y=.7;y<a.h;y+=.86) box(a.w+.05,.045,.055,a.x,y,a.z+a.d/2,band);
    for(let x=-a.w/2;x<=a.w/2;x+=.62) box(.04,a.h,.055,a.x+x,a.h/2,a.z+a.d/2,frame);
    for(let y=1.5;y<a.h;y+=1.55) {
      box(a.w,.085,3.1,a.x,y,a.z-1.6,band);
      box(a.w-.1,.028,.06,a.x,y-.055,a.z+1.3,lampLight);
    }
    box(a.w+.16,.19,a.d+.16,a.x,a.h+.09,a.z,rooftop);
  }
  // A long, inset mechanical spine above the screened front volumes.
  box(30.4,1.1,4.1,1.1,12.05,-5.8,rooftop);
  box(30.8,.11,4.3,1.1,12.65,-5.8,band);
  const pipeGeometry=new T.CylinderGeometry(1,1,1,12); instances(pipeGeometry,rooftop,pipePlacements);
  // Thin rooftop ducts, vents and stack pairs, grouped rather than random clutter.
  for(const x of [-10.4,-3,4.4,11.7]) {
    box(1.5,.37,1.1,x,12.83,-5.5,rooftop);
    box(.12,.65,.12,x-.35,13.2,-5.5,metal);
    box(.12,.65,.12,x+.35,13.2,-5.5,metal);
  }
  // The courtyard ground and building-side walk share the podium's actual edge.
  const courtyardEdge = tier(1).slice(3);
  const gardenEdge = [
    [-24, 16], [-25, 23], [-20, 29], [-9, 35],
    [4, 39], [17, 38], [31, 33], [40, 25], [40, 17],
  ];
  slab([...courtyardEdge, ...gardenEdge], -.23, .045, ground);
  slab([
    ...courtyardEdge,
    ...courtyardEdge.map(([x, z]) => [x, z + 1.5]).reverse(),
  ], -.185, .045, path);
  const lawn = [[3, 20], [7, 16], [14, 15.7], [19, 21], [25, 24],
    [24, 29], [16, 34], [8, 34], [1, 28]];
  const lawnWalk = lawn.map(([x, z]) => [13 + (x - 13) * 1.12, 25 + (z - 25) * 1.14]);
  slab(lawnWalk, -.185, .05, path);
  slab(lawn, -.135, .025, grass);
  // Connect the lawn loop to the terrace walk and both side approaches.
  function walkBetween([x1, z1], [x2, z2], width) {
    const walk = box(width, .045, Math.hypot(x2 - x1, z2 - z1),
      (x1 + x2) / 2, -.163, (z1 + z2) / 2, path);
    walk.rotation.y = Math.atan2(x2 - x1, z2 - z1);
  }
  walkBetween([8, 13.7], [8, 16], 1.45);
  walkBetween([-22, 23], [1.5, 29.4], 1.25);
  walkBetween([25.2, 27], [36.6, 20], 1.25);
  box(1.7,.06,39,-27.8,-.13,6.5,road);
  box(54,.06,1.9,0,-.13,-12.5,road);
  // Terrace furniture and rails give the lower floors a readable human scale.
  for(const [x,z,y] of [[-16,18,1.475],[-15,15.7,3.035],[20,14,1.475],[19,10.5,3.035],[-6,12,4.735]]) {
    const benchX = x + podiumOffset;
    box(.7,.08,.25,benchX,y+.24,z,bench);
    box(.05,.25,.22,benchX-.25,y+.1,z,frame); box(.05,.25,.22,benchX+.25,y+.1,z,frame);
  }
  // Low, faceted bicycle shelter beside the left entrance, visible in the references.
  const shelter=new T.ConeGeometry(1.25,.72,3);shelter.rotateY(Math.PI/6);
  for(const [x,z]of[[-24.2,19],[-22.7,19.8],[-23.6,21]]){mesh(shelter,metal,x,.85,z);box(.07,.65,.07,x,.25,z,frame);}
  const crowns=[], trunks=[];
  for(const [x,z]of[[-27,4],[-27,10],[-26,15],[-23,24.5],[-19,27],[-14,31],[-7,34],[2,36],[12,36.8],[24,32],[29,29.7],[35,25],[38,22],[-23.5,-12],[-12,-12],[0,-12],[12,-12],[22,-12]]){
    const height=1.35+random()*.45;
    trunks.push({position:[x,height*.45,z],scale:[.055,height,.055]});
    crowns.push({position:[x,height+0.3,z],scale:[.65+random()*.18,.9,.65],variation:.8+random()*.28});
  }
  for (const [x, z] of [[-12, 24.7], [-8, 25.8], [-4, 26.8], [28, 24], [30, 23], [33, 21.6]]) {
    crowns.push({ position: [x, .06, z], scale: [.72, .33, .55], variation: .8 });
  }
  instances(new T.CylinderGeometry(1,1,1,7),trunk,trunks);
  instances(new T.IcosahedronGeometry(1,2),tree,crowns);
  for (const [x,z] of [[-12,26.6],[7,14.7],[1,30],[26,27.7],[34,22.3]]) {
    box(.055,1.03,.055,x,.3,z,frame);
    box(.20,.05,.12,x,.84,z,lampLight);
  }
  function transitionTo(next) {
    const colors = [...materials].map(([mat,key]) => ({mat,from:mat.color.clone(),to:new T.Color(mat === windowLight ? (next.dark ? next['window-light'] : next.glass) : next[key])}));
    const glow = [windowLight,lampLight].map((mat,index) => ({mat,from:mat.emissiveIntensity,to:next.dark ? (index === 0 ? 1.2 : 2) : 0,fromColor:mat.emissive.clone(),toColor:new T.Color(next['window-light'])}));
    const shadowFrom = shadowMaterial.opacity, shadowTo = next.dark ? .28 : .17;
    return amount => {
      for(const {mat,from,to} of colors)mat.color.copy(from).lerp(to,amount);
      for(const {mat,from,to,fromColor,toColor} of glow){mat.emissiveIntensity=from+(to-from)*amount;mat.emissive.copy(fromColor).lerp(toColor,amount);}
      shadowMaterial.opacity=shadowFrom+(shadowTo-shadowFrom)*amount;
    };
  }
  function recolor(next) { transitionTo(next)(1); }
  recolor(palette);
  function dispose() { for(const geometry of geometries)geometry.dispose();for(const mat of materials.keys())mat.dispose(); }
  group.rotation.y=-.06;
  return {group,recolor,transitionTo,dispose};
}
