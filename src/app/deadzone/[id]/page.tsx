import { notFound } from "next/navigation";
import { getDeadZoneById } from "@/lib/deadZones";
import DeadZoneDetailClient from "./DeadZoneDetailClient";

type PageProps = { params: Promise<{ id: string }> };

export default async function DeadZonePage({ params }: PageProps) {
  const { id } = await params;
  const zone = getDeadZoneById(id);
  if (!zone) notFound();
  return <DeadZoneDetailClient zone={zone} />;
}
