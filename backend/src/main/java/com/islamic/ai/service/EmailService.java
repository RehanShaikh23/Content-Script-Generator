package com.islamic.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.islamic.ai.model.Report;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.MimeMessage;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper;

    @Value("${app.report.recipient:muslimforever833@gmail.com}")
    private String recipientEmail;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${app.email.resend-api-key:}")
    private String resendApiKey;

    @Value("${app.email.from:Islamic Script Generator <onboarding@resend.dev>}")
    private String resendFromAddress;

    private static final int MAX_RETRIES = 3;
    private static final long RETRY_DELAY_MS = 2000;
    private static final String RESEND_API_URL = "https://api.resend.com/emails";
    private static final DateTimeFormatter TIME_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss XXX");

    private boolean useResend = false;
    private HttpClient httpClient;

    // ── Startup Validation ──────────────────────────────────────────

    @PostConstruct
    public void validateMailConfig() {
        // Prefer Resend (HTTP) over SMTP — works on cloud platforms that block port 587
        if (resendApiKey != null && !resendApiKey.isBlank()) {
            useResend = true;
            httpClient = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();
            log.info("✅ Email service configured with Resend (HTTP API), from: {}", resendFromAddress);
            return;
        }

        // Fallback to SMTP (local development)
        if (fromEmail != null && !fromEmail.isBlank()) {
            log.info("✅ Email service configured with SMTP, sender: {}", fromEmail);
            try {
                if (mailSender instanceof JavaMailSenderImpl impl) {
                    log.info("🔌 Testing SMTP connection to {}:{} ...", impl.getHost(), impl.getPort());
                    impl.testConnection();
                    log.info("✅ SMTP connection test PASSED");
                }
            } catch (Exception e) {
                log.error("❌ SMTP connection test FAILED: {}", e.getMessage());
            }
            return;
        }

        log.error("⚠️ No email service configured! Set RESEND_API_KEY (recommended) or MAIL_USERNAME.");
    }

    // ── Public Async Methods ────────────────────────────────────────

    /**
     * Send a report notification email asynchronously.
     */
    @Async
    public void sendReportEmail(Report report) {
        String subject = "[User Report] " + report.getSubject();
        String textBody = buildReportBody(report);

        doSend(recipientEmail, subject, null, textBody, "report id=" + report.getId());
    }

    /**
     * Send a password reset email asynchronously.
     */
    @Async
    public void sendPasswordResetEmail(String email, String resetLink) {
        String subject = "Reset Your Password — Islamic Script Generator";
        String htmlBody = buildResetEmailBody(resetLink);

        doSend(email, subject, htmlBody, null, "password reset");
    }

    /**
     * Send a subscription cancellation confirmation email asynchronously.
     */
    @Async
    public void sendCancellationEmail(String email, String fullName, String planName, String accessEndDate) {
        String subject = "Subscription Cancellation Confirmed — Islamic Script Generator";
        String htmlBody = buildCancellationEmailBody(fullName, planName, accessEndDate);

        doSend(email, subject, htmlBody, null, "cancellation");
    }

    // ── Core Send Logic (retry + routing) ───────────────────────────

    /**
     * Central send method with retry logic. Routes to Resend HTTP API
     * or SMTP based on configuration.
     */
    private void doSend(String to, String subject, String htmlBody, String textBody, String context) {
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (useResend) {
                    sendViaResend(to, subject, htmlBody, textBody);
                } else {
                    sendViaSmtp(to, subject, htmlBody, textBody);
                }
                log.info("✅ Email sent successfully to {} ({})", to, context);
                return;

            } catch (Exception e) {
                log.warn("Failed to send email (attempt {}/{}) for {}: {}",
                        attempt, MAX_RETRIES, context, e.getMessage());

                if (attempt < MAX_RETRIES) {
                    try {
                        Thread.sleep(RETRY_DELAY_MS);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        log.error("Email retry interrupted for {}", context);
                        return;
                    }
                } else {
                    log.error("❌ All {} email attempts failed for {} to {}",
                            MAX_RETRIES, context, to);
                }
            }
        }
    }

    // ── Resend HTTP API ─────────────────────────────────────────────

    private void sendViaResend(String to, String subject, String htmlBody, String textBody) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("from", resendFromAddress);

        ArrayNode toArray = payload.putArray("to");
        toArray.add(to);

        payload.put("subject", subject);

        if (htmlBody != null) {
            payload.put("html", htmlBody);
        }
        if (textBody != null) {
            payload.put("text", textBody);
        }

        String json = objectMapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(RESEND_API_URL))
                .header("Authorization", "Bearer " + resendApiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .timeout(Duration.ofSeconds(15))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 400) {
            throw new RuntimeException("Resend API error (" + response.statusCode() + "): " + response.body());
        }

        log.debug("Resend API response: {}", response.body());
    }

    // ── SMTP Fallback (local development) ───────────────────────────

    private void sendViaSmtp(String to, String subject, String htmlBody, String textBody) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);

        if (htmlBody != null) {
            helper.setText(htmlBody, true);
        } else if (textBody != null) {
            helper.setText(textBody, false);
        }

        mailSender.send(message);
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
                            Assalamu Alaikum,<br><br>
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
                            Assalamu Alaikum %s,<br><br>
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
                """.formatted(fullName, planName, accessEndDate, accessEndDate);
    }
}
