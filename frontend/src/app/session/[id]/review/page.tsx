import { ReviewView } from "@/features/exam/Results";

export default async function Review({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string; question?: string }>;
}) {
  const [{ id }, { filter, question }] = await Promise.all([
    params,
    searchParams,
  ]);
  return (
    <ReviewView
      key={`${id}:${filter}:${question}`}
      id={id}
      initialFilter={filter}
      initialQuestion={question}
    />
  );
}
