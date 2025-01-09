import React, { useEffect, useState } from "react";
import { Stage, Layer, Line, Circle, Group, Arc } from "react-konva";
import { DxfParser } from "dxf-parser";
import * as THREE from 'three'

const App = () => {
  const [dxfData, setDxfData] = useState(null);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [patternImage, setPatternImage] = useState(null);

  useEffect(() => {
    const img = new window.Image();
    img.src = "/Floor.jpg"; // Replace with your image path
    img.onload = () => setPatternImage(img);
  }, []);
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const parser = new DxfParser();
        try {
          const data = parser.parseSync(e.target.result);
          console.log(data, "DXF data");
          setDxfData(data);
        } catch (error) {
          console.error("Error parsing DXF file:", error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ padding: "10px", backgroundColor: "#f4f4f4", textAlign: "center" }}>
        <input type="file" accept=".dxf" onChange={handleFileUpload} />
      </div>
      <div style={{ flex: 1, backgroundColor: "white" }}>
        <Stage width={window.innerWidth} height={window.innerHeight}>
          {dxfData && <DXFLayers patternImage={patternImage} dxfData={dxfData} selectedLayer={selectedLayer} setSelectedLayer={setSelectedLayer} />}
        </Stage>
        {selectedLayer && (
          <div style={{ position: "absolute", top: 10, left: 10, backgroundColor: "rgba(255, 255, 255, 0.9)", padding: "10px", border: "1px solid #ccc" }}>
            <h4>Layer: {selectedLayer.name}</h4>
            <p>Properties:</p>
            <pre>{JSON.stringify(selectedLayer.properties, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};



const DXFLayers = ({ dxfData, selectedLayer, setSelectedLayer, patternImage }) => {
  const calculateArcPoints = (start, end, bulge) => {
    const points = [];
    if (!bulge || bulge === 0) return points;

    const angle = 4 * Math.atan(bulge);
    const distance = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
    const radius = distance / (2 * Math.sin(angle / 2));

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const perpendicularLength = Math.sqrt(radius ** 2 - (distance / 2) ** 2);
    const direction = bulge > 0 ? 1 : -1;

    const normalX = (-(end.y - start.y) / distance) * direction;
    const normalY = ((end.x - start.x) / distance) * direction;

    const centerX = midX + normalX * perpendicularLength;
    const centerY = midY + normalY * perpendicularLength;

    const startAngle = Math.atan2(start.y - centerY, start.x - centerX);
    let endAngle = Math.atan2(end.y - centerY, end.x - centerX);

    if (bulge < 0 && endAngle > startAngle) endAngle -= 2 * Math.PI;
    if (bulge > 0 && endAngle < startAngle) endAngle += 2 * Math.PI;

    const curve = new THREE.EllipseCurve(
      centerX,
      centerY,
      radius,
      radius,
      startAngle,
      endAngle,
      false,
      0
    );
    const curvePoints = curve.getPoints(50);

    return curvePoints.map((p) => ({ x: p.x, y: p.y }));
  };

  const renderLayer = (layerName, entities) => {


    return (
      <Group
        key={layerName}
        draggable
        onClick={() => setSelectedLayer({ name: layerName, properties: { entityCount: entities.length } })}
      >
        {entities.map((entity, index) => {
          if (entity.type === "LINE") {
            const points = [
              entity.vertices[0].x,
              -entity.vertices[0].y, // Flip Y-axis for canvas
              entity.vertices[1].x,
              -entity.vertices[1].y,
            ];
            return <Line key={index} points={points} stroke="black" strokeWidth={1} />;
          }
          if (entity.type === "CIRCLE") {
            return (
              <Circle
                key={index}
                x={entity.center.x}
                y={-entity.center.y} // Flip Y-axis
                radius={entity.radius}
                stroke="black"
                strokeWidth={1}
              />
            );
          }
          if (entity.type === "POLYLINE") {
            const points = [];
            for (let i = 0; i < entity.vertices.length; i++) {
              const v1 = entity.vertices[i];
              const v2 = entity.vertices[(i + 1) % entity.vertices.length];

              points.push({ x: v1.x, y: -v1.y });

              if (v1.bulge && v1.bulge !== 0) {
                const arcPoints = calculateArcPoints(v1, v2, v1.bulge);
                points.push(...arcPoints);
              }
            }
            const flatPoints = points.flatMap((p) => [p.x, p.y]);
            return <Line key={index} points={flatPoints} stroke="blue"

              strokeWidth={1}
              fillPatternImage={patternImage}
              fillPatternOffset={{ x: 0, y: 0 }}
              fillPatternScale={{ x: 1, y: 1 }}

              closed={entity.shape} />;
          }
          if (entity.type === "INSERT") {
            const { x, y } = entity.position;
            return (
              <Circle
                key={index}
                x={x}
                y={-y} // Flip Y-axis
                radius={5} // Placeholder radius for INSERT visualization
                fill="green"
              />
            );
          }
          if (entity.type === "ARC") {
            const { center, radius, startAngle, endAngle } = entity;
            return (
              <Arc
                key={index}
                x={center.x}
                y={-center.y}
                innerRadius={0}
                outerRadius={radius}
                angle={((endAngle - startAngle) * 180) / Math.PI}
                rotation={(-startAngle * 180) / Math.PI}
                stroke="purple"
                strokeWidth={1}
              />
            );
          }
          return null;
        })}
      </Group>
    );
  };

  const groupedEntities = dxfData.entities.reduce((acc, entity) => {
    const layer = entity.layer || "Default";
    if (!acc[layer]) acc[layer] = [];
    acc[layer].push(entity);
    return acc;
  }, {});

  return (
    <Layer>
      {Object.entries(groupedEntities).map(([layerName, entities]) =>
        renderLayer(layerName, entities)
      )}
    </Layer>
  );
};

export default App;
