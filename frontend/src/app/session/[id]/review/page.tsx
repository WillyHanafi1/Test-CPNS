"use client";
import { useParams } from "next/navigation";
import { ReviewView } from "@/features/exam/Results";
export default function Review() {
  const { id } = useParams<{ id: string }>();
  return <ReviewView id={id} />;
}
