"use client"

import * as React from "react"
import { Moon, Sun, Settings, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <div className="fixed bottom-8 right-8 z-50">
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button
                style={{ backgroundColor: '#FF4500' }}
                className="h-14 w-14 rounded-full text-white shadow-lg transition-all hover:brightness-95 active:brightness-90"
                size="icon"
            >
                <Settings className="h-6 w-6" />
                <span className="sr-only">Abrir menu de ações</span>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2" />
                <span>Claro</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2" />
                <span>Escuro</span>
            </DropdownMenuItem>
             <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="mr-2" />
                <span>Sistema</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
    </div>
  )
}
