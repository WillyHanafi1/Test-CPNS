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
    segment: "TIU",
    content: number === 1
      ? String.raw`Perhatikan tabel berikut.

| Peserta | Skor |
| --- | ---: |
| Putri | 88 |

$11,\ 48,\ 16,\ 42,\ 23,\ 36,\ 32,\ 30,\ \dots,\ \dots$`
      : "Soal TIU sintetis",
    options: [
      { id: `a${number}`, label: "A", content: String.raw`$\frac{5}{12}$` },
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
  await expect(
    page.getByText(/Latihan SKD dengan soal penalaran \(HOTS\) dan pembahasan/),
  ).toBeVisible();
  const footerStrip = page.getByLabel("Statistik pengunjung situs");
  await expect(footerStrip).toBeVisible();
  await expect(footerStrip).toContainText("5 online");
  await expect(footerStrip).toContainText("412 bulan ini");
  await expect.poll(() => visitPosts).toBeGreaterThanOrEqual(1);

  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/session/ux-check");
  const article = page.locator("main article");
  await expect(
    article.getByRole("table").getByRole("columnheader", { name: "Skor" }),
  ).toHaveAttribute("scope", "col");
  await expect(article.getByRole("cell", { name: "88" })).toBeVisible();
  await expect(article.locator("label .katex")).toHaveCSS("font-size", "19.2px");
  const series = article.locator("p").filter({
    has: page.locator(".katex", { hasText: "11" }),
  });
  await expect(series).toHaveCSS("overflow-x", "auto");
  expect(await series.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await series.press("ArrowRight");
  await expect.poll(() => series.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await expect(page.getByRole("group", { name: "Pilih satu jawaban untuk soal 1" })).toBeVisible();

  // 2. Verify high-visibility Exam Finish CTA + structured confirmation modal
  await page.setViewportSize({ width: 1280, height: 860 });
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

test("structured discussion renders steps, display math, and zoomable diagram image", async ({
  page,
}) => {
  const diagramUrl =
    "https://assets.example.test/pembahasan/gen01/q39_pembahasan.svg";
  const diagramSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect width="320" height="160" fill="#ffffff"/><circle cx="160" cy="80" r="50" fill="none" stroke="#111827" stroke-width="3"/></svg>`;
  const discussion = [
    "Jawaban yang benar adalah **Opsi B**.",
    "",
    "Kerjakan operasi langkah demi langkah:",
    "",
    String.raw`1. Ubah persen: $25\% = \frac{1}{4}$, lalu hitung $\frac{5}{6} + \frac{1}{4} = \frac{13}{12}$.`,
    String.raw`2. Hitung perkalian: $0{,}6 \times \frac{13}{12} = 0{,}65$.`,
    "",
    "$$",
    String.raw`1{,}75 - 0{,}65 + 1{,}2 = 2{,}3`,
    "$$",
    "",
    `![Diagram posisi duduk soal 39](${diagramUrl})`,
  ].join("\n");

  await page.route(diagramUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: diagramSvg,
    }),
  );

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
        email: "peserta@example.test",
        role: "participant",
      };
    } else if (url.pathname.endsWith("/exam/session/review-check/review")) {
      data = {
        session_id: "review-check",
        package_id: "pkg-1",
        package_title: "Tryout SKD CPNS 2026 #1",
        total_score: 5,
        score_twk: 0,
        score_tiu: 5,
        score_tkp: 0,
        is_passed: false,
        questions: [
          {
            id: "q43",
            number: 43,
            segment: "TIU",
            content: String.raw`Nilai dari $\frac{7}{4} - 0{,}6 \times \left(\frac{5}{6} + 25\%\right) + 1{,}8 \div 1{,}5$ adalah ...`,
            discussion,
            selected_option_id: "opt-b",
            options: [
              { id: "opt-a", label: "A", content: "1,9", score: 0 },
              { id: "opt-b", label: "B", content: "2,3", score: 5 },
            ],
          },
        ],
      };
    }
    return route.fulfill({ json: data, headers });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/session/review-check/review");

  const section = page.locator("section[aria-labelledby='discussion-title']");
  await expect(section).toBeVisible();
  await expect(section.locator("ol li")).toHaveCount(2);
  // Ensure list items containing inline KaTeX do not clip outside decimal markers via overflow-x: auto
  const firstLiOverflowX = await section
    .locator("ol li")
    .first()
    .evaluate((el) => getComputedStyle(el).overflowX);
  expect(firstLiOverflowX).toBe("visible");
  await expect(section.locator(".katex-display")).toBeVisible();

  const zoomBtn = section.getByRole("button", {
    name: /Perbesar diagram posisi duduk soal 39/i,
  });
  await expect(zoomBtn).toBeVisible();
  await zoomBtn.click();
  await expect(
    page.getByRole("dialog", { name: "Diagram posisi duduk soal 39" }),
  ).toBeVisible();
});
