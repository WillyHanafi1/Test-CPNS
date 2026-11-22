"use client";

import { useResource } from "@/lib/useResource";

export type MembershipOffer = {
  id?: string;
  name?: string;
  price: number;
  normal_price?: number | null;
  is_early_bird?: boolean;
  price_label?: string | null;
  target_packages?: number;
  duration_days: number;
  auto_renew?: boolean;
  environment: string;
  checkout_available: boolean;
  payment_methods?: string[];
  preferred_payment_method?: string | null;
};

const FALLBACK_OFFER = {
  price: 29000,
  normal_price: 49000,
  is_early_bird: true,
  price_label: "Early Bird",
  duration_days: 365,
};

export default function HomeProPrice() {
  const { data } = useResource<MembershipOffer>("/membership/offer");
  const price = data?.price ?? FALLBACK_OFFER.price;
  const normalPrice = data ? data.normal_price : FALLBACK_OFFER.normal_price;
  const isEarlyBird =
    data?.is_early_bird ??
    (typeof normalPrice === "number" && normalPrice > price);
  const priceLabel = data
    ? data.price_label
    : FALLBACK_OFFER.price_label;
  const durationDays = data?.duration_days ?? FALLBACK_OFFER.duration_days;

  return (
    <div className="between" style={{ gap: 12, flexWrap: "wrap" }}>
      <div className="inline" style={{ gap: 8 }}>
        <span className="badge">Paket Pro</span>
        {isEarlyBird && priceLabel && (
          <span className="badge badge-amber">{priceLabel}</span>
        )}
      </div>
      <div className="inline" style={{ gap: 8, alignItems: "baseline" }}>
        {isEarlyBird && typeof normalPrice === "number" && (
          <span
            className="muted"
            style={{ textDecoration: "line-through", fontSize: 13 }}
          >
            Rp{normalPrice.toLocaleString("id-ID")}
          </span>
        )}
        <strong>
          Rp{price.toLocaleString("id-ID")} / {durationDays} hari
        </strong>
      </div>
    </div>
  );
}
