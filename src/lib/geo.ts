import { geoMercator, geoPath, type GeoProjection } from "d3-geo"

export function createProjection(width: number, height: number): GeoProjection {
  return geoMercator().fitSize([width, height], { type: "Sphere" } as { type: string })
}

export const pathFromProjection = (projection: GeoProjection) =>
  geoPath(projection)
