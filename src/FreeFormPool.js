import React, { useState } from 'react';
import { Group, Line, Circle, Text } from 'react-konva';

const FreeformPool = ({
  x,
  y,
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

  // Update an individual anchor point
  const handleAnchorDrag = (index, x, y) => {
    const updatedPoints = [...localPoints];
    updatedPoints[index] = { x, y };
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
      x={x}
      y={y}
      draggable={draggable}
      onDragEnd={(e) => onDragEnd?.(e.target.x(), e.target.y())}
    //   onClick={onClick}
    >
      {/* Pool Border */}
      <Line
 points={localPoints.flatMap((p) => [p.x, p.y])}   
      stroke={'blue'}
        
        strokeWidth={2}
        closed={closed} // Close the shape if specified
        fillPatternImage={fillPatternImage }
        fillPatternOffset={{ x: 0, y: 0 }}
        fillPatternScale={{ x: 1, y: 1 }}
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
            fontSize={12}
            fill="black"
          />
        );
      })}

      {/* Anchor Points */}
      {localPoints.map((point, index) => (
        <Circle
          key={index}
          x={point.x}
          y={point.y}
          radius={5}
          fill="white"
          stroke="black"
          strokeWidth={1}
          draggable
          onDragMove={(e) => handleAnchorDrag(index, e.target.x(), e.target.y())}
        />
      ))}
    </Group>
  );
};

export default FreeformPool;
