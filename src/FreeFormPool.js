import intersect from 'path-intersection';
import React, { useState } from 'react';
import { Group, Line, Circle, Text } from 'react-konva';

import * as THREE from 'three';
import { calculateArcPoints, calculateArcSegment, getArcParameters } from './utils/GeometricUtils';

const FreeformPool = ({
  x,
  y,
  key,
  points,
  viewMode,
  isBlock,
  borderColor = 'red',
  borderWidth = 5,
  draggable = true,
  onClick,
  onDragEnd,
  onShapeUpdate,
  strokeWidth,
  closed, 
  fillPatternImage,
  fillPatternOffset,
  fillPatternScale,
}) => {
  const [localPoints, setLocalPoints] = useState(points);














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

  const generateShapePoints = () => {
    const intersections = findIntersections(localPoints);
    const shapePoints = [];

    for (let i = 0; i < localPoints.length; i++) {
      const current = localPoints[i];
      const next = localPoints[(i + 1) % localPoints.length];
      
      if (current.bulge) {
        const arcPoints = viewMode==='clipped'?calculateArcSegment(current, next, current.bulge):calculateArcPoints(current, next, current.bulge);
        
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

  const handleDragEndLocal = (index, x, y, z) => {
    const updatedPoints = [...localPoints];
    const newDepth = prompt("Enter depth for this pool (in meters):", z || 0);
    updatedPoints[index] = { ...updatedPoints[index], x, y, z: -Number(newDepth || z) };
    setLocalPoints(updatedPoints);
    if (onShapeUpdate) {
      onShapeUpdate(updatedPoints);
    }
  };


  const handleAnchorDrag = (index, x, y) => {
    const updatedPoints = [...localPoints];
    updatedPoints[index] = { ...updatedPoints[index], x, y };
    setLocalPoints(updatedPoints);
    if (onShapeUpdate) {
      onShapeUpdate(updatedPoints);
    }
  };


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


  const calculateDistance = (p1, p2) => {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  };



  const renderConstructionCircles = () => {
    if (viewMode === 'clipped') return null;

    return localPoints.map((point, index) => {
      const nextPoint = localPoints[(index + 1) % localPoints.length];
      if (!point.bulge) return null;

      const params = getArcParameters(point, nextPoint, point.bulge);
      if (!params) return null;

      return (
        <Circle
          key={`circle-${index}`}
          x={params.center.x}
          y={params.center.y}
          radius={params.radius}
          stroke="#ccc"
          strokeWidth={1}
          dash={[5, 5]}
          perfectDraw={false}
        />
      );
    });
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
      {renderConstructionCircles()}

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

   
      {!isBlock&&localPoints.map((point, index) => {
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


      {!isBlock&&localPoints.map((point, index) => (
        !point.bulge && ( 
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
                scaleY={-1}
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