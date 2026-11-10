export const SEC_POSTER_SIZE = { width: 728, height: 603 };

// The first-floor rear landing is inside the SEC; the hall faces +X, as marked
// in the supplied building view. A defocused passage conceals the exterior wall.
export function createSECJourney(T, hallFrame) {
  hallFrame.updateWorldMatrix(true, false);
  const local = values => hallFrame.localToWorld(new T.Vector3(...values));
  const world = values => new T.Vector3(...values);
  // A single path keeps the street-side approach, bends through the wall and
  // aligns with the vestibule before rising into the lecture hall.
  const orbit = [[-49,38,77],[-77,35,37],[-76,31,-15],[-40,28,-62]].map(world);
  const approach = [
    world([-29,15,-43]),world([-21,5,-25]),
    local([-38,5.95,37.8]),local([-32,5.95,37]),
  ];
  const passage = [local([-9,5.95,35.5]),local([-3.8,5.95,34.8]),local([-1.6,5.95,32])];
  const walk = [
    local([-.6,5.95,28]),
    local([0,5.95,25]),local([0,5.95,23]),local([0,5.95,21]),
    local([0,5.95,19]),local([0,5.95,17.3]),
    local([-.3,6.7,13.7]),local([-1.2,8.2,10.8]),
  ];
  const path = new T.CatmullRomCurve3([...orbit,...approach,...passage,...walk],false,'catmullrom',.35);
  const samplesPerSegment = 80;
  path.arcLengthDivisions = (path.points.length-1)*samplesPerSegment;
  const lengths = path.getLengths();
  const scrollStops = [0,.42,.62,.72,1];
  const pointStops = [0,orbit.length-1,orbit.length+approach.length-1,orbit.length+approach.length+passage.length-1,path.points.length-1];
  const distances = pointStops.map(index=>lengths[index*samplesPerSegment]);
  const speeds = distances.slice(1).map((distance,index)=>(distance-distances[index])/(scrollStops[index+1]-scrollStops[index]));
  // Share the speed on both sides of each join. The harmonic mean keeps the
  // distance increasing as the broad exterior orbit slows into the short walk.
  const stopSpeeds = [0,...speeds.slice(1).map((speed,index)=>2/(1/speed+1/speeds[index])),0];
  const buildingTarget = new T.Vector3(0,4,8), wallTarget = local([-12,5.95,31]);
  const outerDoorTarget = local([0,5.95,23]), screenTarget = local([0,3.7,-18.5]);
  const clamp = value => Math.max(0,Math.min(1,value));
  const ease = value => value*value*(3-2*value);
  return {
    sample(progress, aspect) {
      const stage = progress < .42 ? 0 : progress < .62 ? 1 : progress < .72 ? 2 : 3;
      const span = scrollStops[stage+1]-scrollStops[stage];
      const fraction = clamp((progress-scrollStops[stage])/span);
      const rest = 1-fraction;
      const start = distances[stage], end = distances[stage+1];
      const control1 = start+stopSpeeds[stage]*span/3;
      const control2 = end-stopSpeeds[stage+1]*span/3;
      const distance = rest**3*start+3*rest**2*fraction*control1+3*rest*fraction**2*control2+fraction**3*end;
      const position = path.getPointAt(distance/distances.at(-1));
      let target, fov, inside = false, blur = 0, opacity = 1;
      const t = ease(fraction);
      const exteriorScale = Math.max(1.14,1.3/aspect);
      if(stage === 0) {
        // Match the poster's contained projection until the scroll orbit starts.
        const posterAspect = SEC_POSTER_SIZE.width / SEC_POSTER_SIZE.height;
        const fit = Math.min(1, aspect / posterAspect);
        const openingFov = T.MathUtils.radToDeg(2 * Math.atan(Math.tan(T.MathUtils.degToRad(33 / 2)) / fit));
        position.multiplyScalar(T.MathUtils.lerp(1.14,exteriorScale,t));
        target = buildingTarget.clone(); fov = T.MathUtils.lerp(openingFov,33,t);
      } else if(stage === 1) {
        position.multiplyScalar(T.MathUtils.lerp(exteriorScale,1,t));
        target = buildingTarget.clone().lerp(wallTarget,t);
        fov = 33;
      } else if(stage === 2) {
        // Change lenses under peak blur so the view never visibly zooms out.
        const transit = ease(clamp((fraction-.38)/.24));
        target = wallTarget.clone().lerp(outerDoorTarget,transit);
        fov = T.MathUtils.lerp(33,94,transit);
        const defocus = Math.sin(Math.PI*fraction);
        blur = 18*defocus;
        opacity = 1-defocus*defocus;
        inside = fraction >= .5;
      } else {
        const eye = hallFrame.worldToLocal(position.clone());
        const reveal = ease(clamp((eye.y-5.95)/(8.2-5.95)));
        target = local([0,5.95,Math.min(23,eye.z-9)]).lerp(screenTarget,reveal);
        fov = 94-26*t; inside = true;
      }
      const localZ = inside ? hallFrame.worldToLocal(position.clone()).z : Infinity;
      // Each pair opens ahead of the camera, then closes on a reverse approach.
      const outerDoorOpen = ease(clamp((30-localZ)/5));
      const innerDoorOpen = ease(clamp((23-localZ)/2.4));
      return {position,target,fov,inside,blur,opacity,outerDoorOpen,innerDoorOpen};
    },
  };
}
