import { expect, test } from "@playwright/test";
import path from "node:path";
import { DONATION_DESIGNS } from "../src/lib/donation-designs";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ status: 401, json: { detail: "Not authenticated" } }),
  );
});

test("ten genuinely different boards keep the server theme, statistics and chat in place", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/donasi/desain");
  const initial = await page.locator(".dc-chat").boundingBox();
  const structures = new Set<string>();
  const accent = await page
    .locator(".donation-community")
    .evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--accent"),
    );
  for (const design of DONATION_DESIGNS) {
    await page
      .getByRole("navigation", { name: "10 format leaderboard" })
      .getByRole("button", { name: new RegExp(design.name) })
      .click();
    await expect(page.locator(".donation-leaderboard-formats")).toHaveAttribute(
      "data-format",
      design.id,
    );
    await expect(page.locator(".donation-total")).toHaveText("Rp 2.946.000");
    expect(
      await page
        .locator(".donation-community")
        .evaluate((element) =>
          getComputedStyle(element).getPropertyValue("--accent"),
        ),
    ).toBe(accent);
    const chat = await page.locator(".dc-chat").boundingBox();
    expect(chat?.x).toBe(initial?.x);
    // Absolute Y follows the small concept description, but the widgets always align at their top edge.
    const board = await page.locator(".dc-board").boundingBox();
    expect(chat?.y).toBe(board?.y);
    structures.add(
      await page
        .locator(".donation-leaderboard-formats")
        .evaluate((element) =>
          [...element.querySelectorAll("*")]
            .map((node) => node.tagName)
            .join(","),
        ),
    );
    await expect(page.locator(".dc-chat-message")).toHaveCount(20);
  }
  expect(structures.size).toBe(10);
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const design of DONATION_DESIGNS) {
      await page
        .locator(".ls-formats button")
        .filter({ hasText: design.name })
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${design.id} ${width}px`,
      ).toBe(true);
      await page
        .getByRole("button", { name: "Bagian beranda", exact: true })
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${design.id} home ${width}px`,
      ).toBe(true);
      await page
        .getByRole("button", { name: "Halaman donasi", exact: true })
        .click();
    }
  }
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  for (const design of DONATION_DESIGNS) {
    await page
      .locator(".ls-formats button")
      .filter({ hasText: design.name })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${design.id} dark`,
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("chat is chronological, pins the top donor and follows new messages", async ({
  page,
}) => {
  await page.goto("/donasi/desain?scenario=november");
  const chat = page.getByRole("log", { name: "Riwayat pesan dukungan" });
  await expect
    .poll(() =>
      chat.evaluate(
        (element) =>
          element.scrollHeight - element.scrollTop - element.clientHeight,
      ),
    )
    .toBeLessThan(3);
  await expect(chat.locator(".dc-chat-message").first()).toContainText(
    "Bima Saputra",
  );
  await expect(chat.locator(".dc-chat-message").last()).toContainText(
    "Alya Putri",
  );
  await expect(
    page.getByLabel("Pesan pendukung teratas", { exact: true }),
  ).toContainText("Fajar Maulana");
  await page.getByRole("button", { name: "Buka pesan", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ringkas pesan" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Sembunyikan pesan pin" }).click();
  await expect(
    page.getByRole("button", { name: "Tampilkan pesan pendukung teratas" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tampilkan pesan pendukung teratas" })
    .click();
  await page.getByLabel("Pin pesan teratas", { exact: true }).uncheck();
  await expect(page.locator(".dc-pin")).toHaveCount(0);
  await page.getByRole("button", { name: "Simulasi pesan masuk" }).click();
  await expect(chat.locator(".dc-chat-message").last()).toContainText(
    "Pesan contoh baru 1",
  );
  expect(
    await chat.evaluate(
      (element) =>
        element.scrollHeight - element.scrollTop - element.clientHeight < 3,
    ),
  ).toBe(true);
  // Reading history must not be interrupted by an incoming donation.
  await chat.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(
    page.getByRole("button", { name: "Ke pesan terbaru" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Simulasi pesan masuk" }).click();
  expect(await chat.evaluate((element) => element.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "Ke pesan terbaru" }).click();
  expect(
    await chat.evaluate(
      (element) =>
        element.scrollHeight - element.scrollTop - element.clientHeight < 3,
    ),
  ).toBe(true);
  await expect(page.locator(".donation-total")).toHaveText("Rp 231.000");
});

test("periods, empty month and anonymous-only leaderboard work without stale pinned messages", async ({
  page,
}) => {
  await page.goto("/donasi/desain");
  await expect(page.locator(".dc-chat-message")).toHaveCount(20);
  await expect(page.locator(".dc-chat-message").first()).toContainText(
    "Wahyu Nugroho",
  );
  await page
    .getByLabel("Skenario data", { exact: true })
    .selectOption("october");
  await expect(page.locator(".donation-total")).toHaveText("Rp 190.000");
  await expect(page.locator(".dc-pin")).toContainText("Arif Hidayat");
  await page
    .getByLabel("Skenario data", { exact: true })
    .selectOption("new-month");
  await expect(page.locator(".donation-total")).toHaveText("Rp 0");
  await expect(page.locator(".dc-pin")).toHaveCount(0);
  await expect(page.getByText("Belum ada pesan di periode ini.")).toBeVisible();
  await page
    .getByLabel("Skenario data", { exact: true })
    .selectOption("exceeded");
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "value",
    "150000",
  );
  await expect(page.locator(".dc-goal-label")).toContainText("141%");
  await page
    .getByLabel("Skenario data", { exact: true })
    .selectOption("anonymous");
  await expect(page.locator(".donation-total")).toHaveText("Rp 35.000");
  await expect(page.locator(".lb-entry")).toHaveCount(3);
  await expect(page.locator(".lb-entry[data-anonymous=true]")).toHaveCount(3);
  await expect(page.locator(".dc-pin")).toContainText("Anonim");
  await expect(page.locator(".dc-chat-message")).toHaveCount(3);
  await page.reload();
  await expect(page.getByLabel("Skenario data", { exact: true })).toHaveValue(
    "anonymous",
  );
});

test("streamer board shows every ranked donor's full message, including ranks after five and anonymous", async ({
  page,
}) => {
  await page.goto("/donasi/desain?format=overlay&scenario=all");
  const board = page.getByRole("region", {
    name: "Papan dukungan",
    exact: true,
  });
  await expect(board.locator(".lb-stream-overlay > li")).toHaveCount(10);
  await expect(board.locator(".lb-stream-message")).toHaveCount(10);
  await expect(
    board
      .locator(".lb-stream-overlay > li")
      .nth(6)
      .locator(".lb-stream-message"),
  ).not.toBeEmpty();
  await expect(
    board.locator(".lb-stream-overlay > li[data-anonymous=true]"),
  ).toContainText("Anonim");
  await expect(
    board.locator(".lb-stream-message").filter({
      hasText:
        "Terima kasih sudah menemani proses belajar yang tidak selalu mudah.",
    }),
  ).toContainText("Terus semangat!");
  await page
    .getByLabel("Skenario data", { exact: true })
    .selectOption("november");
  await expect(board.locator(".lb-stream-overlay > li")).toHaveCount(6);
  await expect(board.locator(".lb-stream-no-message")).toHaveText(
    "Mengirim dukungan tanpa pesan.",
  );
  await page
    .getByLabel("Skenario data", { exact: true })
    .selectOption("anonymous");
  await expect(
    board.locator(".lb-stream-overlay > li[data-anonymous=true]"),
  ).toHaveCount(3);
  await expect(board.locator(".lb-stream-message")).toHaveCount(3);
});

test("studio comparisons do not replace the approved application design and demo never creates checkout", async ({
  page,
}) => {
  const checkout: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().includes("/transactions/donate")
    )
      checkout.push(request.url());
  });
  await page.addInitScript(() =>
    window.localStorage.setItem("tocpns-donation-leaderboard-layout", "podium"),
  );
  await page.goto("/donasi/desain?format=podium&scenario=november");
  await expect(page.locator(".donation-leaderboard-formats")).toHaveAttribute(
    "data-format",
    "podium",
  );
  await page
    .getByText("Coba formulir donasi tanpa pembayaran", { exact: true })
    .click();
  await page.getByLabel("Nominal lain (rupiah)").fill("Rp 7.500");
  await page.getByLabel("Tampilkan nama singkat saya").uncheck();
  await page.getByRole("button", { name: "Coba dukungan · Rp 7.500" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Simulasi berhasil" }),
  ).toContainText("Pendukung anonim");
  expect(checkout).toEqual([]);
  await page.route("**/api/v1/transactions/donations/overview**", (route) =>
    route.fulfill({
      json: {
        period: "month",
        period_label: "November 2026",
        stats: {
          total_amount: 0,
          target_amount: 250000,
          percentage: 0,
          supporter_count: 0,
          donation_count: 0,
        },
        top_supporters: [],
        recent_supporters: [],
        updated_at: "2026-11-18T12:00:00+07:00",
      },
    }),
  );
  await page.goto("/donasi");
  await expect(page.locator(".donation-leaderboard-formats")).toHaveAttribute(
    "data-format",
    "overlay",
  );
  await page.goto("/");
  await expect(page.locator(".donation-leaderboard-formats")).toHaveAttribute(
    "data-format",
    "overlay",
  );
});

test("capture a clean comparison using the unchanged site theme", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1250 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/donasi/desain?scenario=november");
  await expect(page.locator(".dc-chat-message")).toHaveCount(8);
  await page.locator(".donation-community").screenshot({
    path: path.resolve("../.server-notes/ui-qa/donation-community-preview.png"),
  });
  await page.screenshot({
    path: path.resolve(
      "../.server-notes/ui-qa/donation-leaderboard-studio.png",
    ),
    fullPage: true,
  });
  for (const design of DONATION_DESIGNS) {
    await page
      .locator(".ls-formats button")
      .filter({ hasText: design.name })
      .click();
    await page.locator(".dc-board").screenshot({
      path: path.resolve(`../.server-notes/ui-qa/leaderboard-${design.id}.png`),
    });
  }
});
