import { expect, test } from "@playwright/test";

test("deadline submission retries after reconnect and reports only choices the server missed", async ({
  page,
}) => {
  const started = new Date("2026-11-19T03:00:00Z");
  const deadline = new Date(started.getTime() + 100 * 60_000);
  const questions = [1, 2].map((number) => ({
    id: `q${number}`,
    number,
    segment: "TWK",
    content: `Soal sintetis ${number}`,
    options: [{ id: `a${number}`, label: "A", content: "Pilihan A" }],
  }));
  const received: Record<string, string> = {};
  let saved = 0;
  let submissions = 0;
  let requestMode: string | undefined;
  await page.clock.install({ time: started });
  await page.clock.pauseAt(new Date(started.getTime() + 1000));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      "access-control-allow-origin": request.headers().origin || url.origin,
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    };
    if (request.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    let data: unknown = {};
    if (url.pathname.endsWith("/auth/me")) {
      data = {
        id: "participant",
        email: "preview@example.test",
        role: "participant",
      };
    } else if (url.pathname.endsWith("/state")) {
      data = {
        session_id: "sample",
        package: { id: "package", title: "Simulasi", questions },
        server_now: started.toISOString(),
        end_time: deadline.toISOString(),
        status: "ongoing",
        writer_epoch: 1,
        writer_id: null,
        answers: {},
        revisions: {},
      };
    } else if (url.pathname.endsWith("/autosave/sample")) {
      const answer = request.postDataJSON();
      received[answer.question_id] = answer.option_id;
      saved++;
      return route.abort();
    } else if (url.pathname.endsWith("/finish/sample")) {
      requestMode = request.postDataJSON().mode;
      submissions++;
      if (submissions === 1) return route.abort();
      data = { status: "processing" };
    } else if (url.pathname.endsWith("/result/sample")) {
      data = {
        status: "finished",
        package_id: "package",
        total_score: 5,
        score_twk: 5,
        score_tiu: 0,
        score_tkp: 0,
        is_passed: false,
        ...(url.searchParams.has("include_answers")
          ? { answers: received }
          : {}),
      };
    }
    return route.fulfill({ json: data, headers });
  });

  await page.goto("/session/sample");
  await expect(page.getByRole("timer")).toHaveText("100:00");
  await page.getByRole("radio").check();
  await expect.poll(() => saved).toBe(1);
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Berikutnya" }).click();
  await page.getByRole("radio").check();
  expect(submissions).toBe(0);
  await page.clock.fastForward(100 * 60_000);
  await expect(
    page.getByText(/Sambungkan kembali untuk melihat status pengumpulan/),
  ).toBeVisible();
  expect(submissions).toBe(0);

  await page.context().setOffline(false);
  await page.clock.runFor(100);
  await expect.poll(() => submissions).toBe(1);
  await page.clock.runFor(5100);
  await expect(page).toHaveURL(/\/session\/sample\/result$/);
  expect(requestMode).toBe("deadline");
  expect(received).toEqual({ q1: "a1" });
  const notice = page.getByText(
    /1 pilihan terakhir dari tab ini belum tercatat/,
  );
  await expect(notice).toBeVisible();
  await page.reload();
  await expect(notice).toBeVisible();
});

test("HOTS messaging, footer visitor counter, and clear exam finish modal work smoothly", async ({
  page,
}) => {
  const started = new Date("2026-11-22T03:00:00Z");
  const deadline = new Date(started.getTime() + 100 * 60_000);
  const questions = [1, 2].map((number) => ({
    id: `q${number}`,
    number,
    segment: "TWK",
    content: `Soal HOTS sintetis ${number}`,
    options: [
      { id: `a${number}`, label: "A", content: "Pilihan A" },
      { id: `b${number}`, label: "B", content: "Pilihan B" },
    ],
  }));
  let visitPosts = 0;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      "access-control-allow-origin": request.headers().origin || url.origin,
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    };
    if (request.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });

    let data: unknown = {};
    if (url.pathname.endsWith("/public/visit")) {
      visitPosts++;
      data = { recorded: true, is_new_today: true, path: "/" };
    } else if (url.pathname.endsWith("/public/visitors")) {
      data = {
        online_now: 5,
        today_visitors: 28,
        month_visitors: 412,
        total_visitors: 1290,
      };
    } else if (url.pathname.endsWith("/public/stats")) {
      data = {
        packages_count: 2,
        questions_count: 220,
        users_count: 50,
        completed_sessions_count: 15,
      };
    } else if (url.pathname.endsWith("/public/pricing")) {
      data = { pro_price: 29000, pro_normal_price: 49000, pro_price_label: "Early Bird" };
    } else if (url.pathname.endsWith("/auth/me")) {
      data = {
        id: "participant",
        email: "peserta@example.test",
        role: "participant",
      };
    } else if (url.pathname.endsWith("/state")) {
      data = {
        session_id: "ux-check",
        package: { id: "pkg", title: "Simulasi HOTS #1", questions },
        server_now: started.toISOString(),
        end_time: deadline.toISOString(),
        status: "ongoing",
        writer_epoch: 1,
        writer_id: null,
        answers: { q1: "a1" },
        revisions: { q1: 1 },
      };
    }
    return route.fulfill({ json: data, headers });
  });

  // 1. Verify HOTS messaging + visitor counter strip on Home
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.goto("/");
  await expect(page.getByText("Semua Soal HOTS", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/referensi peserta ujian CPNS sebelumnya/i).first(),
  ).toBeVisible();
  const footerStrip = page.getByLabel("Statistik pengunjung situs");
  await expect(footerStrip).toBeVisible();
  await expect(footerStrip).toContainText("5 online");
  await expect(footerStrip).toContainText("412 bulan ini");
  await expect.poll(() => visitPosts).toBeGreaterThanOrEqual(1);

  // 2. Verify high-visibility Exam Finish CTA + structured confirmation modal
  await page.goto("/session/ux-check");
  const headerFinish = page
    .locator("header")
    .getByRole("button", { name: /Selesai ujian/i });
  await expect(headerFinish).toBeVisible();
  await headerFinish.click();

  await expect(
    page.getByRole("heading", { name: "Selesaikan dan kumpulkan ujian?" }),
  ).toBeVisible();
  const summary = page.getByLabel("Ringkasan jawaban");
  await expect(summary).toContainText("Dijawab");
  await expect(summary).toContainText("Belum dijawab");
  await expect(
    page.getByRole("button", { name: "Kembali ke soal" }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Ya, kumpulkan ujian" }),
  ).toBeVisible();
});
