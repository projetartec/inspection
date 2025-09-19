import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExtinguishers, getHoses } from "@/lib/data";
import { Flame, Droplets, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const extinguishers = await getExtinguishers();
  const hoses = await getHoses();

  const isExpired = (item: { expiryDate: Date }) => new Date(item.expiryDate) < new Date();
  const expiredExtinguishers = extinguishers.filter(isExpired).length;
  const expiredHoses = hoses.filter(isExpired).length;

  const stats = [
    { title: "Total Extinguishers", value: extinguishers.length, icon: Flame, color: "text-muted-foreground" },
    { title: "Total Hoses", value: hoses.length, icon: Droplets, color: "text-muted-foreground" },
    { title: "Items Expired", value: expiredExtinguishers + expiredHoses, icon: AlertTriangle, color: "text-destructive", description: `${expiredExtinguishers} extinguishers, ${expiredHoses} hoses` },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              {stat.description && <p className="text-xs text-muted-foreground">{stat.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="text-center">
        <CardHeader>
            <CardTitle className="font-headline">Ready for Inspection?</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground mb-4">Start a new inspection by scanning a QR code.</p>
            <Button asChild size="lg">
                <Link href="/scan">Start Scan</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
