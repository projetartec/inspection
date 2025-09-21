"use client"

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "./ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = ButtonProps & {
    children: React.ReactNode;
    isSubmitting?: boolean;
}

export function SubmitButton({ children, className, isSubmitting, ...props }: SubmitButtonProps) {
    // useFormStatus is only for Server Actions. We get isSubmitting as a prop now.
    // const { pending } = useFormStatus();
    const pending = isSubmitting;

    return (
        <Button type="submit" disabled={pending} className={cn(className)} {...props}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </Button>
    )
}
