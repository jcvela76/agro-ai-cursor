/**
 * CDSE Statistical API evalscript — mean Sentinel-2 L2A reflectance bands.
 * Catalog cloud filter is applied via maxCloudCoverage; SCL masking is omitted
 * because it can drop all pixels over bare soil / desert AOIs (Lima coast).
 */
export const SENTINEL2_L2A_BAND_MEAN_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B02", "B03", "B04", "B05", "B08", "B11", "B12", "dataMask"],
      units: "REFLECTANCE"
    }],
    output: [
      {
        id: "bands",
        bands: ["blue", "green", "red", "redEdge", "nir", "swir", "swir2"],
        sampleType: "FLOAT32"
      },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(s) {
  return {
    bands: [s.B02, s.B03, s.B04, s.B05, s.B08, s.B11, s.B12],
    dataMask: [s.dataMask]
  };
}
`;
