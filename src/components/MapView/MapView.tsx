// // src/components/MapView/MapView.tsx
// import "maplibre-gl/dist/maplibre-gl.css";
// import React, { useRef } from "react";
// import { MapRef } from "react-map-gl";
// import Map from "react-map-gl/maplibre";

// const MapView = () => {
//   const mapRef = useRef<MapRef>(null);

//   return (
//     <div style={{ width: "100%", height: "100vh" }}>
//       <Map
//         ref={mapRef}
//         initialViewState={{
//           longitude: -3.7038, // Madrid
//           latitude: 40.4168,
//           zoom: 5,
//         }}
//         style={{ width: "100%", height: "100%" }}
//         mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
//       />
//     </div>
//   );
// };

// export default MapView;
