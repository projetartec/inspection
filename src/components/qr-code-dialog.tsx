"use client";

import { useRef } from 'react';
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface QrCodeDialogProps {
  value: string;
  label: string;
  children: React.ReactNode;
}

export function QrCodeDialog({ value, label, children }: QrCodeDialogProps) {
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = qrCodeRef.current;
    if (printContent) {
      const windowUrl = 'about:blank';
      const uniqueName = new Date().getTime();
      const windowName = `Print_${uniqueName}`;
      const printWindow = window.open(windowUrl, windowName, 'width=400,height=400');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>Imprimir QR Code</title></head>
            <body style="text-align: center; margin-top: 50px;">
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>QR Code do Equipamento</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-4 py-4">
          <div ref={qrCodeRef} className="p-4 bg-white rounded-lg">
            <QRCode value={value} size={180} />
            <p className="text-center font-mono mt-2 text-sm text-black">{label}</p>
          </div>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2" />
            Imprimir QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
