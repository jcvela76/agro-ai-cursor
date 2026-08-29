import { GetParcelSpectralOverlay } from "@/application/spectral/get-parcel-spectral-overlay";
import { GetParcelSpectralZones } from "@/application/spectral/get-parcel-spectral-zones";
import { GetParcelSpectralHistory } from "@/application/spectral/get-parcel-spectral-history";
import { GetParcelVegetationIndices } from "@/application/spectral/get-parcel-vegetation-indices";
import {
  defaultSyntheticSnapshots,
  SyntheticAccessResolver,
} from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";
import { OfflineSpectralSceneRegistry } from "@/infrastructure/spectral/offline-spectral-scene-registry";

const parcels = new SyntheticParcelRegistry();
const source = new OfflineSpectralSource();
const scenes = new OfflineSpectralSceneRegistry();

export const spectralRouteContainerMock = {
  createAccessResolver: () => new SyntheticAccessResolver(defaultSyntheticSnapshots),
  getParcelVegetationIndices: new GetParcelVegetationIndices(parcels, source, scenes),
  getParcelSpectralOverlay: new GetParcelSpectralOverlay(parcels, source),
  getParcelSpectralZones: new GetParcelSpectralZones(parcels, source),
  getParcelSpectralHistory: new GetParcelSpectralHistory(parcels, scenes),
};

export { defaultSyntheticSnapshots };
