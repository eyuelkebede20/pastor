import type { Metadata } from "next";
import { PageHeading } from "@/components/ui";
import { ScannerView } from "@/components/ScannerView";

export const metadata: Metadata = {
  title: "QR reader",
  description:
    "Scan a QR code with your camera or an image. Everything stays on your device.",
};

export default function ScanPage() {
  return (
    <div>
      <PageHeading
        title="QR reader"
        subtitle="Scan with your camera or an image. Nothing leaves your device."
      />
      <ScannerView />
    </div>
  );
}
