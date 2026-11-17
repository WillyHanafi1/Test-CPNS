"use client";
import { useParams } from "next/navigation";
import { ResultView } from "@/features/exam/Results";
export default function Result() {
  const { id } = useParams<{ id: string }>();
  return <ResultView id={id} />;
}
