import intersect from 'path-intersection';
import React, { useState } from 'react';
import { Group, Line, Circle, Text } from 'react-konva';

import * as THREE from 'three';

const FreeformPool = ({
  x,
  y,
  key,
  points,
  borderColor = 'red',
  borderWidth = 5,
  draggable = true,
  onClick,
  onDragEnd,
  onShapeUpdate,
  strokeWidth,
  closed, // Close the shape if specified
  fillPatternImage,
  fillPatternOffset,
  fillPatternScale,
}) => {
  const [localPoints, setLocalPoints] = useState(points);

  // Function to calculate arc points based on bulge
  const calculateArcPoints = (start, end, bulge) => {
    const points = [];
    if (!bulge || bulge === 0) return points;

    // Calculate the arc parameters
    const angle = 4 * Math.atan(Math.abs(bulge));
    const distance = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
    const radius = distance / (2 * Math.sin(angle / 2));

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const perpendicularLength = Math.sqrt(Math.abs(radius ** 2 - (distance / 2) ** 2));
    const direction = bulge > 0 ? 1 : -1;

    // Calculate the arc center
    const normalX = (-(end.y - start.y) / distance) * direction;
    const normalY = ((end.x - start.x) / distance) * direction;
    const centerX = midX + normalX * perpendicularLength;
    const centerY = midY + normalY * perpendicularLength;

    // Calculate start and end angles
    const startAngle = Math.atan2(start.y - centerY, start.x - centerX);
    let endAngle = Math.atan2(end.y - centerY, end.x - centerX);

    if (bulge > 0 && endAngle < startAngle) endAngle += 2 * Math.PI;
    if (bulge < 0 && endAngle > startAngle) endAngle -= 2 * Math.PI;

    // Generate points along the arc
    const curve = new THREE.EllipseCurve(
      centerX,
      centerY,
      Math.abs(radius),
      Math.abs(radius),
      startAngle,
      endAngle,
      false,
      0
    );
    const curvePoints = curve.getPoints(50); // Adjust for smoother curves

    return curvePoints.map((p) => ({ x: p.x, y: p.y }));
  };
  
    // Improved arc calculation with proper start/end points
    const calculateArcSegment = (start, end, bulge) => {
      if (!bulge || bulge === 0) return [start, end];
  
      const angle = 4 * Math.atan(Math.abs(bulge));
      const distance = Math.hypot(end.x - start.x, end.y - start.y);
      const radius = distance / (2 * Math.sin(angle / 2));
  
      // Calculate center coordinates
      const mid = { x: (start.x + end.x)/2, y: (start.y + end.y)/2 };
      const normal = { 
        x: -(end.y - start.y)/distance * Math.sign(bulge),
        y: (end.x - start.x)/distance * Math.sign(bulge)
      };
      const center = {
        x: mid.x + normal.x * (radius * Math.cos(angle/2)),
        y: mid.y + normal.y * (radius * Math.cos(angle/2))
      };
  
      // Calculate start and end angles
      const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
      let endAngle = Math.atan2(end.y - center.y, end.x - center.x);
      
      // Adjust angles for bulge direction
      if (bulge > 0 && endAngle < startAngle) endAngle += Math.PI * 2;
      if (bulge < 0 && endAngle > startAngle) endAngle -= Math.PI * 2;
  
      // Generate arc points
      const points = [];
      const steps = Math.ceil(Math.abs(endAngle - startAngle) / (Math.PI / 18));
      for (let i = 0; i <= steps; i++) {
        const theta = startAngle + (endAngle - startAngle) * (i / steps);
        points.push({
          x: center.x + radius * Math.cos(theta),
          y: center.y + radius * Math.sin(theta)
        });
      }
  
      return points;
    };



      // Find intersection between adjacent arcs
  const findIntersections = (points) => {
    const result = [];
    for (let i = 0; i < points.length; i++) {
      const prev = points[(i + points.length - 1) % points.length];
      const current = points[i];
      const next = points[(i + 1) % points.length];

      if (current.bulge) {
        const arc1 = calculateArcSegment(prev, current, prev.bulge);
        const arc2 = calculateArcSegment(current, next, current.bulge);
        // Find intersection between adjacent arcs
        const intersection = intersect(
          { x1: arc1[arc1.length-2].x, y1: arc1[arc1.length-2].y, 
            x2: arc1[arc1.length-1].x, y2: arc1[arc1.length-1].y },
          { x1: arc2[0].x, y1: arc2[0].y, 
            x2: arc2[1].x, y2: arc2[1].y }
        );

        if (intersection?.points?.length > 0) {
          result.push({
            index: i,
            point: intersection.points[0]
          });
        }
      }
    }
    return result;
  };

  // Generate points for the entire shape, including curves
  const generateShapePoints = () => {
    const intersections = findIntersections(localPoints);
    const shapePoints = [];

    for (let i = 0; i < localPoints.length; i++) {
      const current = localPoints[i];
      const next = localPoints[(i + 1) % localPoints.length];
      
      if (current.bulge) {
        const arcPoints = calculateArcSegment(current, next, current.bulge);
        
        // Trim arc at intersection points
        const intersection = intersections.find(x => x.index === i);
        if (intersection) {
          shapePoints.push(intersection.point);
        } else {
          shapePoints.push(...arcPoints);
        }
      } else {
        shapePoints.push(current);
      }
    }

    return shapePoints.flatMap(p => [p.x, p.y]);
  };
  // Handle drag end for anchor points
  const handleDragEndLocal = (index, x, y, z) => {
    const updatedPoints = [...localPoints];
    const newDepth = prompt("Enter depth for this pool (in meters):", z || 0);
    updatedPoints[index] = { ...updatedPoints[index], x, y, z: -Number(newDepth || z) };
    setLocalPoints(updatedPoints);
    if (onShapeUpdate) {
      onShapeUpdate(updatedPoints);
    }
  };

  // Update an individual anchor point
  const handleAnchorDrag = (index, x, y) => {
    const updatedPoints = [...localPoints];
    updatedPoints[index] = { ...updatedPoints[index], x, y };
    setLocalPoints(updatedPoints);
    if (onShapeUpdate) {
      onShapeUpdate(updatedPoints);
    }
  };

  // Add a new anchor point
  const addAnchorPoint = (x, y) => {
    let closestSegmentIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < localPoints.length; i++) {
      const start = localPoints[i];
      const end = localPoints[(i + 1) % localPoints.length];
      const distance = pointToSegmentDistance({ x, y }, start, end);

      if (distance < minDistance) {
        minDistance = distance;
        closestSegmentIndex = i;
      }
    }

    const updatedPoints = [...localPoints];
    updatedPoints.splice(closestSegmentIndex + 1, 0, { x, y });

    setLocalPoints(updatedPoints);
    if (onShapeUpdate) {
      onShapeUpdate(updatedPoints);
    }
  };

  // Calculate the distance from a point to a line segment
  const pointToSegmentDistance = (point, start, end) => {
    const A = point.x - start.x;
    const B = point.y - start.y;
    const C = end.x - start.x;
    const D = end.y - start.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    const param = lenSq !== 0 ? dot / lenSq : -1;

    let xx, yy;
    if (param < 0) {
      xx = start.x;
      yy = start.y;
    } else if (param > 1) {
      xx = end.x;
      yy = end.y;
    } else {
      xx = start.x + param * C;
      yy = start.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate distance between two points
  const calculateDistance = (p1, p2) => {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  };

  return (
    <Group
      key={key}
      x={x}
      y={y}
      draggable={draggable}
      onDragEnd={(e) => onDragEnd?.(e.target.x(), e.target.y())}
    >
      {/* Pool Border */}
      <Line
        points={generateShapePoints()}
        stroke={'blue'}
        strokeWidth={2}
        closed={closed}
        fillPatternImage={fillPatternImage}
        fillPatternOffset={fillPatternOffset}
        fillPatternScale={fillPatternScale}
        draggable
        onDblClick={(e) => {
          const stage = e.target.getStage();
          const mousePos = stage?.getPointerPosition();
          if (mousePos) {
            addAnchorPoint(mousePos.x - x, mousePos.y - y);
          }
        }}
      />

      {/* Distance Labels */}
      {localPoints.map((point, index) => {
        const nextPoint = localPoints[(index + 1) % localPoints.length];
        const distance = calculateDistance(point, nextPoint).toFixed(2);
        const midpoint = {
          x: (point.x + nextPoint.x) / 2,
          y: (point.y + nextPoint.y) / 2,
        };

        return (
          <Text
            key={`distance-${index}`}
            x={midpoint.x - 20}
            y={midpoint.y - 10}
            text={`${distance}`}
            fontSize={10}
            fill="black"
            scaleY={-1}
          />
        );
      })}

      {/* Anchor Points (Hidden for curves) */}
      {localPoints.map((point, index) => (
        !point.bulge && ( // Only show anchor points for non-curve vertices
          <>
            <Circle
              key={index}
              x={point.x}
              y={point.y}
              radius={5}
              fill="white"
              stroke="black"
              strokeWidth={1}
              draggable
              onDragEnd={(e) => handleDragEndLocal(index, e.target.x(), e.target.y(), point?.z)}
              onDragMove={(e) => handleAnchorDrag(index, e.target.x(), e.target.y())}
            />
            {point?.z ? (
              <Text
                key={index}
                x={point.x + 10}
                y={point.y}
                text={`Depth:${-1 * point?.z} meter`}
                fontSize={14}
                fontVariant="bold"
                fill="black"
              />
            ) : null}
          </>
        )
      ))}
    </Group>
  );
};

export default FreeformPool;