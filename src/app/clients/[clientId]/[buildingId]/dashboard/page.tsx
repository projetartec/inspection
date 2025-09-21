import { getBuildingById, getExtinguishersByBuilding, getHosesByBuilding } from "@/lib/data";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Droplets, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage({ params }: { params: { clientId: string, buildingId: string }}) {
  const { clientId, buildingId } = params;
  
  const building = await getBuildingById(clientId, buildingId);
  
  if (!building) {
    notFound();
  }

  const [extinguishers, hoses] = await Promise.all([
    getExtinguishersByBuilding(clientId, buildingId),
    getHosesByBuilding(clientId, buildingId),
  ]);

  const isExpired = (item: { expiryDate: string }) => {
    if (!item.expiryDate) return false;
    try {
      // Dates are stored as 'YYYY-MM-DD' strings, parseISO handles this.
      const date = new Date(item.expiryDate.split('T')[0] + 'T00:00:00');
      return date < new Date();
    } catch {
      return false;
    }
  };
  const expiredExtinguishers = extinguishers.filter(isExpired).length;
  const expiredHoses = hoses.filter(isExpired).length;

  const stats = [
    { title: "Total de Extintores", value: extinguishers.length, icon: Flame, color: "text-muted-foreground", href: `/clients/${clientId}/${buildingId}/extinguishers` },
    { title: "Total de Mangueiras", value: hoses.length, icon: Droplets, color: "text-muted-foreground", href: `/clients/${clientId}/${buildingId}/hoses` },
    { title: "Itens Vencidos", value: expiredExtinguishers + expiredHoses, icon: AlertTriangle, color: "text-destructive", description: `${expiredExtinguishers} extintores, ${expiredHoses} mangueiras`, href: null },
  ];

  const scanUrl = `/clients/${clientId}/${buildingId}/scan`;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={`Painel: ${building.name}`} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const CardComponent = (
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                {stat.description && <p className="text-xs text-muted-foreground">{stat.description}</p>}
              </CardContent>
            </Card>
          );
          
          return stat.href ? (
            <Link href={stat.href} key={stat.title}>
              {CardComponent}
            </Link>
          ) : (
            <div key={stat.title}>
              {CardComponent}
            </div>
          );
        })}
      </div>
      <Card className="text-center">
        <CardHeader>
            <CardTitle className="font-headline">Pronto para a Inspeção?</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground mb-4">Inicie uma nova inspeção escaneando um código QR.</p>
            <Button asChild size="lg">
                <Link href={scanUrl}>Iniciar Leitura</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
