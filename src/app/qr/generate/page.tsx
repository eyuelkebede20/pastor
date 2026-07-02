import type { Metadata } from "next";
import { PageHeading } from "@/components/ui";
import { QRGenerator } from "@/components/QRGenerator";

export const metadata: Metadata = {
  title: "QR generator",
  description:
    "Turn a link, text, Wi-Fi network, or contact card into a downloadable QR code.",
};

export default function GeneratePage() {
  return (
    <div>
      <PageHeading
        title="QR generator"
        subtitle="Pick what to encode, tweak the look, then download a PNG or SVG."
      />
      <QRGenerator />
    </div>
  );
}
