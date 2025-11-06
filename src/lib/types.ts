

export type Inspection = {
  id: string;
  date: string;
  notes: string;
  status: 'OK' | 'N/C'; // General status for the item
  itemStatuses?: { [key: string]: 'OK' | 'N/C' }; // Individual status for checklist items
};

export const extinguisherTypes = ["AP", "BC", "ABC", "CO2", "EPM"] as const;
export type ExtinguisherType = (typeof extinguisherTypes)[number];

export const extinguisherWeights = [2, 4, 4.5, 6, 8, 10, 12, 20, 30, 50] as const;
export type ExtinguisherWeight = (typeof extinguisherWeights)[number];

export type Extinguisher = {
  id: string;
  qrCodeValue: string;
  type: ExtinguisherType;
  weight: ExtinguisherWeight; // Corresponds to CAPACIDADE
  expiryDate: string; // Corresponds to RECARGA
  hydrostaticTestYear: number; // Corresponds to TEST. HIDROSTATICO
  observations: string; // Corresponds to LOCALIZAÇÃO
  inspections: Inspection[];
};

// --- Hydrant (Hose) Types ---
export const hydrantQuantities = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type HydrantQuantity = (typeof hydrantQuantities)[number];

export const hydrantTypes = ["1", "2", "3", "4", "5", "6", "7"] as const;
export type HydrantHoseType = (typeof hydrantTypes)[number];

export const hydrantDiameters = ["1 1/2", "2 1/2"] as const;
export type HydrantDiameter = (typeof hydrantDiameters)[number];

export const hydrantHoseLengths = [10, 15, 20, 30, 40, 50] as const;
export type HydrantHoseLength = (typeof hydrantHoseLengths)[number];

export const hydrantKeyQuantities = [0, 1, 2, 3, 4] as const;
export type HydrantKeyQuantity = (typeof hydrantKeyQuantities)[number];

export const hydrantNozzleQuantities = [0, 1, 2, 3, 4] as const;
export type HydrantNozzleQuantity = (typeof hydrantNozzleQuantities)[number];


export type Hydrant = {
  id: string; // HIDRANTE
  qrCodeValue: string;
  location: string; // LOCAL
  quantity: HydrantQuantity; // QTD MANG.
  hoseType: HydrantHoseType; // TIPO
  diameter: HydrantDiameter; // DIAMETRO
  hoseLength: HydrantHoseLength; // MEDIDA MANGUEIRAS
  keyQuantity: HydrantKeyQuantity; // CHAVE
  nozzleQuantity: HydrantNozzleQuantity; // ESG (Esguicho)
  hydrostaticTestDate: string; // PROX. TESTE HIDR.
  inspections: Inspection[];
};

export type ManualInspection = Inspection & { manualId: string };

export type Building = {
  id: string;
  name: string;
  extinguishers: Extinguisher[];
  hoses: Hydrant[];
  manualInspections?: ManualInspection[];
  gpsLink?: string;
  lastInspected?: string;
};

export type Client = {
  id: string;
  name: string; // "Empresa"
  fantasyName?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  phone1?: string;
  phone2?: string;
  cnpj?: string;
  email?: string;
  adminContact?: string;
  caretakerContact?: string;
  buildings: Building[];
};

