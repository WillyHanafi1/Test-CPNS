import { expect, test, Page } from "@playwright/test";
import path from "node:path";

async function fixture(
  page: Page,
  mode: "payment" | "donation" | "admin" = "payment",
) {
  let checks = 0;
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const target = new URL(request.url()).pathname.split("/api/v1")[1];
    let data: unknown = {};
    if (target === "/auth/me")
      data = {
        id: "synthetic-user",
        email: "preview@example.com",
        role: mode === "admin" ? "admin" : "participant",
        is_pro: checks > 1,
        profile: { full_name: "Peserta Preview" },
      };
    else if (target?.startsWith("/transactions/status/")) {
      checks++;
      data = {
        order_id: "PRO-preview",
        status: mode === "donation" || checks > 1 ? "success" : "pending",
        transaction_type: mode === "donation" ? "donation" : "pro_upgrade",
        amount: 50000,
        is_pro: mode !== "donation" && checks > 1,
        expires_at: "2027-11-17T00:00:00Z",
        payment_url: null,
        payment_expires_at: "2026-11-17T23:00:00Z",
      };
    } else if (target?.endsWith("/infrastructure"))
      data = {
        status: "attention",
        observed_at: new Date().toISOString(),
        scoring: { pending: 1, failed: 1 },
        payment_events: { review: 1 },
        worker_heartbeat_age_seconds: 15,
        oldest_pending_seconds: 200,
        host: {
          disk_free_gib: 5.5,
          backup: { database: { destination: "supabase", age_hours: 2 } },
        },
        issues: [
          {
            code: "scoring_delayed",
            message: "Ada hasil latihan yang tertahan lebih dari tiga menit.",
          },
        ],
      };
    else if (target?.endsWith("/infrastructure/queue"))
      data = {
        items: [
          {
            id: "synthetic-job",
            kind: "scoring",
            status: "failed",
            attempts: 8,
            created_at: "2026-11-17T00:00:00Z",
            last_error: "scoring_failed",
          },
        ],
      };
    else if (target?.includes("/infrastructure/retry/"))
      data = { message: "Pekerjaan dijadwalkan untuk diperiksa ulang." };
    await route.fulfill({
      status: request.method() === "OPTIONS" ? 204 : 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin":
          request.headers()["origin"] || new URL(request.url()).origin,
        "access-control-allow-credentials": "true",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
      },
      body: request.method() === "OPTIONS" ? "" : JSON.stringify(data),
    });
  });
}

test("payment progress updates without losing the page and keeps the mobile layout readable", async ({
  page,
}) => {
  await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/payment/success?order_id=PRO-preview");
  await expect(
    page.getByRole("heading", {
      name: "Pembayaran masih menunggu konfirmasi.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pembayaran berhasil diverifikasi." }),
  ).toBeVisible({ timeout: 12000 });
  await expect(
    page.getByText("Pro aktif sampai", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.resolve("../.server-notes/ui-qa/payment-mobile.png"),
    fullPage: true,
  });
});

test("a donation confirmation is distinct from Pro activation", async ({
  page,
}) => {
  await fixture(page, "donation");
  await page.goto("/payment/success?order_id=PRO-preview");
  await expect(
    page.getByRole("heading", { name: "Terima kasih atas dukunganmu." }),
  ).toBeVisible();
  await expect(
    page.getByText("Dukunganmu sudah tercatat.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Pro aktif sampai", { exact: false }),
  ).toHaveCount(0);
});

test("admin can understand the queue and request a safe retry on desktop and mobile", async ({
  page,
}) => {
  await fixture(page, "admin");
  await page.goto("/admin/operations");
  await expect(
    page.getByRole("heading", { name: "Kesehatan layanan" }),
  ).toBeVisible();
  await expect(page.getByText("Supabase privat")).toBeVisible();
  await page
    .getByRole("button", { name: "Periksa ulang", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Jadwalkan pemeriksaan" }).click();
  await expect(
    page.getByText("Pekerjaan dijadwalkan untuk diperiksa ulang."),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: path.resolve("../.server-notes/ui-qa/operations-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.resolve("../.server-notes/ui-qa/operations-mobile.png"),
    fullPage: true,
  });
});

test("blocked local storage does not break authenticated navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage blocked");
      },
    });
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new Error("Storage blocked");
      },
    });
  });
  await fixture(page, "donation");
  await page.goto("/payment/success?order_id=PRO-preview");
  await expect(
    page.getByRole("heading", { name: "Terima kasih atas dukunganmu." }),
  ).toBeVisible();
});
