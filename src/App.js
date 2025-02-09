import React, { useEffect, useState } from "react";
import { Stage, Layer, Line, Circle, Group, Arc, Text, Rect, Image } from "react-konva";
import { DxfParser } from "dxf-parser";
import * as THREE from 'three';
import { Colors } from "dxf-writer"; // Import DxfWriter
// import DxfWriter from "dxf-writer";
import { DxfWriter, LWPolylineFlags, point3d, PolylineFlags, SurfaceType } from "@tarikjabiri/dxf";

import FreeformPool from "./FreeFormPool";
import { getArcParameters } from "./utils/GeometricUtils";


// const invertedY = (y) => -y; // Invert Y function



const items = [
  {
    name: "Hot Tub", type: "CIRCLE", radius: 100, cost: 1000, layer: "hotTub",

    layerTexture: 'waterTexture',
    position: {
      x: 100, // Optional X offset
      y: 100, // Optional Y offset
      z: 0,
    },

  },
  {
    name: "Rectangular Pool", type: "POLYLINE", vertices: [
      { x: -300, y: -100 }, // Top-left corner
      { x: 200, y: -100 },  // Top-right corner
      { x: 200, y: 100 },   // Bottom-right corner
      { x: -200, y: 100 },  // Bottom-left corner
      { x: -200, y: -100 }, // Closing the rectangle
    ],
    cost: 1500,

    shape: true,
    layer: "Rectangular Pool",
    layerTexture: 'waterTexture'
  },
  { name: "Curved Pool", type: "POLYLINE", vertices: [/*...*/], cost: 2000, layer: "New Curve Pool" },
];

const texturesCost = {
  deckTexture: 200,
  walkwayTexture: 150,
  copingTexture: 100,
  texture1: 50,
  texture2: 75,
  waterTexture: 125,
  grassTexture: 80,
  roofTexture: 1500,
};



const App = () => {
  const [dxfData, setDxfData] = useState(null);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [textures, setTextures] = useState({});
  const [canvasItems, setCanvasItems] = useState([]);
  const [viewMode, setViewMode] = useState("clipped"); // "clipped" or "full"

  const [globalCost, setGlobalCost] = useState(0);
  const [poolDepths, setPoolDepths] = useState({});

  // const updateEntityPosition = (entityId, newPosition) => {

  //   console.log(dxfData,entityId, newPosition,'ondrag end update entitiy position')
  //   setDxfData((prev) => ({
  //     ...prev,
  //     entities: prev.entities.map((entity) =>
  //       entity.id === entityId ? { ...entity, position: newPosition } : entity
  //     ),
  //   }));
  // };


  const updateEntityPosition = (entityId, newPosition) => {

    console.log(dxfData, entityId, newPosition, 'ondrag end update entitiy position')
    setDxfData((prev) => ({
      ...prev,
      entities: prev.entities.map((entity) =>
        entity.id === entityId ? { ...entity, position: newPosition } : entity
      ),
    }));
  };



  const handlePoolClick = (poolId) => {
    const newDepth = prompt("Enter depth for this pool (in meters):", poolDepths[poolId] || 0);
    if (newDepth !== null) {
      setPoolDepths((prev) => ({
        ...prev,
        [poolId]: parseFloat(newDepth),
      }));
    }
  };







  // Function to handle DXF Export
  const exportToDXF = () => {
    const writer = new DxfWriter();




    writer.setUnits("Inches"); // Optional: Set DXF units
    if (dxfData && dxfData?.entities) {

      console.log(writer, 'writer header')
      dxfData.entities.forEach((entity) => {

        const layerName = entity.layer || "Default";

        console.log(layerName, 'layers')

        writer.addLayer(layerName, "#dddddd", 'CONTINUOUS')

        if (entity.type === "LINE") {
          console.log(entity, 'line position')
          writer.addLine(entity.vertices[0], entity.vertices[1], { layerName: entity.laye, visible: true, lineType: 'CONTINUOUS' });

          // writer.addLine(entity?.vertices[0],entity?.vertices[1])

        } else if (entity.type === "CIRCLE" && entity?.center) {
          console.log(entity, 'circle position')

          writer.addCircle(entity?.center, entity.radius,);
        } else if (entity.type === "ARC" && entity?.center) {
          console.log(entity, 'arc center')

          writer.addArc(
            entity?.center,
            entity.radius,
            entity.startAngle,
            entity.endAngle,

          );
        }
        else if (entity.type === "POLYLINE" && entity?.vertices?.length > 0) {



          let hasBulges = entity.vertices.some(v => v.bulge && v.bulge !== 0);
          console.log(hasBulges, 'has bulges')





          let modifiedPolyLines = entity.vertices.map(item => ({ point: { x: item?.x || 0, y: item?.y || 0, z: item?.z || 0 }, bulge: item?.bulge || 0, startingWidth: 1, endWidth: 1 }))
          console.log(modifiedPolyLines, 'polyline vertices')


          // writer.addLWPolyline( entity?.vertices,);


          if (hasBulges) {

            writer.addLWPolyline(modifiedPolyLines, {
              flags: (entity.shape ? PolylineFlags.Closed : PolylineFlags.None) |
                (entity.includesCurveFitVertices ? PolylineFlags.CurveFit : PolylineFlags.None) |
                (entity.includesSplineFitVertices ? PolylineFlags.SplineFit : PolylineFlags.None) |
                (entity.is3dPolyline ? PolylineFlags.Polyline3D : PolylineFlags.None) |
                (entity.is3dPolygonMesh ? PolylineFlags.PolygonMesh3D : PolylineFlags.None) |
                (entity.is3dPolygonMeshClosed ? PolylineFlags.PolygonMeshClosed : PolylineFlags.None) |
                (entity.isPolyfaceMesh ? PolylineFlags.PolyfaceMesh : PolylineFlags.None),
              elevation: entity.elevation || 0,
              thickness: entity.thickness || 0,
              defaultStartWidth: entity.defaultStartWidth || 0,
              defaultEndWidth: entity.defaultEndWidth || 0,
              polygonMeshM: entity.polygonMeshM || 0,
              polygonMeshN: entity.polygonMeshN || 0,
              smoothSurfaceM: entity.smoothSurfaceM || 0,
              smoothSurfaceN: entity.smoothSurfaceN || 0,
              surfaceType: entity.surfaceType || SurfaceType.None,
            });
            // entity.vertices.forEach((v, index) => {
            //   if (v.bulge && v.bulge !== 0) {






            //     const next = entity.vertices[(index + 1) % entity.vertices.length]; // Next point
            //     const params = getArcParameters(v, next, v.bulge);


            //     console.log(v,params,'vertices and params and bulges')
            //     if (params) {

            //       let startAngle = (params.startAngle * 180) / Math.PI; // Convert radians to degrees
            //       let endAngle = (params.endAngle * 180) / Math.PI;

            //       // 🔥 Ensure the arc follows the longer path around the circle
            //       // writer.addArc(
            //       //   params?.center,
            //       //   params.radius,
            //       //   params.startAngle,
            //       //   params.endAngle,

            //       // );


            //     }
            //   } else if (index < entity.vertices.length - 1) {
            //     // Regular line segments
            //     const next = entity.vertices[index + 1];
            //     writer.addLine(v, next, );
            //   }
            // });

          } else {

            console.log(entity.vertices, 'has no bulge for polyline')
            const vertices = entity.vertices.map((v) => ({ point: [v?.x, v?.y, v?.z] }));
            // writer.addLWPolyline( modifiedPolyLines,{flags:1});



            // writer.addPolyline3D(modifiedPolyLines, { flags:PolylineFlags.});
            writer.addPolyline3D(modifiedPolyLines, {
              flags: (entity.shape ? PolylineFlags.Closed : PolylineFlags.None) |
                (entity.includesCurveFitVertices ? PolylineFlags.CurveFit : PolylineFlags.None) |
                (entity.includesSplineFitVertices ? PolylineFlags.SplineFit : PolylineFlags.None) |
                (entity.is3dPolyline ? PolylineFlags.Polyline3D : PolylineFlags.None) |
                (entity.is3dPolygonMesh ? PolylineFlags.PolygonMesh3D : PolylineFlags.None) |
                (entity.is3dPolygonMeshClosed ? PolylineFlags.PolygonMeshClosed : PolylineFlags.None) |
                (entity.isPolyfaceMesh ? PolylineFlags.PolyfaceMesh : PolylineFlags.None),
              elevation: entity.elevation || 0,
              thickness: entity.thickness || 0,
              defaultStartWidth: entity.defaultStartWidth || 0,
              defaultEndWidth: entity.defaultEndWidth || 0,
              polygonMeshM: entity.polygonMeshM || 0,
              polygonMeshN: entity.polygonMeshN || 0,
              smoothSurfaceM: entity.smoothSurfaceM || 0,
              smoothSurfaceN: entity.smoothSurfaceN || 0,
              surfaceType: entity.surfaceType || SurfaceType.None,
            });

          }
          // writer.addLayer(layerName, 'green', "CONTINUOUS").drawPolyline3d(vertices, {  closed: entity.closed || false });
        }
        // Add support for other DXF entity types as needed
      });
    }

    // Add new canvas items to the writer
    // canvasItems.forEach((item) => {
    //   const layerName = item.layer || "Default";
    //   writer.addLayer(layerName, Colors.Blue, "CONTINUOUS");

    //   if (item.type === "CIRCLE") {
    //     writer.addCircle(item, item.radius, );
    //   } else if (item.type === "RECT") {
    //     writer.addRectangle(
    //       item.x - item.width / 2,
    //       item.y - item.height / 2,
    //       item.x + item.width / 2,
    //       item.y + item.height / 2,
    //       
    //     );
    //   } else if (item.type === "POLYLINE") {
    //     const vertices = item.vertices.map((v) => [v.x, v.y]);
    //     writer.addPolyline(vertices, {  closed: item.shape || false });
    //   }
    // });

    // Export DXF as a string
    console.log(writer, 'dxf string')

    const dxfString = writer.stringify();

    console.log(dxfString, 'dxf string')
    const blob = new Blob([dxfString], { type: "application/dxf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "merged_canvas.dxf";
    link.click();
  };












  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const parser = new DxfParser();
        try {
          // const data = parser.parseSync(e.target.result);

          const parsedData = parser.parseSync(e.target.result);
          parsedData.entities = parsedData.entities.map((entity, index) => ({
            ...entity,
            id: entity.handle || `entity-${index}`, // Use `handle` if available, otherwise generate an ID
          }));

          console.log(parsedData, 'parsed data')
          setDxfData(parsedData);
        } catch (error) {
          console.error("Error parsing DXF file:", error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleTextureChange = (layerName, textureKey) => {
    let prevCost = globalCost
    const prevTextureKey = textures[layerName] || null;
    const prevTextureCost = texturesCost[prevTextureKey] || 0;
    const newTextureCost = texturesCost[textureKey] || 0;
    const updatedCost = prevCost - prevTextureCost + newTextureCost;

    console.log(prevCost, '-', prevTextureCost, '+', newTextureCost, 'updated cost', 'previous texture key', prevTextureKey)
    setTextures((prev) => {
      console.log("Previous Texture:", prevTextureKey, "Cost:", prevTextureCost);
      console.log("New Texture:", textureKey, "Cost:", newTextureCost);
      return {
        ...prev,
        // [layerName]: availableTextures[textureKey],    
        [layerName]: textureKey, // Store the key instead of the image

      };
    });


    setGlobalCost(updatedCost);

  };



  const handlePoolUpdate = (id, newPoints) => {

    console.log(id, newPoints, 'pool update')

    setDxfData((prev) => ({
      ...prev,
      entities: prev.entities.map((entity) =>
        entity.id === id ? { ...entity, vertices: newPoints } : entity
      ),
    }));
  };



  const handleVerticesUpdate = (id, newPoints) => {

    console.log(id, newPoints, 'pool update')

    setDxfData((prev) => ({
      ...prev,
      entities: prev.entities.map((entity) =>
        entity.id === id ? { ...entity, vertices: newPoints } : entity
      ),
    }));
  };

  return (
    <div style={{ display: "flex", flexDirection: 'row', height: "100%", }}>
      <div style={{ display: 'flex', flex: 0.2, flexDirection: 'column', backgroundColor: "#f4f4f4" }}>
        <div style={{ padding: "10px", backgroundColor: "#f4f4f4", textAlign: "left" }}>
          <input type="file" accept=".dxf" onChange={handleFileUpload} />
        </div>
        <div style={{ padding: "10px", backgroundColor: "#f4f4f4" }}>


          <div >
            <h3 >Total Cost:</h3>
            <h1 style={{ color: 'green' }}>
              ${globalCost}
            </h1>
          </div>

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


              onDragEnd={(e) => {
                const now = new Date()

                const itemWithId = { ...item, id: item.type + now.toISOString() }
                console.log('ondrag end update entitiy position', itemWithId)

                const position = { x: e.clientX - 250, y: e.clientY }

                setDxfData((prev) => ({ ...prev, entities: [...(prev?.entities), itemWithId] }));
                setGlobalCost((prevCost) => prevCost + (item.cost || 0));

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
              {item.name} (${item.cost})
            </div>
          ))}
        </div>
      </div>


      <div


        style={{ display: 'flex', flex: 1, flexDirection: 'column', backgroundColor: "white" }}>

        <Stage
          scaleY={-1}
          width={window.innerWidth - 200}
          height={3000}
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



        >
          {dxfData && (
            <DXFLayers
              dxfData={dxfData}
              updateEntityPosition={updateEntityPosition}
              handlePoolUpdate={handlePoolUpdate}
              textures={textures}
              poolDepths={poolDepths}
              viewMode={viewMode}
              handleVerticesUpdate={handleVerticesUpdate}
              setSelectedLayer={setSelectedLayer}
              handlePoolClick={handlePoolClick}
            />
          )}





          <Layer>

          </Layer>




        </Stage>
      </div>




      <div style={{ position: "fixed", right: 0, display: 'flex', width: '15%', flexDirection: 'column', backgroundColor: "#f4f4f4" }}>

        <div style={{ width: "200px", padding: "10px", alignItems: 'center', backgroundColor: "#f4f4f4" }}>
          <button onClick={() => exportToDXF(dxfData.entities)} style={{ padding: "10px", margin: "10px" }}>
            Export to DXF
          </button>

          <h3>View Mode</h3>

          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            style={{
              width: "100%",
              marginTop: "15px",
              backgroundColor: "white",
              padding: "15px",
              borderRadius: "5px",
              // outline: selectedLayer === layerName ? "5px solid orange" : "none",
            }}  >
            <option value="clipped">Clipped View</option>
            <option value="full">Full View</option>
          </select>

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
                    marginTop: "15px",
                    backgroundColor: "white",
                    padding: "15px",
                    borderRadius: "5px",
                    outline: selectedLayer === layerName ? "5px solid orange" : "none",
                  }}
                >
                  <option value="">No Texture</option>
                  {Object.keys(texturesCost).map((textureKey) => (
                    <option


                      key={textureKey} value={textureKey}>
                      {textureKey} (${texturesCost[textureKey]})
                    </option>
                  ))}
                </select>



              </div>
            ))}
        </div>
      </div>

    </div>
  );
};

const DXFLayers = ({ viewMode, dxfData, handleDragEnd, textures, poolDepths, handlePoolClick, setSelectedLayer, updateEntityPosition, handlePoolUpdate, handleVerticesUpdate }) => {

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
  const [availableTextures, setAvailableTextures] = useState({});

  useEffect(() => {
    // Load available textures
    const loadTextures = () => {
      const texture1 = new window.Image();
      texture1.src = "/Floor.jpg"; // Replace with texture paths

      const texture2 = new window.Image();
      texture2.src = "/Waterline.jpg";

      const grassTexture = new window.Image();
      grassTexture.src = "/grass.jpg";

      const waterTexture = new window.Image();
      waterTexture.src = "/transparentWater.png";

      const walkwayTexture = new window.Image();
      walkwayTexture.src = "/walkway.jpg";


      const copingTexture = new window.Image();
      copingTexture.src = "/coping.jpg";


      const deckTexture = new window.Image();
      deckTexture.src = "/deckTransparent.png";


      const roofTexture = new window.Image();
      roofTexture.src = "/roofTexture.jpg";
      // const texture3 = new window.Image();
      // texture3.src = "/texture3.jpg";

      setAvailableTextures({ texture1, texture2, waterTexture, roofTexture, walkwayTexture, copingTexture, deckTexture, grassTexture });
    };
    loadTextures();
  }, []);


  const [customPools, setCustomPools] = useState([]); // Store custom pools

  // Handle updates to FreeformPool points




  const renderLayer = (layerName, entities) => {




    return (
      <Group
        key={layerName}
        draggable
        preventDefault
        onClick={() => setSelectedLayer(layerName)}
      >
        {entities.map((entity, index) => {
          if (entity.type === "CIRCLE") {
            console.log(entity, 'circle insertion')
            return (
              <>
                <Circle

                  key={`${entity.layer}-${Math.random()}`} // Unique key for each entity
                  x={entity.center?.x}
                  y={entity.center?.y}
                  fillPatternImage={availableTextures[textures[layerName]] || availableTextures[entity.layerTexture] || null}

                  radius={entity.radius}
                  // fill={entity.fill || "transparent"}
                  fillPatternOffset={{ x: 0, y: 0 }}
                  fillPatternScale={{ x: 1, y: 1 }}
                  stroke="black"

                  strokeWidth={1}
                  draggable


                  onDragEnd={(e) => {
                    const newPosition = {
                      x: e.target.x(),
                      y: e.target.y(),
                    };
                    // Call the updateEntityPosition callback
                    updateEntityPosition(entity.id, newPosition);
                  }}



                  onClick={() => {
                    setSelectedLayer(entity.layer)
                    handlePoolClick(entity.id) // Assign depth on click

                  }}
                />
                <Text
                  x={entity?.center?.x - 0}
                  y={entity?.center?.y}
                  text={`Depth: ${poolDepths[entity.id] || 0}m`}
                  fontSize={14}
                  fontVariant='bold'
                  fill="black"
                /></>
            );
          } else if (entity.type === "RECT") {
            return (
              <>
                <Rect
                  key={`${entity.layer}-${Math.random()}`}
                  x={entity.vertices[0].x + (entity.vertices[2].x - entity.vertices[0].x) / 2} // Center X
                  y={entity.vertices[0].y + (entity.vertices[2].y - entity.vertices[0].y) / 2} // Center Y
                  width={Math.abs(entity.vertices[2].x - entity.vertices[0].x)} // Width
                  height={Math.abs(entity.vertices[2].y - entity.vertices[0].y)} // Height

                  fillPatternImage={availableTextures[textures[layerName]] || availableTextures[entity.layerTexture] || null}
                  onDragEnd={(e) => {
                    const displacement = {
                      x: e.target.x() - (entity.vertices[0].x + (entity.vertices[2].x - entity.vertices[0].x) / 2),
                      y: e.target.y() - (entity.vertices[0].y + (entity.vertices[2].y - entity.vertices[0].y) / 2),
                    };

                    // Update vertices based on displacement
                    const updatedVertices = entity.vertices.map((vertex) => ({
                      x: vertex.x + displacement.x,
                      y: vertex.y + displacement.y,
                    }));
                    // Call the updateEntityPosition callback
                    handleVerticesUpdate(entity.id, updatedVertices);
                  }}
                  // height={entity.height}
                  fill={entity.fill || "transparent"}
                  fillPatternOffset={{ x: 0, y: 0 }}
                  fillPatternScale={{ x: 1, y: 1 }}
                  stroke="black"
                  strokeWidth={1}
                  draggable
                  onClick={() => {
                    setSelectedLayer(entity.layer)
                    handlePoolClick(entity.id)
                  } // Assign depth on click


                  }
                />
                <Text
                  x={entity.vertices[0].x + (entity.vertices[2].x - entity.vertices[0].x) / 2}
                  y={entity.vertices[0].y - 20}
                  text={`Depth: ${poolDepths[entity.id] || 0}m`}
                  fontSize={14}
                  fontVariant='bold'
                  fill="black"
                />
              </>
            );
          } else if (entity.type === "POLYLINE" || entity.type === "LINE") {
            const points = [];

            for (let i = 0; i < entity.vertices.length; i++) {
              const v1 = entity.vertices[i];
              const v2 = entity.vertices[(i + 1) % entity.vertices.length]; // Wrap-around for closed shapes

              // Add the starting vertex
              points.push({ x: v1?.x, y: v1?.y });

              // If there's a bulge, calculate and add arc points
              if (v1.bulge && v1.bulge !== 0) {
                const arcPoints = calculateArcPoints(v1, v2, v1.bulge);
                points.push(...arcPoints);
              }
            }

            // Flatten the points for Konva rendering
            // Render the pool as a closed shape
            return (
              // <Line
              //   key={entity.handle}
              //   points={flatPoints}
              //   stroke="blue"
              //   // tension={0.1}
              //   strokeWidth={2}
              //   closed={entity.shape || false} // Close the shape if specified
              //   fillPatternImage={availableTextures[textures[layerName]]||  availableTextures[entity.layerTexture] ||null}
              //   fillPatternOffset={{ x: 0, y: 0 }}
              //   fillPatternScale={{ x: 1, y: 1 }}
              //   draggable

              // />

              <FreeformPool
                key={entity.id}
                // x={entity?.x||0}
                // y={entity?.y||0}
                stroke="blue"
                viewMode={viewMode}
                points={entity.vertices}
                // tension={0.1}
                // strokeWidth={1}
                closed={entity.shape || false} // Close the shape if specified
                fillPatternImage={availableTextures[textures[layerName]] || availableTextures[entity.layerTexture] || null}
                fillPatternOffset={{ x: 0, y: 0 }}
                fillPatternScale={{ x: 1, y: 1 }}
                draggable
                handleDragEnd={handleDragEnd}
                onShapeUpdate={(newPoints) => handlePoolUpdate(entity.id, newPoints)}
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
  
  

  console.log(dxfData,'dxfDataBlovks test')
  // Process Blocks and Add Their Entities to Grouped Entities
// Process Blocks Correctly


  return (
    <Layer>
      {Object.entries(groupedEntities).map(([layerName, entities]) =>
      <>
      {renderLayer(layerName, entities)}
  
    </>
 
 )}
    </Layer>
  );
};

export default App;