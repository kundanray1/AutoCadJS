import * as THREE from 'three';


export const getArcParameters = (start, end, bulge) => {
    if (!bulge || bulge === 0) return null;

    const angle = 4 * Math.atan(Math.abs(bulge));
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const radius = distance / (2 * Math.sin(angle / 2));

    const mid = { 
      x: (start.x + end.x) / 2, 
      y: (start.y + end.y) / 2 
    };
    const normal = {
      x: -(end.y - start.y) / distance * Math.sign(bulge),
      y: (end.x - start.x) / distance * Math.sign(bulge)
    };
    
    const center = {
      x: mid.x + normal.x * (radius * Math.cos(angle / 2)),
      y: mid.y + normal.y * (radius * Math.cos(angle / 2))
    };

    let startAngle = Math.atan2(start.y - center.y, start.x - center.x);
    let endAngle = Math.atan2(end.y - center.y, end.x - center.x);

    if (bulge > 0 && endAngle < startAngle) endAngle += Math.PI * 2;
    if (bulge < 0 && endAngle > startAngle) endAngle -= Math.PI * 2;

    return { center, radius, startAngle, endAngle };
  };



  export const calculateArcPoints = (start, end, bulge) => {
    const params = getArcParameters(start, end, bulge);
    if (!params) return [start, end];

    const curve = new THREE.EllipseCurve(
      params.center.x,
      params.center.y,
      params.radius,
      params.radius,
      params.startAngle,
      params.endAngle,
      false,
      0
    );
    
    return curve.getPoints(50).map(p => ({ x: p.x, y: p.y }));
  };



  export const calculateArcSegment = (start, end, bulge) => {
    const params = getArcParameters(start, end, bulge);
    if (!params) return [start, end];

    const points = [];
    const steps = Math.ceil(Math.abs(params.endAngle - params.startAngle) / (Math.PI / 18));
    
    for (let i = 0; i <= steps; i++) {
      const theta = params.startAngle + (params.endAngle - params.startAngle) * (i / steps);
      points.push({
        x: params.center.x + params.radius * Math.cos(theta),
        y: params.center.y + params.radius * Math.sin(theta),
        z:params.center.z
      });
    }

    return points;
  };

