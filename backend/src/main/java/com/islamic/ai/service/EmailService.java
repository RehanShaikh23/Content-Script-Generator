package com.islamic.ai.service;

import com.islamic.ai.model.Report;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.report.recipient:muslimforever833@gmail.com}")
    private String recipientEmail;

    private static final int MAX_RETRIES = 3;
    private static final long RETRY_DELAY_MS = 2000;
    private static final DateTimeFormatter TIME_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss XXX");

    /**
     * Send a report notification email asynchronously.
     * Retries up to 3 times with a 2-second delay between attempts.
     */
    @Async
    public void sendReportEmail(Report report) {
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                helper.setTo(recipientEmail);
                helper.setSubject("[User Report] " + report.getSubject());

                String body = buildEmailBody(report);
                helper.setText(body, false);

                mailSender.send(message);
                log.info("Report email sent successfully for report id={}", report.getId());
                return; // success — exit retry loop

            } catch (Exception e) {
                log.warn("Failed to send report email (attempt {}/{}): {}",
                        attempt, MAX_RETRIES, e.getMessage());

                if (attempt < MAX_RETRIES) {
                    try {
                        Thread.sleep(RETRY_DELAY_MS);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        log.error("Email retry interrupted for report id={}", report.getId());
                        return;
                    }
                } else {
                    log.error("All {} email attempts failed for report id={}. "
                            + "Report is saved in DB and can be reviewed manually.",
                            MAX_RETRIES, report.getId());
                }
            }
        }
    }

    private String buildEmailBody(Report report) {
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

    /**
     * Send a password reset email asynchronously.
     * Retries up to 3 times with a 2-second delay between attempts.
     */
    @Async
    public void sendPasswordResetEmail(String email, String resetLink) {
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                helper.setTo(email);
                helper.setSubject("Reset Your Password — Islamic Script Generator");

                String body = buildResetEmailBody(resetLink);
                helper.setText(body, true); // true = HTML

                mailSender.send(message);
                log.info("Password reset email sent successfully to {}", email);
                return;

            } catch (Exception e) {
                log.warn("Failed to send password reset email (attempt {}/{}): {}",
                        attempt, MAX_RETRIES, e.getMessage());

                if (attempt < MAX_RETRIES) {
                    try {
                        Thread.sleep(RETRY_DELAY_MS);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        log.error("Password reset email retry interrupted for {}", email);
                        return;
                    }
                } else {
                    log.error("All {} email attempts failed for password reset to {}",
                            MAX_RETRIES, email);
                }
            }
        }
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
    /**
     * Send a subscription cancellation confirmation email asynchronously.
     * Retries up to 3 times with a 2-second delay between attempts.
     */
    @Async
    public void sendCancellationEmail(String email, String fullName, String planName, String accessEndDate) {
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                helper.setTo(email);
                helper.setSubject("Subscription Cancellation Confirmed — Islamic Script Generator");

                String body = buildCancellationEmailBody(fullName, planName, accessEndDate);
                helper.setText(body, true); // true = HTML

                mailSender.send(message);
                log.info("Cancellation email sent successfully to {}", email);
                return;

            } catch (Exception e) {
                log.warn("Failed to send cancellation email (attempt {}/{}): {}",
                        attempt, MAX_RETRIES, e.getMessage());

                if (attempt < MAX_RETRIES) {
                    try {
                        Thread.sleep(RETRY_DELAY_MS);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        log.error("Cancellation email retry interrupted for {}", email);
                        return;
                    }
                } else {
                    log.error("All {} email attempts failed for cancellation email to {}",
                            MAX_RETRIES, email);
                }
            }
        }
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
