 //# creación de capas deck.gl// src/lib/deckLayers.ts
import { HeatmapLayer } from '@deck.gl/aggregation-layers';

export const createHeatmapLayer = (data: any[]) =>
  new HeatmapLayer({
    id: 'heatmap-layer',
    data,
    getPosition: (d) => [d.longitude, d.latitude],
    getWeight: (d) => d.value,
    radiusPixels: 30,
    intensity: 1,
    threshold: 0.05,
    colorRange: [
      [33, 102, 172],
      [67, 147, 195],
      [146, 197, 222],
      [209, 229, 240],
      [253, 219, 199],
      [244, 165, 130],
      [214, 96, 77],
      [178, 24, 43],
    ],
  });
