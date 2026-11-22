import { expect, test, type Page } from "@playwright/test";

const PKG_ID = "11111111-1111-1111-1111-111111111111";
const Q_ID = "22222222-2222-2222-2222-222222222222";
const TX_PRO_ID = "33333333-3333-3333-3333-333333333333";
const TX_DON_ID = "44444444-4444-4444-4444-444444444444";
const USER_ID = "55555555-5555-5555-5555-555555555555";
const FB_ID = "66666666-6666-6666-6666-666666666666";

async function mockAdminApi(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const target = url.pathname.split("/api/v1")[1] || "";

    let status = 200;
    let data: unknown = {};

    if (target === "/auth/me") {
      data = {
        id: "admin-self-id",
        email: "admin@example.com",
        role: "admin",
        is_pro: false,
        full_name: "Admin Utama",
        profile: { full_name: "Admin Utama" },
      };
    } else if (target === "/admin/analytics/action-summary") {
      data = {
        pending_feedback: 2,
        pending_transactions: 1,
        review_payment_events: 0,
        draft_packages: 1,
        ops_status: "healthy",
        ops_issues_count: 0,
        ops_issues: [],
        recent_transactions: [
          {
            id: TX_PRO_ID,
            order_id: "PRO-20261121-01",
            email: "peserta@example.com",
            transaction_type: "pro_upgrade",
            amount: 50000,
            payment_status: "success",
            created_at: "2026-11-21T03:00:00Z",
          },
          {
            id: TX_DON_ID,
            order_id: "DON-20261121-02",
            email: "donatur@example.com",
            transaction_type: "donation",
            amount: 15000,
            payment_status: "success",
            created_at: "2026-11-21T02:00:00Z",
          },
        ],
      };
    } else if (target === "/admin/analytics/overview") {
      data = {
        total_users: 18,
        participants_count: 17,
        pro_users_count: 5,
        total_packages: 8,
        published_packages: 7,
        total_questions: 880,
        published_questions: 770,
        total_revenue: 265000,
        pro_revenue: 250000,
        donation_revenue: 15000,
        success_transactions: 6,
        active_exams: 2,
        finished_sessions_7d: 24,
      };
    } else if (target === "/admin/analytics/exam-performance") {
      data = {
        avg_total_score: 362.5,
        avg_twk: 82.4,
        avg_tiu: 101.2,
        avg_tkp: 178.9,
        pass_rate: 64.2,
        total_finished_sessions: 70,
        score_distribution: [
          { label: "0-100", value: 2 },
          { label: "101-200", value: 6 },
          { label: "201-300", value: 14 },
          { label: "301-400", value: 32 },
          { label: "401-500", value: 15 },
          { label: "500+", value: 1 },
        ],
      };
    } else if (target === "/admin/analytics/revenue-trends") {
      data = {
        daily_revenue: [
          { label: "2026-11-19", value: 100000 },
          { label: "2026-11-20", value: 50000 },
          { label: "2026-11-21", value: 100000 },
        ],
        top_packages: [],
        category_share: [],
        revenue_by_type: [
          { label: "Paket Pro", value: 250000 },
          { label: "Donasi", value: 15000 },
        ],
        top_attempted_packages: [
          {
            id: PKG_ID,
            title: "Tryout SKD CPNS 2026 #1",
            category: "Mix",
            attempts: 42,
            avg_score: 374.5,
            pass_rate: 69.0,
          },
        ],
      };
    } else if (target === "/admin/analytics/visitors") {
      data = {
        online_now: 7,
        today_visitors: 43,
        today_pageviews: 128,
        yesterday_visitors: 39,
        month_visitors: 615,
        month_pageviews: 1940,
        total_visitors: 1820,
        total_pageviews: 6410,
        daily_trend: [
          { date: "2026-11-20", visitors: 35, pageviews: 110 },
          { date: "2026-11-21", visitors: 39, pageviews: 119 },
          { date: "2026-11-22", visitors: 43, pageviews: 128 },
        ],
        top_pages: [
          { path: "/", pageviews: 680 },
          { path: "/catalog", pageviews: 420 },
          { path: "/catalog/upgrade", pageviews: 190 },
        ],
      };
    } else if (target === "/admin/packages") {
      data = {
        items: [
          {
            id: PKG_ID,
            title: "Tryout SKD CPNS 2026 #1",
            description: "Simulasi SKD standar BKN 110 soal.",
            price: 0,
            is_premium: true,
            category: "Mix",
            is_published: true,
            is_weekly: false,
            is_active: true,
            published_revision_id: "rev-001",
            start_at: null,
            end_at: null,
            question_count: 110,
            twk_count: 30,
            tiu_count: 35,
            tkp_count: 45,
          },
        ],
        total: 1,
        page: 1,
        size: 10,
      };
    } else if (target === "/admin/questions") {
      data = {
        items: [
          {
            id: Q_ID,
            package_id: PKG_ID,
            content: "Berapakah nilai dari $2^3 + 4$?",
            segment: "TIU",
            sub_category: "Numerik Berhitung",
            number: 1,
            image_url: null,
            discussion: "Karena $2^3 = 8$, maka $8 + 4 = 12$.",
            options: [
              { id: "o1", label: "A", content: "10", score: 0 },
              { id: "o2", label: "B", content: "11", score: 0 },
              { id: "o3", label: "C", content: "12", score: 5 },
              { id: "o4", label: "D", content: "14", score: 0 },
              { id: "o5", label: "E", content: "16", score: 0 },
            ],
          },
        ],
        total: 1,
        page: 1,
        size: 15,
      };
    } else if (target === "/admin/transactions/summary") {
      data = {
        total_revenue: 265000,
        pro_revenue: 250000,
        donation_revenue: 15000,
        pro_count: 5,
        donation_count: 1,
        success_count: 6,
        pending_count: 1,
        failed_count: 0,
      };
    } else if (target === "/admin/transactions") {
      data = {
        items: [
          {
            id: TX_PRO_ID,
            user_id: USER_ID,
            package_id: null,
            transaction_type: "pro_upgrade",
            order_id: "PRO-20261121-01",
            payment_status: "success",
            amount: 50000,
            payment_environment: "production",
            paid_at: "2026-11-21T03:00:00Z",
            access_expires_at: "2027-11-21T03:00:00Z",
            created_at: "2026-11-21T02:58:00Z",
            user: { email: "peserta@example.com" },
            package: null,
          },
          {
            id: TX_DON_ID,
            user_id: USER_ID,
            package_id: null,
            transaction_type: "donation",
            order_id: "DON-20261121-02",
            payment_status: "pending",
            amount: 15000,
            payment_environment: "production",
            paid_at: null,
            access_expires_at: null,
            created_at: "2026-11-21T02:00:00Z",
            message: "Semangat terus untuk TOCPNS!",
            is_anonymous: false,
            user: { email: "donatur@example.com" },
            package: null,
          },
        ],
        total: 2,
        page: 1,
        size: 15,
      };
    } else if (target.endsWith("/events")) {
      data = { provider_events: [], audit: [] };
    } else if (target === "/admin/users") {
      data = {
        items: [
          {
            id: USER_ID,
            email: "peserta@example.com",
            role: "participant",
            is_active: true,
            auth_provider: "google",
            created_at: "2026-11-01T01:00:00Z",
            profile: {
              full_name: "Budi Santoso",
              target_instansi: "Kementerian Keuangan",
            },
            is_pro: true,
            pro_expires_at: "2027-11-01T01:00:00Z",
            total_sessions: 4,
            total_transactions: 1,
          },
        ],
        total: 1,
        page: 1,
        size: 15,
      };
    } else if (target === "/admin/feedback") {
      data = {
        items: [
          {
            id: FB_ID,
            user_id: USER_ID,
            category: "correction",
            content: "Mohon cek pembahasan soal TIU nomor 12.",
            status: "pending",
            priority: "high",
            admin_notes: null,
            path_context: "/exam/demo",
            created_at: "2026-11-21T01:00:00Z",
            user: { email: "peserta@example.com" },
          },
        ],
        total: 1,
        page: 1,
        size: 15,
        counts_by_status: { pending: 2, reviewed: 1, in_progress: 0, resolved: 3 },
      };
    } else {
      status = 200;
    }

    await route.fulfill({
      status: request.method() === "OPTIONS" ? 204 : status,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin":
          request.headers()["origin"] || url.origin,
        "access-control-allow-credentials": "true",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      },
      body: request.method() === "OPTIONS" ? "" : JSON.stringify(data),
    });
  });

  return { errors };
}

test("admin command center, grouped navigation badges, and Ctrl+K palette work smoothly", async ({
  page,
}) => {
  const { errors } = await mockAdminApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin");

  await expect(
    page.getByRole("heading", { name: "Ringkasan platform" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Antrean tindak lanjut" }),
  ).toBeVisible();
  await expect(page.getByText("2 pending")).toBeVisible();
  await expect(page.getByText("peserta@example.com")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Trafik pengunjung situs" }),
  ).toBeVisible();
  await expect(page.getByText("615")).toBeVisible();

  // Command palette shortcut
  await page.keyboard.press("Control+k");
  const paletteInput = page.getByLabel("Cari menu atau aksi admin");
  await expect(paletteInput).toBeVisible();
  await paletteInput.fill("Bank soal");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/admin\/questions/);

  expect(errors).toEqual([]);
});

test("packages lifecycle and questions split-pane live preview work seamlessly", async ({
  page,
}) => {
  const { errors } = await mockAdminApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin/packages");

  await expect(
    page.getByRole("heading", { name: "Paket ujian" }),
  ).toBeVisible();
  await expect(page.getByText("110 / 110 soal")).toBeVisible();
  await expect(page.getByText("TWK 30 · TIU 35 · TKP 45")).toBeVisible();

  // Open Create Package modal — must not expose premature Publish switch
  await page.getByRole("button", { name: "Buat paket baru" }).click();
  await expect(
    page.getByText("Paket baru disimpan sebagai"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Batal" }).click();

  // Navigate directly to Bank Soal of the package
  await page.getByTitle("Kelola soal paket").click();
  await expect(page).toHaveURL(new RegExp(`package_id=${PKG_ID}`));
  await expect(page.getByText("Published (Terkunci)")).toBeVisible();
  await expect(page.getByText("Kunci C (5)")).toBeVisible();
  await expect(page.getByText("Numerik Berhitung")).toBeVisible();

  // Open Split-Pane Editor Drawer & confirm Live Preview updates
  await page.getByRole("button", { name: "Ubah soal 1" }).click();
  const preview = page.getByLabel("Preview tampilan peserta");
  await expect(preview).toBeVisible();
  await page.getByLabel("Sub-materi", { exact: true }).fill("Aljabar Dasar");
  await expect(preview).toContainText("Aljabar Dasar");

  expect(errors).toEqual([]);
});

test("transactions, users, feedback, and analytics render accurately on desktop and mobile dark mode", async ({
  page,
}) => {
  const { errors } = await mockAdminApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  // Transactions: both Pro and Donation visible, no stale Snap Token
  await page.goto("/admin/transactions");
  await expect(page.getByText("PRO-20261121-01")).toBeVisible();
  await expect(page.getByText("DON-20261121-02")).toBeVisible();
  await expect(page.getByText("Semangat terus untuk TOCPNS!")).toBeVisible();
  await page.getByRole("button", { name: /Detail & Audit/i }).nth(1).click();
  await expect(page.getByText("Snap Token")).toHaveCount(0);
  await expect(page.getByText("Alasan perubahan (wajib untuk log audit)")).toBeVisible();
  await page.getByRole("button", { name: "Tutup panel" }).click();

  // Users: Detail drawer with Pro duration presets
  await page.goto("/admin/users");
  await expect(page.getByText("Budi Santoso")).toBeVisible();
  await page.getByRole("button", { name: "Kelola" }).click();
  await expect(page.getByText("Keanggotaan Paket Pro")).toBeVisible();
  await expect(page.getByRole("button", { name: "+365 hari" })).toBeVisible();
  await page.getByRole("button", { name: "Tutup panel" }).click();

  // Feedback: Status counters + Triage drawer
  await page.goto("/admin/feedback");
  await expect(page.getByRole("tab", { name: "Pending (2)" })).toBeVisible();
  await page.getByRole("button", { name: "Tinjau" }).click();
  await expect(page.getByRole("button", { name: "Tandai selesai" })).toBeVisible();
  await page.getByRole("button", { name: "Tutup panel" }).click();

  // Analytics: Subtest averages vs Passing Grade + Most Attempted Packages
  await page.goto("/admin/analytics");
  await expect(
    page.getByText("Rata-rata skor per subtes vs Passing Grade"),
  ).toBeVisible();
  await expect(
    page.getByText("Paket paling banyak dikerjakan"),
  ).toBeVisible();
  await expect(page.getByText("Tryout SKD CPNS 2026 #1")).toBeVisible();

  // Mobile + Dark mode overflow check
  await page.emulateMedia({ colorScheme: "dark" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Ringkasan platform" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);

  expect(errors).toEqual([]);
});
