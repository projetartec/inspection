"use client"

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "./ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = ButtonProps & {
    children: React.ReactNode;
}

export function SubmitButton({ children, className, ...props }: SubmitButtonProps) {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" disabled={pending} className={cn(className)} {...props}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </Button>
    )
}
