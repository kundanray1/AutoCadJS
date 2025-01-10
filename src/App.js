import React, { useEffect, useState } from "react";
import { Stage, Layer, Line, Circle, Group, Arc, Rect } from "react-konva";
import { DxfParser } from "dxf-parser";
import * as THREE from 'three';
import { zip } from "three/examples/jsm/libs/fflate.module.js";


const items = [
  { name: "Hot Tub", type: "CIRCLE", radius: 50, fill: "lightblue" ,layer:'hotTub',
    
    
    position:{
    x:32.4,y:0,z:0
  },
  rotation:0,
  xScale:1,
  yScale:1,
  zScale:1,


},
{
  name: "Rectangular Pool",
  type: "POLYLINE", // Use POLYLINE for DXF-style rectangles
  vertices: [
    { x: -50, y: -30 }, // Top-left
    { x: 50, y: -30 },  // Top-right
    { x: 50, y: 30 },   // Bottom-right
    { x: -50, y: 30 },  // Bottom-left
    { x: -50, y: -30 }, // Closing the rectangle
  ],
  layer: "New Rectangular Pool",
  // fill: "blue",
  position: {
    x: 32.4,
    y: 0,
    z: 0,
  },
  shape: true, // Close the shape
},
{
  name: "Curved Pool",
  type: "POLYLINE",

  vertices: [
    { x: -60, y: -30, bulge: 1 }, // Start point with bulge for the curve
    { x: 0, y: -60 }, // End of the first curve
    { x: 60, y: -30, bulge: -1 }, // Start another curve
    { x: 60, y: 30 }, // Straight segment
    { x: 0, y: 60, bulge: -1 }, // Another curve
    { x: -60, y: 30, bulge: 1 }, // Closing the curve
  ],
  layer: "New Curve Pool",
  shape: true, // Close the shape
  position: {
    x: 32.4,
    y: 0,
    z: 0,
  },
  // fill: "lightblue",
  // shape: true,
},
  // Add more items as needed
];




const App = () => {
  const [dxfData, setDxfData] = useState(null);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [textures, setTextures] = useState({});
  const [availableTextures, setAvailableTextures] = useState({});
  const [canvasItems, setCanvasItems] = useState([]);


  const addItemToCanvas = (item, position) => {
    setCanvasItems((prevItems) => [
      ...prevItems,
      {
        ...item,
        x: position.x,
        y: position.y,
        id: Date.now(), // unique id for each item
      },
    ]);
  };

  console.log(selectedLayer, 'selectedLayer')



  useEffect(() => {
    // Load available textures
    const loadTextures = () => {
      const texture1 = new window.Image();
      texture1.src = "/Floor.jpg"; // Replace with texture paths
      const texture2 = new window.Image();
      texture2.src = "/Waterline.jpg";

      const waterTexture = new window.Image();
      waterTexture.src = "/transparentWater.png";

      const deckTexture = new window.Image();
      deckTexture.src = "/deck.png";
      // const texture3 = new window.Image();
      // texture3.src = "/texture3.jpg";

      setAvailableTextures({ texture1, texture2, waterTexture });
    };
    loadTextures();
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

  const handleTextureChange = (layerName, textureKey) => {
    setTextures((prev) => ({
      ...prev,
      [layerName]: availableTextures[textureKey],
    }));
  };




  
  return (
    <div style={{ display: "flex", flexDirection: 'row', height: "100%", }}>
      <div style={{ display: 'flex', flex: 0.2, flexDirection: 'column', backgroundColor: "#f4f4f4" }}>
        <div style={{ padding: "10px", backgroundColor: "#f4f4f4", textAlign: "left" }}>
          <input type="file" accept=".dxf" onChange={handleFileUpload} />
        </div>
        <div style={{ padding: "10px", backgroundColor: "#f4f4f4" }}>
          <h3>Add Items</h3>
          {items.map((item, index) => (
            <div
              key={index}
              draggable
              // onDragEnd={}
              onDragStart={(e) => {
                console.log("dragging", item);
                e.dataTransfer.setData("item", JSON.stringify(item));
              }}


              onDragEnd={(e)=>{
                console.log('drag end',e)


               const position={x:e.clientX-250,y:e.clientY}


              setDxfData((prev) => ({ ...prev, entities: [...(prev?.entities ), item] }));
               
                // addItemToCanvas(item,position);

              }}

              style={{
                margin: "10px 0",
                padding: "10px",
                border: "1px solid #ccc",
                cursor: "grab",
                backgroundColor: "#fff",
              }}
            >
              {item.name}
            </div>
          ))}
        </div>
      </div>


      <div


        style={{ display: 'flex', flex: 1, backgroundColor: "white" }}>
        <Stage
          width={window.innerWidth - 200}
          height={window.innerHeight}
          draggable
          preventDefault={true}
          onDrop={(e) => {
            e.preventDefault()
            console.log('drop')



            // e.preventDefault();
            const stage = e.target.getStage();
            const pointerPosition = stage.getPointerPosition();
            const itemJSON = e.dataTransfer.getData("item");
            if (itemJSON) {
              const item = JSON.parse(itemJSON);
              // addItemToCanvas(item, pointerPosition);
            }
          }}


        // onDrop={(e) => {
        //   e.preventDefault();

        //   console.log('drop', e)


        //   // e.preventDefault();
        //   const stage = e.target.getStage();
        //   const pointerPosition = stage.getPointerPosition();
        //   const itemJSON = e.dataTransfer.getData("item");
        //   if (itemJSON) {
        //     const item = JSON.parse(itemJSON);
        //     addItemToCanvas(item, pointerPosition);
        //   }
        // }}
        >
          {dxfData && (
            <DXFLayers
              dxfData={dxfData}
              textures={textures}
              setSelectedLayer={setSelectedLayer}
            />
          )}
          <Layer>
            {/* {canvasItems.map((item) => {
              if (item.type === "circle") {
                return (
                  <Circle
                    key={item.id}
                    x={item.x}
                    y={item.y}
                    radius={item.radius}
                    fill={item.fill}
                    draggable
                  />
                );
              } else if (item.type === "rect") {
                return (
                  <Rect
                    key={item.id}
                    x={item.x}
                    y={item.y}
                    width={item.width}
                    height={item.height}
                    fill={item.fill}
                    draggable
                  />
                );
              }
              return null;
            })} */}
          </Layer>
        </Stage>
      </div>
      <div style={{ position: "fixed", right: 0, display: 'flex', width: '15%', flexDirection: 'column', backgroundColor: "#f4f4f4" }}>

        <div style={{ width: "100px", padding: "10px", backgroundColor: "#f4f4f4" }}>
          <h3>Layers</h3>
          {dxfData &&
            Object.keys(
              dxfData.entities.reduce((acc, entity) => {
                const layer = entity.layer || "Default";
                if (!acc[layer]) acc[layer] = [];
                acc[layer].push(entity);
                return acc;
              }, {})
            ).map((layerName) => (
              <div key={layerName} style={{ marginBottom: "10px" }}>
                <strong>{layerName}</strong>

                <select
                  value={textures[layerName] || ""}
                  onChange={(e) => handleTextureChange(layerName, e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: "5px",
                    outline: selectedLayer === layerName ? "2px solid blue" : "none",
                  }}
                >
                  <option value="">No Texture</option>
                  <option value="deckTexture">Deck Texture</option>
                  <option value="texture1">Floor Texture</option>
                  <option value="texture2">Water Line Texture</option>
                  <option value="waterTexture">Water Texture</option>
                </select>

              </div>
            ))}
        </div>
      </div>

    </div>
  );
};

const DXFLayers = ({ dxfData, textures, setSelectedLayer }) => {
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
        onClick={() => setSelectedLayer(layerName)}
      >
        {entities.map((entity, index) => {
            if (entity.type === "CIRCLE") {
              return (
                <Circle
                  key={`${entity.layer}-${Math.random()}`} // Unique key for each entity
                  x={entity.x}
                  y={entity.y}
                  fillPatternImage={textures[layerName] || entity.layerTexture||null}

                  radius={entity.radius}
                  // fill={entity.fill || "transparent"}
                  fillPatternOffset={{ x: 0, y: 0 }}
                  fillPatternScale={{ x: 1, y: 1 }}
                  stroke="black"

                  strokeWidth={1}
                  draggable
                  onClick={() => setSelectedLayer(entity.layer)}
                />
              );
            } else if (entity.type === "RECT") {
              return (
                <Rect
                  key={`${entity.layer}-${Math.random()}`}
                  x={entity.x - entity.width / 2} // Center the rect
                  y={entity.y - entity.height / 2}
                  width={entity.width}
                  fillPatternImage={textures[layerName] || entity.layerTexture||null}

                  height={entity.height}
                  fill={entity.fill || "transparent"}
                  fillPatternOffset={{ x: 0, y: 0 }}
                  fillPatternScale={{ x: 1, y: 1 }}
                  stroke="black"
                  strokeWidth={1}
                  draggable
                  onClick={() => setSelectedLayer(entity.layer)}
                />
              );
            } else if (entity.type === "POLYLINE") {
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
            const flatPoints = points.flatMap((p) => [400 + p.x, 400 + p.y]);

            return (
              <Line
                key={index}
                points={flatPoints}
                stroke="blue"
                strokeWidth={2}
                fillPatternImage={textures[layerName] || null}
                fillPatternOffset={{ x: 0, y: 0 }}
                fillPatternScale={{ x: 1, y: 1 }}
                closed={entity.shape}
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