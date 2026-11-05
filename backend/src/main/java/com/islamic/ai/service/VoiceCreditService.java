package com.islamic.ai.service;

import com.islamic.ai.model.VoiceCreditAccount;
import com.islamic.ai.model.VoiceCreditTransaction;
import com.islamic.ai.model.VoicePackPurchase;
import com.islamic.ai.repository.VoiceCreditAccountRepository;
import com.islamic.ai.repository.VoiceCreditTransactionRepository;
import com.islamic.ai.repository.VoicePackPurchaseRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Concurrency-safe voice credit accounting.
 *
 * All balance mutations go through this service, which:
 * 1. Acquires a pessimistic write lock on the user's credit account.
 * 2. Checks idempotency keys to prevent double processing.
 * 3. Writes an immutable ledger entry for every change.
 * 4. Enforces non-negative balances.
 */
@Service
@RequiredArgsConstructor
public class VoiceCreditService {

    private static final Logger log = LoggerFactory.getLogger(VoiceCreditService.class);
    private static final int CREDITS_PER_PACK = 10_000;

    private final VoiceCreditAccountRepository accountRepo;
    private final VoiceCreditTransactionRepository txnRepo;
    private final VoicePackPurchaseRepository purchaseRepo;

    // ── Read Operations ──────────────────────────────────────────────

    /** Get or create a voice credit account for a user. */
    @Transactional
    public VoiceCreditAccount getOrCreateAccount(UUID userId) {
        return accountRepo.findByUserId(userId)
                .orElseGet(() -> {
                    VoiceCreditAccount account = VoiceCreditAccount.builder()
                            .userId(userId)
                            .balance(0)
                            .build();
                    return accountRepo.save(account);
                });
    }

    /** Get current balance (read-only, no lock). */
    public int getBalance(UUID userId) {
        return accountRepo.findByUserId(userId)
                .map(VoiceCreditAccount::getBalance)
                .orElse(0);
    }

    /** Check if a payment has already been processed. */
    public boolean isPaymentProcessed(String paymentId) {
        return purchaseRepo.existsByPaymentId(paymentId);
    }

    // ── Purchase (Credit Grant) ──────────────────────────────────────

    /**
     * Grant credits for a verified voice-pack payment.
     * Enforces exactly-once via unique payment_id constraint.
     *
     * @return the new balance, or -1 if the payment was already processed
     */
    @Transactional
    public int grantPurchaseCredits(UUID userId, String paymentId, String productId,
                                     int amountPaid, String currency, String webhookId,
                                     String metadata) {
        // 1. Check if already processed (payment_id is UNIQUE in DB)
        if (purchaseRepo.existsByPaymentId(paymentId)) {
            log.warn("⚠️ Voice pack payment already processed: paymentId={}", paymentId);
            return -1;
        }

        String idempotencyKey = "purchase:" + paymentId;
        if (txnRepo.existsByIdempotencyKey(idempotencyKey)) {
            log.warn("⚠️ Voice credit transaction already exists: key={}", idempotencyKey);
            return -1;
        }

        // 2. Lock account and update balance
        VoiceCreditAccount account = accountRepo.findByUserIdForUpdate(userId)
                .orElseGet(() -> {
                    VoiceCreditAccount newAcct = VoiceCreditAccount.builder()
                            .userId(userId)
                            .balance(0)
                            .build();
                    return accountRepo.save(newAcct);
                });

        int newBalance = account.getBalance() + CREDITS_PER_PACK;
        account.setBalance(newBalance);
        account.setTotalPurchased(account.getTotalPurchased() + CREDITS_PER_PACK);
        accountRepo.save(account);

        // 3. Record purchase
        VoicePackPurchase purchase = VoicePackPurchase.builder()
                .userId(userId)
                .paymentId(paymentId)
                .productId(productId)
                .amountPaid(amountPaid)
                .currency(currency)
                .creditsGranted(CREDITS_PER_PACK)
                .status("COMPLETED")
                .webhookId(webhookId)
                .metadata(metadata)
                .build();
        purchaseRepo.save(purchase);

        // 4. Write ledger entry
        VoiceCreditTransaction txn = VoiceCreditTransaction.builder()
                .userId(userId)
                .type("PURCHASE")
                .amount(CREDITS_PER_PACK)
                .balanceAfter(newBalance)
                .idempotencyKey(idempotencyKey)
                .referenceType("PAYMENT")
                .referenceId(paymentId)
                .description("Voice pack purchase: " + CREDITS_PER_PACK + " credits for ₹" + (amountPaid / 100))
                .build();
        txnRepo.save(txn);

        log.info("✅ Voice credits granted: userId={} credits={} newBalance={} paymentId={}",
                userId, CREDITS_PER_PACK, newBalance, paymentId);

        return newBalance;
    }

    // ── Reservation (for generation jobs) ────────────────────────────

    /**
     * Reserve credits for a generation job.
     * Returns the reserved amount, or -1 if insufficient balance.
     */
    @Transactional
    public int reserveCredits(UUID userId, int amount, String generationId) {
        if (amount <= 0) return 0;

        String idempotencyKey = "reserve:" + generationId;
        if (txnRepo.existsByIdempotencyKey(idempotencyKey)) {
            log.info("ℹ️ Credits already reserved for generation: {}", generationId);
            // Return the existing reservation amount
            return txnRepo.findByIdempotencyKey(idempotencyKey)
                    .map(t -> Math.abs(t.getAmount()))
                    .orElse(amount);
        }

        VoiceCreditAccount account = accountRepo.findByUserIdForUpdate(userId)
                .orElse(null);

        if (account == null || account.getBalance() < amount) {
            log.warn("⚠️ Insufficient voice credits: userId={} requested={} available={}",
                    userId, amount, account != null ? account.getBalance() : 0);
            return -1;
        }

        int newBalance = account.getBalance() - amount;
        account.setBalance(newBalance);
        accountRepo.save(account);

        VoiceCreditTransaction txn = VoiceCreditTransaction.builder()
                .userId(userId)
                .type("RESERVATION")
                .amount(-amount)
                .balanceAfter(newBalance)
                .idempotencyKey(idempotencyKey)
                .referenceType("GENERATION")
                .referenceId(generationId)
                .description("Reserved " + amount + " credits for voice generation")
                .build();
        txnRepo.save(txn);

        log.info("🔒 Credits reserved: userId={} amount={} newBalance={} genId={}",
                userId, amount, newBalance, generationId);

        return amount;
    }

    /**
     * Settle a generation: deduct actual usage and release excess reservation.
     */
    @Transactional
    public void settleGeneration(UUID userId, int reservedAmount, int actualUsage, String generationId) {
        String settleKey = "settle:" + generationId;
        if (txnRepo.existsByIdempotencyKey(settleKey)) {
            log.info("ℹ️ Generation already settled: {}", generationId);
            return;
        }

        VoiceCreditAccount account = accountRepo.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new RuntimeException("Voice credit account not found for userId: " + userId));

        int excess = reservedAmount - actualUsage;

        if (excess > 0) {
            // Release unused reservation
            int newBalance = account.getBalance() + excess;
            account.setBalance(newBalance);
            account.setTotalUsed(account.getTotalUsed() + actualUsage);
            accountRepo.save(account);

            VoiceCreditTransaction txn = VoiceCreditTransaction.builder()
                    .userId(userId)
                    .type("SETTLEMENT")
                    .amount(excess)
                    .balanceAfter(newBalance)
                    .idempotencyKey(settleKey)
                    .referenceType("GENERATION")
                    .referenceId(generationId)
                    .description("Settled generation: used " + actualUsage + "/" + reservedAmount + " reserved, released " + excess)
                    .build();
            txnRepo.save(txn);

            log.info("✅ Generation settled: userId={} used={} released={} genId={}",
                    userId, actualUsage, excess, generationId);
        } else if (excess == 0) {
            // Exact usage, just update total
            account.setTotalUsed(account.getTotalUsed() + actualUsage);
            accountRepo.save(account);

            VoiceCreditTransaction txn = VoiceCreditTransaction.builder()
                    .userId(userId)
                    .type("SETTLEMENT")
                    .amount(0)
                    .balanceAfter(account.getBalance())
                    .idempotencyKey(settleKey)
                    .referenceType("GENERATION")
                    .referenceId(generationId)
                    .description("Settled generation: used exact reservation of " + actualUsage)
                    .build();
            txnRepo.save(txn);
        }
        // If excess < 0 that would mean we underestimated. In that case we don't charge more
        // than reserved — the estimation should always have a safety margin.
    }

    /**
     * Release all reserved credits for a failed generation.
     */
    @Transactional
    public void releaseReservation(UUID userId, int amount, String generationId) {
        if (amount <= 0) return;

        String releaseKey = "release:" + generationId;
        if (txnRepo.existsByIdempotencyKey(releaseKey)) {
            log.info("ℹ️ Credits already released for generation: {}", generationId);
            return;
        }

        VoiceCreditAccount account = accountRepo.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new RuntimeException("Voice credit account not found for userId: " + userId));

        int newBalance = account.getBalance() + amount;
        account.setBalance(newBalance);
        accountRepo.save(account);

        VoiceCreditTransaction txn = VoiceCreditTransaction.builder()
                .userId(userId)
                .type("RELEASE")
                .amount(amount)
                .balanceAfter(newBalance)
                .idempotencyKey(releaseKey)
                .referenceType("GENERATION")
                .referenceId(generationId)
                .description("Released " + amount + " reserved credits (generation failed/cancelled)")
                .build();
        txnRepo.save(txn);

        log.info("🔓 Credits released: userId={} amount={} newBalance={} genId={}",
                userId, amount, newBalance, generationId);
    }
}
