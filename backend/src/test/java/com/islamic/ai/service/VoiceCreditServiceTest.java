package com.islamic.ai.service;

import com.islamic.ai.model.VoiceCreditAccount;
import com.islamic.ai.model.VoiceCreditTransaction;
import com.islamic.ai.model.VoicePackPurchase;
import com.islamic.ai.repository.VoiceCreditAccountRepository;
import com.islamic.ai.repository.VoiceCreditTransactionRepository;
import com.islamic.ai.repository.VoicePackPurchaseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Concurrency-safe unit tests for VoiceCreditService.
 *
 * Uses pure JDK dynamic proxies for repository interfaces.
 * Zero byte-buddy dynamic agent attachment required (100% sandbox/CI safe).
 *
 * Covers:
 * 1. Successful purchase grants exactly 10,000 credits
 * 2. Duplicate payment rejection (idempotent, unique payment_id)
 * 3. Duplicate idempotency key rejection
 * 4. Account creation on first purchase
 * 5. Payment processed check
 * 6. Credit reservation success and balance deduction
 * 7. Insufficient balance returns -1
 * 8. Reservation with no account returns -1
 * 9. Duplicate reservation returns existing amount (idempotent)
 * 10. Zero credit reservation is no-op
 * 11. Settle with excess releases credits and updates totalUsed
 * 12. Settle exact usage records without balance change
 * 13. Settle duplicate is idempotent
 * 14. Release reservation restores balance on failure
 * 15. Release duplicate is idempotent
 * 16. Release zero is no-op
 * 17. Balance read when account does and does not exist
 * 18. Ledger transactions record correct type, amounts, and audit keys
 */
class VoiceCreditServiceTest {

    private VoiceCreditService service;

    // In-memory test state
    private final Map<UUID, VoiceCreditAccount> accountStore = new HashMap<>();
    private final Map<String, VoiceCreditTransaction> txnStore = new HashMap<>();
    private final Map<String, VoicePackPurchase> purchaseStore = new HashMap<>();

    private static final UUID USER_ID = UUID.randomUUID();
    private static final String PAYMENT_ID = "pay_test_abc123";
    private static final String PRODUCT_ID = "prod_voice_pack";

    @BeforeEach
    void setUp() {
        accountStore.clear();
        txnStore.clear();
        purchaseStore.clear();

        // Seed initial account: 5000 balance, 10000 purchased, 5000 used
        VoiceCreditAccount testAccount = VoiceCreditAccount.builder()
                .id(UUID.randomUUID())
                .userId(USER_ID)
                .balance(5000)
                .totalPurchased(10000)
                .totalUsed(5000)
                .build();
        accountStore.put(USER_ID, testAccount);

        // Build dynamic proxies for the 3 repositories
        VoiceCreditAccountRepository accountRepo = createAccountRepoProxy();
        VoiceCreditTransactionRepository txnRepo = createTxnRepoProxy();
        VoicePackPurchaseRepository purchaseRepo = createPurchaseRepoProxy();

        service = new VoiceCreditService(accountRepo, txnRepo, purchaseRepo);
    }

    // ── Purchase Tests ──────────────────────────────────────────────

    @Test
    @DisplayName("grantPurchaseCredits: grants 10000 credits on first payment")
    void grantCreditsFirstPayment() {
        int newBalance = service.grantPurchaseCredits(USER_ID, PAYMENT_ID, PRODUCT_ID,
                80000, "INR", "whk_1", "{}");

        assertEquals(15000, newBalance); // 5000 existing + 10000
        assertEquals(15000, accountStore.get(USER_ID).getBalance());
        assertEquals(20000, accountStore.get(USER_ID).getTotalPurchased());

        // Verify purchase stored
        assertTrue(purchaseStore.containsKey(PAYMENT_ID));
        VoicePackPurchase p = purchaseStore.get(PAYMENT_ID);
        assertEquals(10000, p.getCreditsGranted());
        assertEquals("COMPLETED", p.getStatus());

        // Verify ledger transaction stored
        String txnKey = "purchase:" + PAYMENT_ID;
        assertTrue(txnStore.containsKey(txnKey));
        VoiceCreditTransaction txn = txnStore.get(txnKey);
        assertEquals("PURCHASE", txn.getType());
        assertEquals(10000, txn.getAmount());
        assertEquals(15000, txn.getBalanceAfter());
        assertEquals("PAYMENT", txn.getReferenceType());
        assertEquals(PAYMENT_ID, txn.getReferenceId());
    }

    @Test
    @DisplayName("grantPurchaseCredits: returns -1 for duplicate payment (idempotent)")
    void duplicatePaymentIsRejected() {
        // Pre-populate purchase
        purchaseStore.put(PAYMENT_ID, VoicePackPurchase.builder()
                .paymentId(PAYMENT_ID).userId(USER_ID).build());

        int result = service.grantPurchaseCredits(USER_ID, PAYMENT_ID, PRODUCT_ID,
                80000, "INR", "whk_2", "{}");

        assertEquals(-1, result);
        assertEquals(5000, accountStore.get(USER_ID).getBalance()); // Unchanged
    }

    @Test
    @DisplayName("grantPurchaseCredits: returns -1 for duplicate idempotency key")
    void duplicateIdempotencyKeyIsRejected() {
        String key = "purchase:" + PAYMENT_ID;
        txnStore.put(key, VoiceCreditTransaction.builder().idempotencyKey(key).build());

        int result = service.grantPurchaseCredits(USER_ID, PAYMENT_ID, PRODUCT_ID,
                80000, "INR", "whk_3", "{}");

        assertEquals(-1, result);
        assertEquals(5000, accountStore.get(USER_ID).getBalance());
    }

    @Test
    @DisplayName("grantPurchaseCredits: creates account if none exists")
    void createsAccountOnFirstPurchase() {
        UUID newUserId = UUID.randomUUID();

        int result = service.grantPurchaseCredits(newUserId, PAYMENT_ID, PRODUCT_ID,
                80000, "INR", "whk_4", "{}");

        assertEquals(10000, result);
        assertNotNull(accountStore.get(newUserId));
        assertEquals(10000, accountStore.get(newUserId).getBalance());
        assertEquals(10000, accountStore.get(newUserId).getTotalPurchased());
    }

    @Test
    @DisplayName("isPaymentProcessed: returns correct status")
    void paymentProcessedCheck() {
        purchaseStore.put("existing", VoicePackPurchase.builder().paymentId("existing").build());

        assertTrue(service.isPaymentProcessed("existing"));
        assertFalse(service.isPaymentProcessed("new"));
    }

    // ── Reservation Tests ───────────────────────────────────────────

    @Test
    @DisplayName("reserveCredits: reserves credits and decrements balance")
    void reserveCreditsSuccess() {
        String genId = UUID.randomUUID().toString();

        int reserved = service.reserveCredits(USER_ID, 2000, genId);

        assertEquals(2000, reserved);
        assertEquals(3000, accountStore.get(USER_ID).getBalance()); // 5000 - 2000

        String reserveKey = "reserve:" + genId;
        assertTrue(txnStore.containsKey(reserveKey));
        VoiceCreditTransaction txn = txnStore.get(reserveKey);
        assertEquals("RESERVATION", txn.getType());
        assertEquals(-2000, txn.getAmount());
        assertEquals(3000, txn.getBalanceAfter());
    }

    @Test
    @DisplayName("reserveCredits: returns -1 when insufficient balance")
    void reserveCreditsInsufficient() {
        String genId = UUID.randomUUID().toString();
        accountStore.get(USER_ID).setBalance(100);

        int reserved = service.reserveCredits(USER_ID, 2000, genId);

        assertEquals(-1, reserved);
        assertEquals(100, accountStore.get(USER_ID).getBalance()); // Unchanged
        assertFalse(txnStore.containsKey("reserve:" + genId));
    }

    @Test
    @DisplayName("reserveCredits: returns -1 when no account exists")
    void reserveCreditsNoAccount() {
        UUID unknown = UUID.randomUUID();
        int reserved = service.reserveCredits(unknown, 2000, "gen_no_acct");
        assertEquals(-1, reserved);
    }

    @Test
    @DisplayName("reserveCredits: duplicate reservation returns existing amount (idempotent)")
    void reserveCreditsIdempotent() {
        String genId = UUID.randomUUID().toString();
        String key = "reserve:" + genId;
        txnStore.put(key, VoiceCreditTransaction.builder()
                .idempotencyKey(key)
                .amount(-2000)
                .build());

        int reserved = service.reserveCredits(USER_ID, 2000, genId);

        assertEquals(2000, reserved);
        assertEquals(5000, accountStore.get(USER_ID).getBalance()); // Not deducted again
    }

    @Test
    @DisplayName("reserveCredits: zero amount returns 0 without touching DB")
    void reserveZeroCredits() {
        int reserved = service.reserveCredits(USER_ID, 0, "gen_zero");
        assertEquals(0, reserved);
        assertEquals(5000, accountStore.get(USER_ID).getBalance());
    }

    // ── Settlement Tests ────────────────────────────────────────────

    @Test
    @DisplayName("settleGeneration: releases excess credits when actual < reserved")
    void settleWithExcess() {
        String genId = UUID.randomUUID().toString();

        service.settleGeneration(USER_ID, 2000, 1500, genId);

        // 500 excess released: 5000 + 500 = 5500
        assertEquals(5500, accountStore.get(USER_ID).getBalance());
        // 5000 existing used + 1500 actual = 6500
        assertEquals(6500, accountStore.get(USER_ID).getTotalUsed());

        String settleKey = "settle:" + genId;
        assertTrue(txnStore.containsKey(settleKey));
        VoiceCreditTransaction txn = txnStore.get(settleKey);
        assertEquals("SETTLEMENT", txn.getType());
        assertEquals(500, txn.getAmount());
        assertEquals(5500, txn.getBalanceAfter());
    }

    @Test
    @DisplayName("settleGeneration: exact usage records settlement without balance change")
    void settleExactUsage() {
        String genId = UUID.randomUUID().toString();

        service.settleGeneration(USER_ID, 2000, 2000, genId);

        assertEquals(5000, accountStore.get(USER_ID).getBalance()); // Unchanged
        assertEquals(7000, accountStore.get(USER_ID).getTotalUsed()); // 5000 + 2000

        String settleKey = "settle:" + genId;
        assertTrue(txnStore.containsKey(settleKey));
        assertEquals(0, txnStore.get(settleKey).getAmount());
    }

    @Test
    @DisplayName("settleGeneration: idempotent on duplicate settle key")
    void settleIdempotent() {
        String genId = UUID.randomUUID().toString();
        String settleKey = "settle:" + genId;
        txnStore.put(settleKey, VoiceCreditTransaction.builder().idempotencyKey(settleKey).build());

        service.settleGeneration(USER_ID, 2000, 1500, genId);

        assertEquals(5000, accountStore.get(USER_ID).getBalance()); // Unchanged
    }

    // ── Release Tests ───────────────────────────────────────────────

    @Test
    @DisplayName("releaseReservation: returns all reserved credits on failure")
    void releaseReservationOnFailure() {
        String genId = UUID.randomUUID().toString();

        service.releaseReservation(USER_ID, 3000, genId);

        assertEquals(8000, accountStore.get(USER_ID).getBalance()); // 5000 + 3000

        String releaseKey = "release:" + genId;
        assertTrue(txnStore.containsKey(releaseKey));
        VoiceCreditTransaction txn = txnStore.get(releaseKey);
        assertEquals("RELEASE", txn.getType());
        assertEquals(3000, txn.getAmount());
        assertEquals(8000, txn.getBalanceAfter());
    }

    @Test
    @DisplayName("releaseReservation: idempotent on duplicate release key")
    void releaseIdempotent() {
        String genId = UUID.randomUUID().toString();
        String releaseKey = "release:" + genId;
        txnStore.put(releaseKey, VoiceCreditTransaction.builder().idempotencyKey(releaseKey).build());

        service.releaseReservation(USER_ID, 3000, genId);

        assertEquals(5000, accountStore.get(USER_ID).getBalance()); // Not credited again
    }

    @Test
    @DisplayName("releaseReservation: zero amount is a no-op")
    void releaseZero() {
        service.releaseReservation(USER_ID, 0, "gen_zero");
        assertEquals(5000, accountStore.get(USER_ID).getBalance());
    }

    // ── Balance Read Tests ──────────────────────────────────────────

    @Test
    @DisplayName("getBalance: returns 0 when no account exists")
    void getBalanceNoAccount() {
        UUID unknown = UUID.randomUUID();
        assertEquals(0, service.getBalance(unknown));
    }

    @Test
    @DisplayName("getBalance: returns correct balance")
    void getBalanceExistingAccount() {
        assertEquals(5000, service.getBalance(USER_ID));
    }

    // ── Repository Proxy Factories (Pure JDK) ───────────────────────

    @SuppressWarnings("unchecked")
    private VoiceCreditAccountRepository createAccountRepoProxy() {
        return (VoiceCreditAccountRepository) Proxy.newProxyInstance(
                VoiceCreditAccountRepository.class.getClassLoader(),
                new Class<?>[]{VoiceCreditAccountRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("findByUserId".equals(name) || "findByUserIdForUpdate".equals(name)) {
                        UUID uid = (UUID) args[0];
                        return Optional.ofNullable(accountStore.get(uid));
                    }
                    if ("save".equals(name)) {
                        VoiceCreditAccount acct = (VoiceCreditAccount) args[0];
                        if (acct.getId() == null) acct.setId(UUID.randomUUID());
                        accountStore.put(acct.getUserId(), acct);
                        return acct;
                    }
                    if ("toString".equals(name)) return "AccountRepoProxy";
                    return null;
                }
        );
    }

    @SuppressWarnings("unchecked")
    private VoiceCreditTransactionRepository createTxnRepoProxy() {
        return (VoiceCreditTransactionRepository) Proxy.newProxyInstance(
                VoiceCreditTransactionRepository.class.getClassLoader(),
                new Class<?>[]{VoiceCreditTransactionRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("existsByIdempotencyKey".equals(name)) {
                        return txnStore.containsKey((String) args[0]);
                    }
                    if ("findByIdempotencyKey".equals(name)) {
                        return Optional.ofNullable(txnStore.get((String) args[0]));
                    }
                    if ("save".equals(name)) {
                        VoiceCreditTransaction txn = (VoiceCreditTransaction) args[0];
                        if (txn.getId() == null) txn.setId(UUID.randomUUID());
                        txnStore.put(txn.getIdempotencyKey(), txn);
                        return txn;
                    }
                    if ("toString".equals(name)) return "TxnRepoProxy";
                    return null;
                }
        );
    }

    @SuppressWarnings("unchecked")
    private VoicePackPurchaseRepository createPurchaseRepoProxy() {
        return (VoicePackPurchaseRepository) Proxy.newProxyInstance(
                VoicePackPurchaseRepository.class.getClassLoader(),
                new Class<?>[]{VoicePackPurchaseRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("existsByPaymentId".equals(name)) {
                        return purchaseStore.containsKey((String) args[0]);
                    }
                    if ("findByPaymentId".equals(name)) {
                        return Optional.ofNullable(purchaseStore.get((String) args[0]));
                    }
                    if ("save".equals(name)) {
                        VoicePackPurchase p = (VoicePackPurchase) args[0];
                        if (p.getId() == null) p.setId(UUID.randomUUID());
                        purchaseStore.put(p.getPaymentId(), p);
                        return p;
                    }
                    if ("toString".equals(name)) return "PurchaseRepoProxy";
                    return null;
                }
        );
    }
}
