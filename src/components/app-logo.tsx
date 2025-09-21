import { ShieldCheck } from "lucide-react";

export function AppLogo() {
  return (
    <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:justify-center">
      <ShieldCheck className="size-7 text-primary" />
      <div className="flex flex-col group-data-[collapsible=icon]:hidden">
        <span className="font-headline text-lg font-bold leading-none text-foreground">
          Brazil Extintores
        </span>
        <span className="text-xs text-muted-foreground">Inspeção</span>
      </div>
    </div>
  );
}
