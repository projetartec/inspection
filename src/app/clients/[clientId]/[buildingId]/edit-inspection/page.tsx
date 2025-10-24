
import { getBuildingById, getExtinguishersByBuilding, getHosesByBuilding } from "@/lib/data";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { LastInspectionEditor } from "@/components/last-inspection-editor";

export default async function EditInspectionPage({ params }: { params: { clientId: string, buildingId: string } }) {
    const { clientId, buildingId } = params;

    const buildingPromise = getBuildingById(clientId, buildingId);
    const extinguishersPromise = getExtinguishersByBuilding(clientId, buildingId);
    const hosesPromise = getHosesByBuilding(clientId, buildingId);

    const [building, extinguishers, hoses] = await Promise.all([
        buildingPromise,
        extinguishersPromise,
        hosesPromise,
    ]);

    if (!building) {
        notFound();
    }

    return (
        <div className="flex flex-col gap-8">
            <PageHeader title={`Editar Inspeção: ${building.name}`} href={`/clients/${clientId}`} />
            <LastInspectionEditor 
                clientId={clientId}
                buildingId={buildingId}
                initialExtinguishers={extinguishers} 
                initialHoses={hoses} 
            />
        </div>
    );
}
