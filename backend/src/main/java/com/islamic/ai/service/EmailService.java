package com.islamic.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.islamic.ai.model.Report;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Lightweight email dispatch service that sends all emails through a
 * Make.com webhook automation. No SMTP, Resend, or SendGrid required.
 *
 * <p>Webhook payload format:
 * <pre>
 * {
 *   "subject": "...",
 *   "content": "HTML or text body (use {name} for personalization)",
 *   "recipients": [{ "name": "...", "email": "..." }]
 * }
 * </pre>
 */
@Service
@Slf4j
public class EmailService {

    private final ObjectMapper objectMapper;

    @Value("${app.email.webhook-url:https://hook.us2.make.com/de6b44skd6sdvg65x9magqvbxjfyx8za}")
    private String webhookUrl;

    private static final int MAX_RETRIES = 2;
    private static final long RETRY_DELAY_MS = 1500;
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(8);
    private static final DateTimeFormatter TIME_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss XXX");

    private HttpClient httpClient;

    public EmailService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        log.info("✅ Email service configured with Make.com webhook");
    }

    // ── Public Async Methods ────────────────────────────────────────

    /**
     * Send a report notification email asynchronously.
     */
    @Async
    public void sendReportEmail(Report report) {
        String subject = "[User Report] " + report.getSubject();
        String textBody = buildReportBody(report);

        dispatchSingle("Admin", "muslimforever833@gmail.com", subject, textBody, "report id=" + report.getId());
    }

    /**
     * Send a password reset email asynchronously.
     */
    @Async
    public void sendPasswordResetEmail(String email, String resetLink) {
        String subject = "Reset Your Password — Islamic Script Generator";
        String htmlBody = buildResetEmailBody(resetLink);

        dispatchSingle(null, email, subject, htmlBody, "password reset");
    }

    /**
     * Send a subscription cancellation confirmation email asynchronously.
     */
    @Async
    public void sendCancellationEmail(String email, String fullName, String planName, String accessEndDate) {
        String subject = "Subscription Cancellation Confirmed — Islamic Script Generator";
        String htmlBody = buildCancellationEmailBody(fullName, planName, accessEndDate);

        dispatchSingle(fullName, email, subject, htmlBody, "cancellation");
    }

    /**
     * Send an admin-composed email to a single recipient via the Make.com webhook.
     */
    public void sendAdminEmail(String toEmail, String toName, String subject, String htmlBody) {
        dispatchSingle(toName, toEmail, subject, htmlBody, "admin email");
    }

    /**
     * Broadcast an email to a list of recipients.
     * Make.com will iterate over the recipients array and substitute {name} per user.
     *
     * @param recipients list of Recipient records
     * @param subject    email subject
     * @param content    HTML or text body — use {name} as the personalization token
     */
    public void sendBroadcast(List<Recipient> recipients, String subject, String content) {
        if (recipients == null || recipients.isEmpty()) {
            log.warn("⚠ sendBroadcast called with empty recipients list — skipping");
            return;
        }
        dispatchToWebhook(recipients, subject, content, "broadcast (" + recipients.size() + " recipients)");
    }

    // ── Recipient Record ────────────────────────────────────────────

    /**
     * Simple recipient record used for batch/broadcast payloads.
     */
    public record Recipient(String name, String email) {}

    // ── Core Dispatch Logic ─────────────────────────────────────────

    /**
     * Convenience wrapper for single-recipient sends.
     */
    private void dispatchSingle(String name, String email, String subject, String content, String context) {
        List<Recipient> recipients = List.of(new Recipient(
                name != null ? name : "",
                email
        ));
        dispatchToWebhook(recipients, subject, content, context);
    }

    /**
     * POST the email payload to the Make.com webhook with retry logic.
     * Never throws — failures are logged and swallowed so the primary
     * user flow is never interrupted by email dispatch issues.
     */
    private void dispatchToWebhook(List<Recipient> recipients, String subject, String content, String context) {
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                ObjectNode payload = objectMapper.createObjectNode();
                payload.put("subject", subject);
                payload.put("content", content);

                ArrayNode recipientsArray = payload.putArray("recipients");
                for (Recipient r : recipients) {
                    ObjectNode recipientNode = recipientsArray.addObject();
                    recipientNode.put("name", r.name());
                    recipientNode.put("email", r.email());
                }

                String json = objectMapper.writeValueAsString(payload);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(webhookUrl))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(json))
                        .timeout(REQUEST_TIMEOUT)
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() >= 400) {
                    throw new RuntimeException(
                            "Make.com webhook error (" + response.statusCode() + "): " + response.body());
                }

                log.info("✅ Email dispatched via Make.com webhook ({}) — recipients={}", context, recipients.size());
                return;

            } catch (Exception e) {
                log.warn("⚠ Email dispatch attempt {}/{} failed ({}): {}",
                        attempt, MAX_RETRIES, context, e.getMessage());

                if (attempt < MAX_RETRIES) {
                    try {
                        Thread.sleep(RETRY_DELAY_MS);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        log.error("❌ Email dispatch retry interrupted for {}", context);
                        return;
                    }
                } else {
                    log.error("❌ All {} email dispatch attempts failed for {} — skipping",
                            MAX_RETRIES, context);
                }
            }
        }
    }

    // ── Email Body Builders ─────────────────────────────────────────

    private String buildReportBody(Report report) {
        StringBuilder sb = new StringBuilder();
        sb.append("User: ").append(report.getEmail() != null ? report.getEmail() : "Unknown").append("\n");
        sb.append("Type: ").append(report.getSubject()).append("\n");
        sb.append("Description: ").append(report.getDescription()).append("\n");
        sb.append("Device: ").append(report.getDeviceInfo() != null ? report.getDeviceInfo() : "N/A").append("\n");
        sb.append("Time: ").append(report.getCreatedAt() != null
                ? report.getCreatedAt().format(TIME_FMT) : "N/A").append("\n");

        if (report.getScreenshotUrl() != null && !report.getScreenshotUrl().isBlank()) {
            sb.append("\n[Screenshot attached as base64 data — view in database]\n");
        }

        return sb.toString();
    }

    private String buildResetEmailBody(String resetLink) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"></head>
                <body style="margin:0;padding:0;background:#F8F9FA;font-family:'Inter',Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#F8F9FA;padding:40px 20px;">
                    <tr><td align="center">
                      <table width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:12px;border:1px solid rgba(0,0,0,0.06);box-shadow:0 4px 16px rgba(0,0,0,0.08);overflow:hidden;">
                        <!-- Header -->
                        <tr><td style="padding:32px 32px 16px;text-align:center;">
                          <div style="color:#A5A9AE;letter-spacing:0.5em;font-size:14px;margin-bottom:8px;">✦ ☽ ✦</div>
                          <div style="font-size:18px;color:#5F6266;margin-bottom:4px;">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                          <h1 style="font-size:24px;font-weight:700;color:#181B1E;margin:12px 0 0;letter-spacing:-0.02em;">Reset Your Password</h1>
                        </td></tr>

                        <!-- Body -->
                        <tr><td style="padding:8px 32px 24px;">
                          <p style="font-size:14px;color:#5F6266;line-height:1.7;margin:0 0 20px;">
                            Assalamu Alaikum {name},<br><br>
                            We received a request to reset your password for the Islamic Script Generator.
                            Click the button below to create a new password.
                          </p>

                          <!-- CTA Button -->
                          <table width="100%%" cellpadding="0" cellspacing="0">
                            <tr><td align="center" style="padding:8px 0 24px;">
                              <a href="%s" target="_blank"
                                 style="display:inline-block;background:#181B1E;color:#ffffff;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.02em;">
                                ✦ Reset Password ✦
                              </a>
                            </td></tr>
                          </table>

                          <!-- Expiry Warning -->
                          <div style="background:#F8F9FA;border:1px solid #CFD1D4;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
                            <p style="font-size:13px;color:#5F6266;margin:0;line-height:1.6;">
                              ⏳ This link will expire in <strong style="color:#181B1E;">15 minutes</strong>.
                              If you didn't request this, you can safely ignore this email.
                            </p>
                          </div>

                          <!-- Fallback Link -->
                          <p style="font-size:12px;color:#A5A9AE;line-height:1.6;margin:0;word-break:break-all;">
                            If the button doesn't work, copy and paste this link into your browser:<br>
                            <a href="%s" style="color:#5F6266;text-decoration:underline;">%s</a>
                          </p>
                        </td></tr>

                        <!-- Footer -->
                        <tr><td style="padding:20px 32px;border-top:1px solid rgba(0,0,0,0.06);text-align:center;">
                          <p style="font-size:12px;color:#A5A9AE;margin:0;line-height:1.6;">
                            آمين — May Allah make your content a sadaqah jaariyah
                          </p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(resetLink, resetLink, resetLink);
    }

    private String buildCancellationEmailBody(String fullName, String planName, String accessEndDate) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"></head>
                <body style="margin:0;padding:0;background:#F8F9FA;font-family:'Inter',Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#F8F9FA;padding:40px 20px;">
                    <tr><td align="center">
                      <table width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:12px;border:1px solid rgba(0,0,0,0.06);box-shadow:0 4px 16px rgba(0,0,0,0.08);overflow:hidden;">
                        <!-- Header -->
                        <tr><td style="padding:32px 32px 16px;text-align:center;">
                          <div style="color:#A5A9AE;letter-spacing:0.5em;font-size:14px;margin-bottom:8px;">✦ ☽ ✦</div>
                          <div style="font-size:18px;color:#5F6266;margin-bottom:4px;">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                          <h1 style="font-size:24px;font-weight:700;color:#181B1E;margin:12px 0 0;letter-spacing:-0.02em;">Cancellation Confirmed</h1>
                        </td></tr>

                        <!-- Body -->
                        <tr><td style="padding:8px 32px 24px;">
                          <p style="font-size:14px;color:#5F6266;line-height:1.7;margin:0 0 20px;">
                            Assalamu Alaikum {name},<br><br>
                            Your <strong style="color:#181B1E;">%s</strong> subscription has been cancelled.
                            You'll continue to have full access to all your plan features until the end of your current billing cycle.
                          </p>

                          <!-- Access End Date -->
                          <div style="background:#F8F9FA;border:1px solid #CFD1D4;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
                            <p style="font-size:12px;color:#5F6266;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Access Ends On</p>
                            <p style="font-size:20px;color:#181B1E;margin:0;font-weight:700;">%s</p>
                          </div>

                          <!-- Reactivation Note -->
                          <div style="background:#F8F9FA;border:1px solid #CFD1D4;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
                            <p style="font-size:13px;color:#5F6266;margin:0;line-height:1.6;">
                              💡 <strong style="color:#181B1E;">Changed your mind?</strong> You can reactivate your subscription anytime before
                              <strong style="color:#181B1E;">%s</strong> from your account settings — no need to set up a new plan.
                            </p>
                          </div>

                          <p style="font-size:13px;color:#A5A9AE;line-height:1.6;margin:0;">
                            After your access ends, your account will be downgraded to the free plan (10 credits/month).
                            Your generated scripts will remain accessible.
                          </p>
                        </td></tr>

                        <!-- Footer -->
                        <tr><td style="padding:20px 32px;border-top:1px solid rgba(0,0,0,0.06);text-align:center;">
                          <p style="font-size:12px;color:#A5A9AE;margin:0;line-height:1.6;">
                            آمين — May Allah make your content a sadaqah jaariyah
                          </p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(planName, accessEndDate, accessEndDate);
    }
}
