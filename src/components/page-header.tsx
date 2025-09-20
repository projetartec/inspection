import { SidebarTrigger } from "./ui/sidebar";
import Link from "next/link";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  children?: React.ReactNode;
  href?: string;
};

export function PageHeader({ title, href, children }: PageHeaderProps) {
  const TitleComponent = href ? Link : 'h1';
  const titleProps = href ? { href } : {};

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden"/>
        <TitleComponent {...titleProps} className={cn(
            "text-3xl font-headline font-bold tracking-tight",
            href && "hover:underline"
        )}>
            {title}
        </TitleComponent>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
