import { PaymentMethod } from "@prisma/client";

export const paymentOptions = {
  eWallets: [
    { value: PaymentMethod.GCASH, label: "GCash" },
    { value: PaymentMethod.MAYA, label: "Maya" },
    { value: PaymentMethod.GRABPAY, label: "GrabPay" },
    { value: PaymentMethod.SHOPEEPAY, label: "ShopeePay" },
    { value: PaymentMethod.COINS_PH, label: "Coins.ph" },
  ],
  onlineBanking: [
    { value: PaymentMethod.BPI_ONLINE, label: "BPI Online" },
    { value: PaymentMethod.BDO_ONLINE, label: "BDO Online" },
    { value: PaymentMethod.METROBANK, label: "Metrobank" },
    { value: PaymentMethod.UNIONBANK, label: "UnionBank" },
    { value: PaymentMethod.RCBC, label: "RCBC" },
    { value: PaymentMethod.SECURITY_BANK, label: "Security Bank" },
    { value: PaymentMethod.PNB, label: "PNB" },
    { value: PaymentMethod.LANDBANK, label: "LandBank" },
    { value: PaymentMethod.CHINABANK, label: "Chinabank" },
  ],
} as const;

export type PaymentMethodOption = (typeof paymentOptions.eWallets)[number] | (typeof paymentOptions.onlineBanking)[number];

const paymentMethodValues = new Set<string>(Object.values(PaymentMethod));

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && paymentMethodValues.has(value);
}

export function getPaymentMethodLabel(value: PaymentMethod | null): string | null {
  if (!value) {
    return null;
  }

  return [...paymentOptions.eWallets, ...paymentOptions.onlineBanking].find((option) => option.value === value)?.label ?? null;
}
