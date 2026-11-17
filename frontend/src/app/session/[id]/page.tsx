"use client";
import { useParams } from "next/navigation";
import Runner from "@/features/exam/Runner";
export default function Exam() {
  const { id } = useParams<{ id: string }>();
  return <Runner id={id} />;
}
