import { GetParcelSpectralOverlay } from "@/application/spectral/get-parcel-spectral-overlay";
import { GetParcelVegetationIndices } from "@/application/spectral/get-parcel-vegetation-indices";
import {
  defaultSyntheticSnapshots,
  SyntheticAccessResolver,
} from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";

const parcels = new SyntheticParcelRegistry();
const source = new OfflineSpectralSource();

export const spectralRouteContainerMock = {
  createAccessResolver: () => new SyntheticAccessResolver(defaultSyntheticSnapshots),
  getParcelVegetationIndices: new GetParcelVegetationIndices(parcels, source),
  getParcelSpectralOverlay: new GetParcelSpectralOverlay(parcels, source),
};

export { defaultSyntheticSnapshots };
