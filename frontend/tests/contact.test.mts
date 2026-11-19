import { test } from "node:test";
import assert from "node:assert/strict";
const {
  FEEDBACK_CATEGORIES,
  mailtoHref,
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP_DISPLAY,
  SUPPORT_WHATSAPP_NUMBER,
  whatsappHref,
} = await import("../src/lib/contact");

test("contact helpers build clean WhatsApp and mailto links", () => {
  assert.equal(SUPPORT_EMAIL, "hanafiwilly111@gmail.com");
  assert.equal(SUPPORT_WHATSAPP_DISPLAY, "0851-1762-3819");
  assert.equal(SUPPORT_WHATSAPP_NUMBER, "6285117623819");
  assert.equal(whatsappHref(), "https://wa.me/6285117623819");
  assert.equal(
    whatsappHref("Halo Admin, Order ID: ORD-123"),
    "https://wa.me/6285117623819?text=Halo%20Admin%2C%20Order%20ID%3A%20ORD-123",
  );
  assert.equal(mailtoHref(), "mailto:hanafiwilly111@gmail.com");
  assert.equal(
    mailtoHref("Bantuan TOCPNS", "Kendala akun"),
    "mailto:hanafiwilly111@gmail.com?subject=Bantuan%20TOCPNS&body=Kendala%20akun",
  );
  assert.deepEqual(
    FEEDBACK_CATEGORIES.map((c) => c.value),
    ["suggestion", "bug", "correction", "other"],
  );
});
