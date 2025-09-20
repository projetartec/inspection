import { SidebarTrigger } from "./ui/sidebar";

type PageHeaderProps = {
  title: string;
  children?: React.ReactNode;
};

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden"/>
            <h1 className="text-3xl font-headline font-bold tracking-tight">{title}</h1>
        </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
