/** Free drag-orbit camera during ceremonies. Pure functions for testing. */
export type RitualOrbit = Readonly<{yaw:number;pitch:number;radius:number}>;
export const DEFAULT_RITUAL_ORBIT: RitualOrbit={yaw:0.67,pitch:0.31,radius:3.5};

function clamp(value:number,low:number,high:number):number{
  return Math.min(high,Math.max(low,value));
}

export function dragRitualOrbit(orbit:RitualOrbit,dx:number,dy:number):RitualOrbit {
  return {
    yaw: orbit.yaw - dx * 0.005,
    pitch: clamp(orbit.pitch + dy * 0.004,-0.28,1.05),
    radius: orbit.radius,
  };
}
export function zoomRitualOrbit(orbit:RitualOrbit,deltaY:number):RitualOrbit{
  return {...orbit,radius:clamp(orbit.radius+deltaY*0.003,2.6,5.5)};
}
export function getRitualCameraPosition(
  center:Readonly<{x:number;y:number;z:number}>,orbit:RitualOrbit
):Readonly<{x:number;y:number;z:number}> {
  const horizontal=Math.cos(orbit.pitch)*orbit.radius;
  return {
    x:center.x+Math.sin(orbit.yaw)*horizontal,
    y:center.y+Math.sin(orbit.pitch)*orbit.radius,
    z:center.z+Math.cos(orbit.yaw)*horizontal,
  };
}
