import type { Extinguisher, Hose, Inspection } from '@/lib/types';

let extinguishers: Extinguisher[] = [
  {
    id: 'ext-1',
    qrCodeValue: 'fireguard-ext-1',
    type: 'ABC',
    weight: 10,
    expiryDate: new Date('2025-12-31'),
    observations: 'Located near main entrance, first floor.',
    inspections: [
      { id: 'insp-ext-1-1', date: new Date('2024-01-15T10:00:00Z'), notes: 'Routine check, all OK.', location: { latitude: 34.0522, longitude: -118.2437 } }
    ]
  },
  {
    id: 'ext-2',
    qrCodeValue: 'fireguard-ext-2',
    type: 'CO2',
    weight: 6,
    expiryDate: new Date('2024-05-20'),
    observations: 'In the server room. Handle with care.',
    inspections: []
  },
];

let hoses: Hose[] = [
  {
    id: 'hose-1',
    qrCodeValue: 'fireguard-hose-1',
    quantity: 2,
    hoseType: '1 1/2',
    keyQuantity: 2,
    nozzleQuantity: 2,
    expiryDate: new Date('2026-06-30'),
    observations: 'In the east wing cabinet, second floor.',
    inspections: []
  },
];

// --- Data Access Functions ---

export async function getExtinguishers(): Promise<Extinguisher[]> {
  return Promise.resolve(JSON.parse(JSON.stringify(extinguishers)));
}

export async function getHoses(): Promise<Hose[]> {
  return Promise.resolve(JSON.parse(JSON.stringify(hoses)));
}

export async function findEquipmentByQr(qrCodeValue: string): Promise<{ type: 'extinguisher' | 'hose'; data: Extinguisher | Hose } | null> {
  const extinguisher = extinguishers.find(e => e.qrCodeValue === qrCodeValue);
  if (extinguisher) return { type: 'extinguisher', data: JSON.parse(JSON.stringify(extinguisher)) };

  const hose = hoses.find(h => h.qrCodeValue === qrCodeValue);
  if (hose) return { type: 'hose', data: JSON.parse(JSON.stringify(hose)) };
  
  return null;
}

export async function getExtinguisherById(id: string): Promise<Extinguisher | null> {
    const extinguisher = extinguishers.find(e => e.id === id);
    return extinguisher ? Promise.resolve(JSON.parse(JSON.stringify(extinguisher))) : null;
}

export async function getHoseById(id: string): Promise<Hose | null> {
    const hose = hoses.find(h => h.id === id);
    return hose ? Promise.resolve(JSON.parse(JSON.stringify(hose))) : null;
}

export async function addExtinguisher(data: Omit<Extinguisher, 'id' | 'qrCodeValue' | 'inspections'>) {
    const newId = `ext-${extinguishers.length + 1}`;
    const newExtinguisher: Extinguisher = {
        id: newId,
        qrCodeValue: `fireguard-${newId}`,
        ...data,
        inspections: [],
    };
    extinguishers.push(newExtinguisher);
    return newExtinguisher;
}

export async function addHose(data: Omit<Hose, 'id' | 'qrCodeValue' | 'inspections'>) {
    const newId = `hose-${hoses.length + 1}`;
    const newHose: Hose = {
        id: newId,
        qrCodeValue: `fireguard-${newId}`,
        ...data,
        inspections: [],
    };
    hoses.push(newHose);
    return newHose;
}

export async function addInspection(qrCodeValue: string, inspectionData: Omit<Inspection, 'id'>): Promise<string | null> {
    const equipment = await findEquipmentByQr(qrCodeValue);
    if (!equipment) return null;

    const newInspectionId = `insp-${equipment.data.id}-${equipment.data.inspections.length + 1}`;
    const newInspection: Inspection = { ...inspectionData, id: newInspectionId };

    if (equipment.type === 'extinguisher') {
        const index = extinguishers.findIndex(e => e.id === equipment.data.id);
        if (index !== -1) {
            extinguishers[index].inspections.push(newInspection);
            return `/extinguishers/${equipment.data.id}`;
        }
    } else if (equipment.type === 'hose') {
        const index = hoses.findIndex(h => h.id === equipment.data.id);
        if (index !== -1) {
            hoses[index].inspections.push(newInspection);
            return `/hoses/${equipment.data.id}`;
        }
    }
    return null;
}
