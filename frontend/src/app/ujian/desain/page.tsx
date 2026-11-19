import { createReadStream } from "node:fs";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import ExamStudio from "@/features/exam-studio/ExamStudio";
import { designs, fallbackPackage, type ExamPackage } from "@/features/exam-studio/model";

export const metadata: Metadata = {
  title: "Studio Desain Ujian — TOCPNS",
  robots: { index: false, follow: false },
};

async function loadPackage(): Promise<ExamPackage> {
  try {
    // Small reads also work with Docker Desktop's Windows bind mounts.
    const path = process.env.EXAM_STUDIO_PACKAGE_PATH || "/run/exam-studio/package.json";
    const source = createReadStream(/* turbopackIgnore: true */ path, { encoding: "utf8", highWaterMark: 8192 });
    let contents = "";
    for await (const chunk of source) contents += chunk;
    return JSON.parse(contents) as ExamPackage;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallbackPackage;
    throw error;
  }
}

export default async function ExamDesignPage({ searchParams }: {
  searchParams: Promise<{ desain?: string; mode?: string; soal?: string }>;
}) {
  await connection();
  if (process.env.EXAM_STUDIO_ENABLED !== "true") notFound();

  const [pack, params] = await Promise.all([loadPackage(), searchParams]);
  const design = designs.find((item) => item.id === params.desain) ?? designs[0];
  const mode = params.mode === "hasil" || params.mode === "pembahasan" ? params.mode : "ujian";
  const question = pack.questions.find((item) => item.number === Number(params.soal));
  return <ExamStudio pack={pack} initialDesign={design.id} initialMode={mode} initialQuestion={question?.number} />;
}
