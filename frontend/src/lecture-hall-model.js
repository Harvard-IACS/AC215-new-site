// A solid, reference-based teaching hall and entrance foyer. All coordinates are
// local: the projection wall is -Z and the open rear entrance is at +Z.
export function createLectureHallModel(T, palette) {
  const group = new T.Group();
  group.name = 'Lecture hall and entrance foyer';
  const geometries = new Set();
  const materialBindings = [];
  const instanceBatches = new Map();
  const transform = new T.Object3D();
  const boxGeometry = track(new T.BoxGeometry(1, 1, 1));
  const cylinderGeometry = track(new T.CylinderGeometry(1, 1, 1, 16));

  function track(geometry) { geometries.add(geometry); return geometry; }
  function material(key, options = {}, multiplier = 1) {
    const color = new T.Color(palette[key]).multiplyScalar(multiplier);
    const mat = new T.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0, ...options });
    const emissiveKey = options.emissive ? key : null;
    materialBindings.push({ mat, key, multiplier, emissiveKey });
    return mat;
  }
  const wall = material('room-wall');
  const acousticShadow = material('room-wall', {}, 0.66);
  const wood = material('room-wood');
  const woodLight = material('room-wood', {}, 1.065);
  const woodDark = material('room-wood', {}, 0.88);
  const ceiling = material('room-ceiling', { side: T.DoubleSide });
  const ceilingDark = material('room-ceiling', { side: T.DoubleSide }, 0.93);
  const ceilingLight = material('room-ceiling', { side: T.DoubleSide }, 1.035);
  const seatMaterials = ['room-seat-red', 'room-seat-orange', 'room-seat-gold'].map(key => material(key, { roughness: 0.93 }));
  const rail = material('room-rail', { metalness: 0.72, roughness: 0.32 });
  const trim = material('room-trim', { roughness: 0.56, metalness: 0.23 });
  const screen = material('room-screen', { emissive: palette['room-screen'], emissiveIntensity: 0.55, roughness: 0.94 });
  const foyerFloor = material('room-foyer-floor', { roughness: 0.36, metalness: 0.08 });
  const foyerWall = material('room-foyer-wall');
  const yellow = material('room-foyer-yellow', { roughness: 0.45 });
  const light = material('room-light', { emissive: palette['room-light'], emissiveIntensity: 1.5, roughness: 0.3 });

  function mesh(geometry, mat, position = [0, 0, 0]) {
    const item = new T.Mesh(geometry, mat);
    item.position.set(...position);
    item.receiveShadow = true;
    item.castShadow = false;
    group.add(item);
    return item;
  }
  function instance(geometry, mat, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
    let byMaterial = instanceBatches.get(geometry);
    if (!byMaterial) { byMaterial = new Map(); instanceBatches.set(geometry, byMaterial); }
    if (!byMaterial.has(mat)) byMaterial.set(mat, []);
    byMaterial.get(mat).push({ position, scale, rotation });
  }
  const box = (w, h, d, x, y, z, mat, rotation) => instance(boxGeometry, mat, [x, y, z], [w, h, d], rotation);
  const cylinder = (r, h, x, y, z, mat, rotation) => instance(cylinderGeometry, mat, [x, y, z], [r, h, r], rotation);
  function bar(a, b, radius = 0.025, mat = rail) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b);
    const middle = start.clone().add(end).multiplyScalar(0.5);
    transform.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), end.clone().sub(start).normalize());
    const rotation = new T.Euler().setFromQuaternion(transform.quaternion);
    instance(cylinderGeometry, mat, middle.toArray(), [radius, start.distanceTo(end), radius], [rotation.x, rotation.y, rotation.z]);
  }
  function roundedBox(w, h, d, radius) {
    // A beveled extrusion keeps the upholstery solid and softly rounded at close range.
    const x = -w / 2 + radius, y = -h / 2 + radius;
    const shape = new T.Shape();
    shape.moveTo(x, y); shape.lineTo(-x, y); shape.lineTo(-x, -y);
    shape.lineTo(x, -y); shape.closePath();
    const geometry = new T.ExtrudeGeometry(shape, {
      depth: Math.max(0.01, d - radius * 2), steps: 1,
      bevelEnabled: true, bevelSegments: 3, bevelSize: radius,
      bevelThickness: radius, curveSegments: 3,
    });
    geometry.translate(0, 0, -(d - radius * 2) / 2);
    return track(geometry);
  }

  const hallWidth = 40;
  const hallCeilingY = 10.5;
  const landingY = 4.3;
  const rows = 8;
  // Bring the last main row toward the raised rear banks, leaving a compact aisle.
  const rowSpacing = 2.65;
  const firstRowZ = -9.3;
  const rowRadius = 46;
  const sag = x => rowRadius - Math.sqrt(rowRadius * rowRadius - x * x);
  const doorCenters = [-17, 0, 17];
  const doorWidth = 3.2;
  const doorHeight = 3.4;
  const centerDoorPivots = { outer: [], inner: [] };

  // Each curved tier extends to the rear wall. Stacking these full-depth solids
  // produces continuous risers without gaps between the curved seating banks.
  box(hallWidth, 0.3, 38, 0, -0.15, 0, wood);
  box(hallWidth, 0.18, 5.4, 0, 0.09, -16.3, woodLight);
  for (let row = 0; row < rows; row++) {
    const baseZ = firstRowZ + row * rowSpacing;
    const floorY = (row + 1) * landingY / rows;
    const outline = new T.Shape();
    for (let segment = 0; segment <= 48; segment++) {
      const x = -20 + segment * 40 / 48;
      const z = baseZ - rowSpacing / 2 - sag(x);
      if (segment === 0) outline.moveTo(x, -z); else outline.lineTo(x, -z);
    }
    outline.lineTo(20, -19); outline.lineTo(-20, -19); outline.closePath();
    const geometry = track(new T.ExtrudeGeometry(outline, { depth: landingY / rows, steps: 1, bevelEnabled: false }));
    geometry.rotateX(-Math.PI / 2);
    geometry.name = `Curved tier ${row + 1}`;
    mesh(geometry, row % 3 === 0 ? woodLight : wood, [0, row * landingY / rows, 0]);
    for (let segment = 0; segment < 48; segment++) {
      const x1 = -20 + segment * 40 / 48, x2 = -20 + (segment + 1) * 40 / 48;
      bar([x1, floorY + 0.014, baseZ - rowSpacing / 2 - sag(x1)], [x2, floorY + 0.014, baseZ - rowSpacing / 2 - sag(x2)], 0.017, woodDark);
    }
    for (let x = -19.6; x < 20; x += 0.74) {
      box(0.012, 0.008, rowSpacing - 0.06, x, floorY + 0.006, baseZ - sag(x), woodDark);
    }
    for (const x of [-18, -6.8, 6.8, 18]) box(0.16, 0.025, 0.04, x, floorY + 0.026, baseZ - rowSpacing / 2 - sag(x) + 0.06, light);
  }
  box(44, 0.18, 18, 0, landingY - 0.09, 32, foyerFloor);
  for (const x of doorCenters) box(4.8, 0.18, 4, x, landingY - 0.09, 21, foyerFloor);

  // Acoustic hall walls have three rear openings, each leading to a vestibule.
  box(40.35, hallCeilingY, 0.22, 0, hallCeilingY / 2, -19, wall);
  for (const x of [-20, 20]) box(0.22, hallCeilingY, 38, x, hallCeilingY / 2, 0, wall);
  const rearWallHeight = hallCeilingY - landingY;
  for (const [left, right] of [[-20, -18.6], [-15.4, -1.6], [1.6, 15.4], [18.6, 20]]) {
    box(right - left, rearWallHeight, 0.24, (left + right) / 2, landingY + rearWallHeight / 2, 19, wall);
  }
  for (const x of doorCenters) {
    const lintelHeight = hallCeilingY - landingY - doorHeight;
    box(doorWidth, lintelHeight, 0.24, x, hallCeilingY - lintelHeight / 2, 19, wall);
  }
  for (const x of [-19.85, 19.85]) {
    for (let z = -17.5; z < 18.5; z += 1.35) {
      box(0.055, 10, 0.026, x, 5.3, z, acousticShadow);
      box(0.08, 0.035, 1.26, x, 5.3, z + 0.63, acousticShadow);
    }
  }
  for (let x = -19.5; x <= 19.5; x += 1.4) box(0.035, 9.2, 0.035, x, 5.3, -18.84, acousticShadow);
  box(39.7, 0.14, 0.18, 0, 0.35, -18.8, trim);

  // Reference-based approximation: 240 main seats and 60 raised rear seats.
  const seatGeometry = roundedBox(0.76, 0.15, 0.66, 0.055);
  const backGeometry = roundedBox(0.76, 0.89, 0.18, 0.065);
  const endGeometry = roundedBox(0.11, 0.74, 0.69, 0.035);
  seatGeometry.name = 'Hall seat cushion';
  backGeometry.name = 'Hall seat back';
  const leftSeats = Array.from({ length: 9 }, (_, i) => -16 + i * 0.96);
  const middleSeats = Array.from({ length: 12 }, (_, i) => -5.28 + i * 0.96);
  const rightSeats = Array.from({ length: 9 }, (_, i) => 8.32 + i * 0.96);
  const seatColumns = [...leftSeats, ...middleSeats, ...rightSeats];
  const rearSeatColumns = [
    ...Array.from({ length: 15 }, (_, i) => -16 + i * 0.96),
    ...Array.from({ length: 15 }, (_, i) => 2.56 + i * 0.96),
  ];
  const rearRows = [{ baseZ: 13, floorY: 4.7 }, { baseZ: 15.2, floorY: 5.15 }];
  const rearRadius = 54;
  const rearSag = x => rearRadius - Math.sqrt(rearRadius * rearRadius - x * x);
  Object.assign(group.userData, {
    hallSeatCount: 300,
    mainHallSeatCount: rows * seatColumns.length,
    rearHallSeatCount: rearRows.length * rearSeatColumns.length,
    mainHallRows: rows,
    rearHallRows: rearRows.length,
    rearSeatBanks: [15, 15],
    hallSeatBanks: [9, 12, 9],
    rearDoorwayCount: doorCenters.length,
    doubleDoorSetCount: doorCenters.length * 2,
    curvedRowRadius: rowRadius,
    rearCurvedRowRadius: rearRadius,
  });
  function placeChair(x, y, baseZ, radius, row, column) {
    const z = baseZ - (radius - Math.sqrt(radius * radius - x * x));
    const yaw = Math.asin(x / radius), cos = Math.cos(yaw), sin = Math.sin(yaw);
    const mat = seatMaterials[(row * 7 + column * 3 + Math.floor(column / 2)) % 7 < 3 ? 0 : (row + column) % 2 + 1];
    // Compose every part about one chair origin so all upholstery, arms and
    // supports rotate together, including the rear section's gentler curve.
    const chairPart = (geometry, material, offset, scale = [1, 1, 1], tilt = 0) => {
      const position = [x + cos * offset[0] + sin * offset[2], y + offset[1], z - sin * offset[0] + cos * offset[2]];
      const quaternion = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), yaw);
      if (tilt) quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), tilt));
      const rotation = new T.Euler().setFromQuaternion(quaternion);
      instance(geometry, material, position, scale, [rotation.x, rotation.y, rotation.z]);
    };
    chairPart(seatGeometry, mat, [0, 0.54, -0.06]);
    chairPart(backGeometry, mat, [0, 1.04, 0.28], [1, 1, 1], 0.1);
    for (const side of [-1, 1]) {
      chairPart(endGeometry, mat, [side * 0.345, 0.47, 0.02]);
      chairPart(boxGeometry, trim, [side * 0.345, 0.86, -0.01], [0.11, 0.055, 0.65]);
      chairPart(boxGeometry, trim, [side * 0.32, 0.22, 0.12], [0.055, 0.43, 0.06]);
    }
    chairPart(boxGeometry, trim, [0, 0.1, 0.13], [0.7, 0.065, 0.12]);
  }
  for (let row = 0; row < rows; row++) {
    seatColumns.forEach((x, column) => placeChair(x, (row + 1) * landingY / rows, firstRowZ + row * rowSpacing, rowRadius, row, column));
  }

  // Raised rear platforms occupy only the two banks. Their curved front edges
  // preserve the broad cross-aisle, the center spine and the rear door landing.
  for (let row = 0; row < rearRows.length; row++) {
    const { baseZ, floorY } = rearRows[row];
    const bottomY = row === 0 ? landingY : rearRows[row - 1].floorY;
    for (const [left, right] of [[-16.6, -1.85], [1.85, 16.6]]) {
      const outline = new T.Shape();
      for (let segment = 0; segment <= 24; segment++) {
        const x = left + segment * (right - left) / 24;
        const frontZ = baseZ - 0.95 - rearSag(x);
        if (segment === 0) outline.moveTo(x, -frontZ); else outline.lineTo(x, -frontZ);
      }
      outline.lineTo(right, -16.6); outline.lineTo(left, -16.6); outline.closePath();
      const geometry = track(new T.ExtrudeGeometry(outline, { depth: floorY - bottomY, steps: 1, bevelEnabled: false }));
      geometry.rotateX(-Math.PI / 2); geometry.name = `Rear platform ${row + 1}`;
      mesh(geometry, row === 0 ? woodLight : wood, [0, bottomY, 0]);
      for (let segment = 0; segment < 24; segment++) {
        const x1 = left + segment * (right - left) / 24, x2 = left + (segment + 1) * (right - left) / 24;
        bar([x1, floorY + 0.014, baseZ - 0.95 - rearSag(x1)], [x2, floorY + 0.014, baseZ - 0.95 - rearSag(x2)], 0.017, woodDark);
      }
    }
    rearSeatColumns.forEach((x, column) => placeChair(x, floorY, baseZ, rearRadius, row + rows, column));
  }
  // Silver rear guards and short stair rails echo the raised section in the photo.
  for (const side of [-1, 1]) {
    const innerX = side * 1.9, outerX = side * 16.6;
    bar([innerX, 5.74, 12.2], [innerX, 5.74, 14.2], 0.035);
    bar([innerX, 5.74, 14.2], [innerX, 6.19, 14.7], 0.035);
    bar([innerX, 6.19, 14.7], [innerX, 6.19, 16.6], 0.035);
    bar([innerX, 6.19, 16.6], [outerX, 6.19, 16.6], 0.035);
    bar([innerX, 5.8, 16.6], [outerX, 5.8, 16.6], 0.024);
    for (const x of [innerX, side * 6.8, side * 11.6, outerX]) {
      bar([x, 5.18, 16.6], [x, 6.19, 16.6], 0.026);
    }
    for (const [z, base, top] of [[12.2, 4.7, 5.74], [14.2, 4.7, 5.74], [14.7, 5.15, 6.19]]) {
      bar([innerX, base, z], [innerX, top, z], 0.026);
    }
    // Short outer-bank stairs leave the central spine and rear landing clear.
    for (const [z, top] of [[16.95, 4.5], [16.6, 4.7], [16.25, 4.925], [15.9, 5.15]]) {
      box(1.2, top - landingY, 0.36, side * 17.05, (top + landingY) / 2, z, woodLight);
    }
    bar([side * 17.7, 5.34, 17.1], [side * 17.7, 6.19, 15.8], 0.035);
  }

  // Silver rails follow the rise along bank edges, leaving both inner aisles clear.
  for (const x of [-17.1, -7.85, 7.85, 17.1]) {
    const sideSag = sag(x);
    for (let row = 0; row < rows - 1; row++) {
      const z1 = firstRowZ + row * rowSpacing - sideSag;
      const z2 = firstRowZ + (row + 1) * rowSpacing - sideSag;
      const y1 = (row + 1) * landingY / rows, y2 = (row + 2) * landingY / rows;
      bar([x, y1 + 1.04, z1], [x, y2 + 1.04, z2], 0.035);
      bar([x, y1 + 0.65, z1], [x, y2 + 0.65, z2], 0.024);
    }
    for (let row = 0; row < rows; row += 2) {
      const z = firstRowZ + row * rowSpacing - sideSag;
      const y = (row + 1) * landingY / rows;
      bar([x, y + 0.05, z], [x, y + 1.04, z], 0.026);
    }
  }

  // Outer-wall columns stand beyond the generously spaced outer aisles.
  for (const [x, z] of [[-19.45, -3], [19.45, -3], [-19.45, 11.8], [19.45, 11.8]]) {
    const tier = Math.max(0, Math.min(rows, Math.floor((z + sag(x) - firstRowZ + rowSpacing / 2) / rowSpacing) + 1));
    const floorY = tier * landingY / rows;
    cylinder(0.34, hallCeilingY - floorY, x, (hallCeilingY + floorY) / 2, z, foyerWall);
    cylinder(0.355, 1.0, x, floorY + 0.5, z, seatMaterials[0]);
    cylinder(0.4, 0.1, x, hallCeilingY - 0.15, z, trim);
  }

  // The center screen is visibly larger in both axes than its flanking screens.
  for (const x of [-13, 0, 13]) {
    const width = x === 0 ? 13.4 : 9.8, height = x === 0 ? 6.4 : 5.4;
    box(width + 0.35, height + 0.4, 0.18, x, 6, -18.73, trim);
    box(width, height, 0.045, x, 6, -18.6, screen);
    box(width + 0.4, 0.12, 0.28, x, 6 + height / 2 + 0.25, -18.66, rail);
    box(0.07, 1.05, 0.07, x, 9.85, -1.5, rail);
    box(0.92, 0.43, 0.74, x, 9.15, -1.5, trim);
    box(0.79, 0.035, 0.61, x, 9.39, -1.5, acousticShadow);
    cylinder(0.12, 0.15, x + 0.23, 9.15, -1.915, acousticShadow, [Math.PI / 2, 0, 0]);
    cylinder(0.082, 0.012, x + 0.23, 9.15, -1.997, rail, [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 5; i++) box(0.04, 0.18, 0.015, x - 0.31 + i * 0.07, 9.14, -1.121, acousticShadow);
  }
  // Teaching furniture remains human-sized despite the much larger room.
  box(2.8, 0.09, 0.85, -8, 1.02, -15.8, woodDark);
  for (const x of [-9.05, -6.95]) box(0.08, 0.88, 0.56, x, 0.54, -15.8, rail);
  box(0.95, 1.05, 0.68, -2.6, 0.7, -15.8, woodDark);
  box(1.08, 0.08, 0.79, -2.6, 1.26, -15.8, trim, [0.1, 0, 0]);
  box(0.53, 0.34, 0.035, -8, 1.27, -15.8, trim, [-0.16, 0, 0]);

  // Triangular ceiling panels are shallow closed prisms, not a photograph or plane.
  const ceilingPositions = [[], [], []];
  function triangularPanel(points, tone) {
    const positions = ceilingPositions[tone];
    const top = points.map(([x, y, z]) => [x, y + 0.065, z]);
    const triangle = (a, b, c) => positions.push(...a, ...b, ...c);
    triangle(points[0], points[2], points[1]);
    triangle(top[0], top[1], top[2]);
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      triangle(points[i], points[j], top[j]); triangle(points[i], top[j], top[i]);
    }
  }
  const ceilingPoint = (column, row) => [
    -20 + column * 5,
    10.3 + Math.sin(column * 1.4 + row * 0.8) * 0.13,
    -19 + row * 4.75,
  ];
  for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) {
    const a = ceilingPoint(column, row), b = ceilingPoint(column + 1, row);
    const c = ceilingPoint(column + 1, row + 1), d = ceilingPoint(column, row + 1);
    triangularPanel([a, b, c], (row + column) % 3);
    triangularPanel([a, c, d], (row * 2 + column + 1) % 3);
  }
  ceilingPositions.forEach((positions, index) => {
    const geometry = track(new T.BufferGeometry());
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    mesh(geometry, [ceiling, ceilingDark, ceilingLight][index]);
  });
  // Recessed warm downlights and teaching-wall light tracks.
  for (const x of [-16, -8, 0, 8, 16]) for (const z of [-15, -7.5, 0, 7.5, 15]) {
    cylinder(0.14, 0.055, x, 10.12, z, trim);
    cylinder(0.105, 0.012, x, 10.085, z, light);
  }
  for (const x of [-17, 17]) box(0.06, 0.045, 13, x, 10.04, -11.7, light);

  // Two similar white double-door sets enclose each four-meter vestibule.
  // Central leaves are real hinge groups; their animation is driven by the caller.
  const whiteDoor = material('room-foyer-wall', { roughness: 0.5, metalness: 0.03 });
  function pivotBox(parent, w, h, d, x, y, z, mat) {
    const item = new T.Mesh(boxGeometry, mat);
    item.position.set(x, y, z); item.scale.set(w, h, d);
    item.receiveShadow = true; item.castShadow = false; parent.add(item);
  }
  function doorway(centerX, z, stage) {
    const leafWidth = doorWidth / 2;
    const leafCenter = leafWidth / 2;
    const leafThickness = 0.105;
    for (const side of [-1, 1]) {
      const jambX = centerX + side * doorWidth / 2;
      box(0.13, doorHeight + 0.05, 0.24, jambX + side * 0.065, landingY + doorHeight / 2, z, rail);
      if (centerX === 0) {
        const hinge = new T.Group();
        hinge.name = `${stage} center door ${side < 0 ? 'left' : 'right'} hinge`;
        hinge.position.set(jambX, landingY, z); hinge.userData.side = side;
        group.add(hinge); centerDoorPivots[stage].push(hinge);
        pivotBox(hinge, leafWidth, doorHeight, leafThickness, -side * leafCenter, doorHeight / 2, 0, whiteDoor);
        if (side === -1) {
          pivotBox(hinge, 0.015, doorHeight, 0.008, leafWidth - 0.0075, doorHeight / 2, leafThickness / 2, rail);
        }
        pivotBox(hinge, 0.075, 0.9, 0.055, -side * 1.39, 1.57, 0.085, rail);
        pivotBox(hinge, 1.05, 0.06, 0.07, -side * 0.79, 1.17, 0.105, rail);
        pivotBox(hinge, 1.33, 0.37, 0.015, -side * 0.79, 0.25, 0.065, rail);
      } else {
        const leafX = centerX + side * leafCenter;
        box(leafWidth, doorHeight, leafThickness, leafX, landingY + doorHeight / 2, z, whiteDoor);
        if (side === -1) {
          box(0.015, doorHeight, 0.008, centerX - 0.0075, landingY + doorHeight / 2, z + leafThickness / 2, rail);
        }
        box(0.075, 0.9, 0.055, centerX + side * 0.21, landingY + 1.57, z + 0.085, rail);
        box(1.05, 0.06, 0.07, leafX, landingY + 1.17, z + 0.105, rail);
        box(1.33, 0.37, 0.015, leafX, landingY + 0.25, z + 0.065, rail);
      }
    }
    box(3.48, 0.13, 0.26, centerX, landingY + doorHeight + 0.065, z, rail);
  }
  for (const centerX of doorCenters) {
    doorway(centerX, 23, 'outer'); doorway(centerX, 19, 'inner');
    for (const side of [-1, 1]) box(0.16, 4.05, 4, centerX + side * 2.4, 6.325, 21, foyerWall);
    // Returns around the narrower doorway openings complete the solid vestibule.
    for (const z of [19.16]) {
      for (const side of [-1, 1]) box(0.8, 4.05, 0.14, centerX + side * 2.0, 6.325, z, foyerWall);
      box(3.2, 0.65, 0.14, centerX, 8.025, z, foyerWall);
    }
    box(4.8, 0.15, 4, centerX, 8.425, 21, ceiling);
    cylinder(0.23, 0.025, centerX, 8.335, 21, light);
  }

  // Spacious foyer with a clear central corridor and three parallel vestibule routes.
  box(44.2, 7.5, 0.2, 0, 8.05, 41, foyerWall);
  for (const x of [-22, 22]) box(0.2, 7.5, 18, x, 8.05, 32, foyerWall);
  for (const [left, right] of [[-22, -18.6], [-15.4, -1.6], [1.6, 15.4], [18.6, 22]]) {
    box(right - left, 7.5, 0.18, (left + right) / 2, 8.05, 23, foyerWall);
  }
  for (const x of doorCenters) box(3.2, 4.1, 0.18, x, 9.75, 23, foyerWall);
  // Room identification sits at eye level on the foyer side of the main entrance.
  const plaqueX = -2.26;
  const plaqueY = 6.12;
  box(0.86, 0.32, 0.032, plaqueX, plaqueY, 23.11, rail);
  let plaqueLabel;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#202628';
      context.font = '600 76px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('SEC 1.321', 256, 96);
      const texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
      plaqueLabel = new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
      mesh(track(new T.PlaneGeometry(0.86, 0.32)), plaqueLabel, [plaqueX, plaqueY, 23.128]);
    }
  }
  box(44, 0.16, 18, 0, 11.88, 32, ceiling);
  for (let x = -21.7; x < 22; x += 0.4) box(0.075, 0.2, 17.8, x, 11.7, 32, ceilingDark);
  for (const panelX of [-9, 9]) for (let offset = -1.4; offset < 1.4; offset += 0.11) {
    box(0.052, 4.5, 0.06, panelX + offset, 6.55, 23.14, wood);
  }
  box(43.7, 0.065, 0.035, 0, 11.3, 40.86, light);
  for (const x of [-20.5, 20.5]) {
    cylinder(0.42, 7.5, x, 8.05, 33, foyerWall);
    cylinder(0.47, 0.12, x, 4.36, 33, trim);
  }
  const cafeSeat = roundedBox(0.55, 0.08, 0.54, 0.025);
  const cafeBack = roundedBox(0.54, 0.58, 0.065, 0.025);
  // Frame the approach with two seating groups outside the center aisle.
  const tablePositions = [[-13.8, 27.5], [-5.7, 26.5], [-14.6, 37.2], [4.6, 25.8], [14.1, 32.2], [8.2, 37.3]];
  for (const [x, z] of tablePositions) {
    cylinder(0.95, 0.065, x, landingY + 0.9, z, foyerWall);
    cylinder(0.055, 0.86, x, landingY + 0.46, z, rail);
    cylinder(0.4, 0.035, x, landingY + 0.035, z, rail);
    for (let chair = 0; chair < 4; chair++) {
      const angle = chair * Math.PI / 2;
      const cx = x + Math.sin(angle) * 1.35, cz = z + Math.cos(angle) * 1.35;
      instance(cafeSeat, yellow, [cx, landingY + 0.52, cz], [1, 1, 1], [0, angle, 0]);
      instance(cafeBack, yellow, [cx + Math.sin(angle) * 0.23, landingY + 0.79, cz + Math.cos(angle) * 0.23], [1, 1, 1], [0.09 * Math.cos(angle), angle, 0]);
      for (const side of [-1, 1]) for (const front of [-1, 1]) {
        const lx = side * 0.22, lz = front * 0.2;
        const dx = lx * Math.cos(angle) + lz * Math.sin(angle);
        const dz = -lx * Math.sin(angle) + lz * Math.cos(angle);
        cylinder(0.016, 0.48, cx + dx, landingY + 0.25, cz + dz, rail);
      }
    }
  }
  for (const [x, z, radius] of [[-13.8, 27.5, 1.4], [-7.8, 32, 1.5], [-14.6, 37.1, 1.4], [7.8, 27.7, 1.5], [14.1, 32.2, 1.4], [8.2, 37.2, 1.5], [0, 25.4, 1.25]]) {
    cylinder(0.018, 1.2, x, 11.1, z, rail);
    cylinder(radius, 0.1, x, 10.45, z, rail);
    cylinder(radius * 0.96, 0.02, x, 10.385, z, light);
  }

  // Repetitive parts share one geometry/material draw call per batch.
  for (const [geometry, byMaterial] of instanceBatches) for (const [mat, placements] of byMaterial) {
    const batch = new T.InstancedMesh(geometry, mat, placements.length);
    for (let i = 0; i < placements.length; i++) {
      const placement = placements[i];
      transform.position.set(...placement.position);
      transform.rotation.set(...placement.rotation);
      transform.scale.set(...placement.scale);
      transform.updateMatrix(); batch.setMatrixAt(i, transform.matrix);
    }
    batch.instanceMatrix.needsUpdate = true;
    batch.receiveShadow = true;
    batch.castShadow = false;
    group.add(batch);
  }

  // No room light casts a shadow. Screens and fixtures remain warm in both themes.
  const ambient = new T.AmbientLight(palette['room-light'], 0.38);
  group.add(ambient);
  const pointLights = [[0, 9.2, -9], [0, 9.5, 9], [-11, 10, 29], [11, 10, 36]].map(position => {
    const item = new T.PointLight(palette['room-light'], palette.dark ? 15 : 13, 22, 2);
    item.position.set(...position); item.castShadow = false; group.add(item); return item;
  });

  return {
    group,
    // Fractions are clamped to 0..1; zero means closed and one means 100 degrees open.
    setDoorProgress(outer, inner) {
      for (const [stage, value] of [['outer', outer], ['inner', inner]]) {
        const progress = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
        for (const hinge of centerDoorPivots[stage]) {
          // Left leaf rotates +Y and right leaf -Y, both swinging toward -Z.
          hinge.rotation.y = -hinge.userData.side * progress * Math.PI * 100 / 180;
        }
      }
    },
    transitionTo(nextPalette) {
      const colors = materialBindings.map(binding => ({
        ...binding, from: binding.mat.color.clone(),
        to: new T.Color(nextPalette[binding.key]).multiplyScalar(binding.multiplier),
        fromEmissive: binding.emissiveKey ? binding.mat.emissive.clone() : null,
        toEmissive: binding.emissiveKey ? new T.Color(nextPalette[binding.emissiveKey]) : null,
      }));
      const lights = [ambient, ...pointLights].map(item => ({ item, from: item.color.clone(), to: new T.Color(nextPalette['room-light']), intensity: item.intensity }));
      return amount => {
        const t = Math.max(0, Math.min(1, amount));
        colors.forEach(({ mat, from, to, fromEmissive, toEmissive }) => {
          mat.color.lerpColors(from, to, t);
          if (fromEmissive) mat.emissive.lerpColors(fromEmissive, toEmissive, t);
        });
        lights.forEach(({ item, from, to, intensity }) => {
          item.color.lerpColors(from, to, t);
          const target = item === ambient ? 0.38 : nextPalette.dark ? 15 : 13;
          item.intensity = intensity + (target - intensity) * t;
        });
      };
    },
    dispose() {
      plaqueLabel?.map.dispose();
      plaqueLabel?.dispose();
      geometries.forEach(geometry => geometry.dispose());
      materialBindings.forEach(({ mat }) => mat.dispose());
      group.traverse(item => { if (item.isInstancedMesh) item.dispose(); });
      group.clear();
    },
  };
}
