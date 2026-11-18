import { expect, test, Page } from "@playwright/test";
import path from "node:path";

const sample = (period = "month") => ({
  period,
  period_label: period === "month" ? "November 2026" : "Semua waktu",
  stats: {
    total_amount: period === "month" ? 15000 : 25000,
    target_amount: period === "month" ? 2000000 : 0,
    percentage: 0.75,
    supporter_count: 3,
    donation_count: 3,
  },
  top_supporters: [
    {
      full_name: "Sinta Wijaya",
      total_amount: 10000,
      rank: 1,
      donation_count: 1,
      message: "Terima kasih sudah merawat ruang belajar ini.",
    },
    {
      full_name: "Budi Santoso",
      total_amount: 4000,
      rank: 2,
      donation_count: 1,
      message: null,
    },
  ],
  recent_supporters: [
    {
      full_name: "Pendukung anonim",
      amount: 1000,
      is_anonymous: true,
      message: "Semangat berlatih!",
      paid_at: "2026-11-18T05:35:28Z",
      created_at: "2026-11-18T05:34:00Z",
    },
    {
      full_name: "Sinta Wijaya",
      amount: 10000,
      is_anonymous: false,
      message: "Terima kasih sudah merawat ruang belajar ini.",
      paid_at: "2026-11-18T05:20:00Z",
      created_at: "2026-11-18T05:19:00Z",
    },
    {
      full_name: "Budi Santoso",
      amount: 4000,
      is_anonymous: false,
      message: null,
      paid_at: "2026-11-18T05:10:00Z",
      created_at: "2026-11-18T05:09:00Z",
    },
  ],
  updated_at: "2026-11-18T05:36:00Z",
});

async function fixture(
  page: Page,
  options: { guest?: boolean; failure?: boolean; anonymousOnly?: boolean } = {},
) {
  let authenticated = !options.guest;
  let hidden = false;
  let failure = !!options.failure;
  const requests: Record<string, unknown>[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const target = url.pathname.split("/api/v1")[1];
    if (target === "/auth/me") {
      if (!authenticated) {
        await route.fulfill({
          status: 401,
          json: { detail: "Not authenticated" },
        });
        return;
      }
      await route.fulfill({
        json: {
          id: "synthetic-owner",
          email: "private@example.test",
          role: options.guest ? "admin" : "participant",
          is_pro: false,
          profile: { full_name: "Sinta Wijaya" },
        },
      });
      return;
    }
    if (target === "/auth/login") {
      authenticated = true;
      await route.fulfill({ json: { role: "admin" } });
      return;
    }
    if (target === "/transactions/donations/overview") {
      if (failure) {
        await route.fulfill({
          status: 503,
          json: { detail: "Data sementara belum tersedia." },
        });
        return;
      }
      const data = sample(url.searchParams.get("period") || "month");
      if (options.anonymousOnly) {
        data.top_supporters = [];
        data.recent_supporters = [
          {
            ...data.recent_supporters[0],
            message: '<img src=x onerror="window.fakeAttack=true">',
          },
        ];
        data.stats = {
          ...data.stats,
          total_amount: 1000,
          supporter_count: 1,
          donation_count: 1,
        };
      }
      await route.fulfill({ json: data });
      return;
    }
    if (target === "/transactions/donate") {
      requests.push(request.postDataJSON());
      await route.fulfill({
        status: 503,
        json: { detail: "Checkout uji belum tersedia. Silakan coba lagi." },
      });
      return;
    }
    if (target === "/transactions/my-transactions") {
      await route.fulfill({
        json: [
          {
            id: "synthetic-donation",
            order_id: "DONATE-preview",
            amount: 5000,
            transaction_type: "donation",
            payment_status: "success",
            created_at: "2026-11-18T05:35:00Z",
            is_anonymous: hidden,
          },
        ],
      });
      return;
    }
    if (target === "/transactions/donations/DONATE-preview/visibility") {
      hidden = request.postDataJSON().is_anonymous;
      await route.fulfill({
        json: { order_id: "DONATE-preview", is_anonymous: hidden },
      });
      return;
    }
    await route.fulfill({ json: {} });
  });
  return {
    requests,
    errors,
    clearFailure: () => {
      failure = false;
    },
  };
}

test("home puts the community section after learning content, shows donor chat messages, and the mobile header exposes Donasi", async ({
  page,
}) => {
  const { errors } = await fixture(page, { guest: true });
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "Ruang latihan ini tumbuh bersama.",
  });
  await expect(section.getByText("Rp 15.000", { exact: true })).toBeVisible();
  await expect(
    section.getByText("Semangat berlatih!", { exact: true }),
  ).toBeVisible();
  await expect(
    section
      .getByText("Terima kasih sudah merawat ruang belajar ini.", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  const positions = await page.evaluate(() => ({
    feature: document.querySelector(".feature-card")!.getBoundingClientRect()
      .bottom,
    donations: document.querySelector(".donation-home")!.getBoundingClientRect()
      .top,
    footer: document.querySelector("footer")!.getBoundingClientRect().top,
    end: document.querySelector(".donation-home")!.getBoundingClientRect()
      .bottom,
  }));
  expect(positions.donations).toBeGreaterThan(positions.feature);
  expect(positions.footer).toBeGreaterThanOrEqual(positions.end);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.locator("header").getByRole("link", { name: "Donasi", exact: true }),
  ).toBeVisible();
  await page
    .locator("header")
    .getByRole("link", { name: "Donasi", exact: true })
    .click();
  await expect(page).toHaveURL(/\/donasi$/);
  expect(errors).toEqual([]);
});

test("guest selection and message survive login, including an admin returning to the donation flow", async ({
  page,
}) => {
  await fixture(page, { guest: true });
  await page.goto("/donasi");
  await page.getByLabel("Nominal lain (rupiah)").fill("Rp 7.500");
  await page
    .getByLabel("Pesan untuk komunitas")
    .fill("Doakan lulus CPNS tahun ini!");
  await page.getByRole("button", { name: "Masuk & lanjutkan donasi" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(new URL(page.url()).searchParams.get("next")).toBe(
    "/donasi?amount=7500",
  );
  await page
    .getByLabel("Email", { exact: true })
    .fill("synthetic@example.test");
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("SyntheticOnly123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/donasi\?amount=7500$/);
  await expect(
    page.getByRole("button", { name: "Lanjutkan · Rp 7.500" }),
  ).toBeVisible();
  await expect(page.getByLabel("Pesan untuk komunitas")).toHaveValue(
    "Doakan lulus CPNS tahun ini!",
  );
});

test("donation shows name by default, supports one-click anonymous toggle, rejects invalid money, and can retry without relying on storage", async ({
  page,
}) => {
  const { requests, errors } = await fixture(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new Error("blocked");
      },
    });
  });
  await page.goto("/donasi");
  const nameCheckbox = page.getByLabel("Tampilkan nama singkat saya");
  await expect(nameCheckbox).toBeChecked();
  await nameCheckbox.uncheck();
  await page.getByLabel("Nominal lain (rupiah)").fill("-5000");
  await page.getByRole("button", { name: "Periksa nominal" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "nominal bulat",
  );
  expect(requests).toHaveLength(0);
  await page.getByRole("button", { name: "Rp 5.000", exact: true }).click();
  await page.getByRole("button", { name: "Lanjutkan · Rp 5.000" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Checkout uji",
  );
  expect(requests[0]).toMatchObject({
    amount: 5000,
    is_anonymous: true,
    message: null,
  });
  await page.route("**/api/v1/transactions/donate", (route) =>
    route.fulfill({
      json: {
        order_id: "DONATE-preview",
        redirect_url: "https://checkout.doku.com/preview-only",
      },
    }),
  );
  await page.route("https://checkout.doku.com/preview-only", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Checkout sintetis</h1>",
    }),
  );
  await page.getByRole("button", { name: "Lanjutkan · Rp 5.000" }).click();
  await expect(page).toHaveURL("https://checkout.doku.com/preview-only");
  expect(errors).toEqual([]);
});

test("rapid repeated form submission sends only one checkout request", async ({
  page,
}) => {
  const { requests } = await fixture(page);
  await page.goto("/donasi");
  await expect(
    page.getByRole("button", { name: "Lanjutkan · Rp 5.000" }),
  ).toBeEnabled();
  await page.getByRole("form", { name: "Form donasi" }).evaluate((element) => {
    const form = element as HTMLFormElement;
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Checkout uji",
  );
  expect(requests).toHaveLength(1);
});

test("quick message chips and live preview update immediately and submit public recognition by default", async ({
  page,
}) => {
  const { requests } = await fixture(page);
  await page.goto("/donasi");
  await page
    .getByRole("button", { name: "+ Bismillah lulus CPNS tahun ini!" })
    .click();
  await expect(page.getByLabel("Pesan untuk komunitas")).toHaveValue(
    "Bismillah lulus CPNS tahun ini!",
  );
  const preview = page.getByLabel("Pratinjau kartu dukungan");
  await expect(preview).toContainText("Sinta Wijaya");
  await expect(preview).toContainText("Bismillah lulus CPNS tahun ini!");
  await page.getByRole("button", { name: "Lanjutkan · Rp 5.000" }).click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  expect(requests[0]).toMatchObject({
    is_anonymous: false,
    message: "Bismillah lulus CPNS tahun ini!",
    amount: 5000,
  });
  await expect(page.getByText("private@example.test")).toHaveCount(0);
});

test("period switching and temporary data failure do not block the donation form", async ({
  page,
}) => {
  const state = await fixture(page, { failure: true });
  await page.goto("/donasi");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "sementara",
  );
  await expect(page.getByRole("form", { name: "Form donasi" })).toBeVisible();
  state.clearFailure();
  await page.getByRole("button", { name: "Coba lagi", exact: true }).click();
  await expect(page.getByRole("progressbar")).toBeVisible();
  await page.getByRole("button", { name: "Semua waktu", exact: true }).click();
  await expect(page.locator(".donation-total")).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("anonymous contributions are included, messages remain text, and dark mobile layout fits", async ({
  page,
}) => {
  const { errors } = await fixture(page, { anonymousOnly: true });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/donasi");
  await expect(
    page.getByText("Belum ada nama publik", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('<img src=x onerror="window.fakeAttack=true">', {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      Boolean((window as unknown as { fakeAttack?: boolean }).fakeAttack),
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});

test("a donor can hide their name from their own account history", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/account");
  await page
    .getByRole("button", { name: "Sembunyikan nama", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tampilkan nama singkat", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Berhasil", { exact: true })).toBeVisible();
});

test("donation desktop and mobile previews use real layout states without horizontal overflow", async ({
  page,
}) => {
  const { errors } = await fixture(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/donasi");
  await expect(page.getByText("Rp 15.000", { exact: true })).toBeVisible();
  await page.screenshot({
    path: path.resolve("../.server-notes/ui-qa/donations-desktop.png"),
    fullPage: true,
  });
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: path.resolve("../.server-notes/ui-qa/donations-mobile.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
