// Abstraction PaymentProvider : permet de brancher plus tard un prestataire de
// paiement compatible Cameroun (Mobile Money, carte, agrégateur…).
// Le MVP ne simule AUCUN paiement réel : le provider par défaut déclare
// simplement qu'aucun moyen de paiement n'est encore configuré.

export type PaymentInitInput = {
  paymentId: string;
  reference: string;
  amount: number;
  currency: string;
  candidateId: string;
  userId: string;
};

export type PaymentInitResult = {
  status: "pending" | "unavailable";
  providerName: string;
  message: string;
  checkoutUrl?: string;
};

export interface PaymentProvider {
  readonly name: string;
  isConfigured(): boolean;
  initiate(input: PaymentInitInput): Promise<PaymentInitResult>;
  /** Vérification côté serveur du statut réel auprès du prestataire. */
  verify(reference: string): Promise<{ paid: boolean; method?: string }>;
}

/** Provider par défaut : aucun prestataire branché. */
class UnconfiguredPaymentProvider implements PaymentProvider {
  readonly name = "non-configuré";

  isConfigured() {
    return false;
  }

  async initiate(): Promise<PaymentInitResult> {
    return {
      status: "unavailable",
      providerName: this.name,
      message:
        "Aucun prestataire de paiement n'est encore connecté. Votre demande de vote est enregistrée et sera finalisée dès l'activation du paiement.",
    };
  }

  async verify() {
    return { paid: false };
  }
}

let provider: PaymentProvider = new UnconfiguredPaymentProvider();

/** Point d'extension : appeler au démarrage serveur quand un prestataire est prêt. */
export function setPaymentProvider(next: PaymentProvider) {
  provider = next;
}

export function getPaymentProvider(): PaymentProvider {
  return provider;
}
