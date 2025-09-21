export type Inspection = {
  id: string;
  date: string; // Changed to string
  location?: {
    latitude: number;
    longitude: number;
  };
  notes: string;
};

export const extinguisherTypes = ["AP", "BC", "ABC", "CO2", "EPM"] as const;
export type ExtinguisherType = (typeof extinguisherTypes)[number];

export const extinguisherWeights = [2, 4, 4.5, 6, 8, 10, 12, 20, 30, 50] as const;
export type ExtinguisherWeight = (typeof extinguisherWeights)[number];

export type Extinguisher = {
  id: string;
  qrCodeValue: string;
  type: ExtinguisherType;
  weight: ExtinguisherWeight;
  expiryDate: string; 
  observations: string;
  inspections: Inspection[];
};

export const hoseQuantities = [1, 2, 3, 4] as const;
export type HoseQuantity = (typeof hoseQuantities)[number];

export const hoseTypes = ["1 1/2", "2 1/2"] as const;
export type HoseType = (typeof hoseTypes)[number];

export const keyQuantities = [1, 2, 3, 4] as const;
export type KeyQuantity = (typeof keyQuantities)[number];

export const nozzleQuantities = [1, 2, 3, 4] as const;
export type NozzleQuantity = (typeof nozzleQuantities)[number];

export type Hose = {
  id: string;
  qrCodeValue: string;
  quantity: HoseQuantity;
  hoseType: HoseType;
  keyQuantity: KeyQuantity;
  nozzleQuantity: NozzleQuantity;
  expiryDate: string;
  observations: string;
  inspections: Inspection[];
};

export type Building = {
  id: string;
  name: string;
  extinguishers: Extinguisher[];
  hoses: Hose[];
};

export type Client = {
  id: string;
  name: string;
  buildings: Building[];
};
