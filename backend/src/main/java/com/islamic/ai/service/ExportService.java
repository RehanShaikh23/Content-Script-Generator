package com.islamic.ai.service;

import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Professional PDF and DOCX export for Islamic scripts.
 * Pure Java — no external libraries required.
 */
@Service
public class ExportService {

    // ── Page geometry (US Letter: 612 x 792 points) ──
    private static final float PAGE_W = 612f;
    private static final float PAGE_H = 792f;
    private static final float MARGIN_LEFT = 60f;
    private static final float MARGIN_RIGHT = 60f;
    private static final float MARGIN_TOP = 60f;
    private static final float MARGIN_BOTTOM = 70f;
    private static final float CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;
    private static final float LINE_H = 14f;       // body line height
    private static final float HEADING_H = 22f;    // section heading height
    private static final float BODY_FONT = 10f;
    private static final float HEADING_FONT = 13f;
    private static final float TITLE_FONT = 18f;
    private static final float FOOTER_FONT = 7f;
    private static final int CHARS_PER_LINE = 82;   // approx chars at 10pt Helvetica

    // ══════════════════════════════════════════════════════════════
    //  PDF Generation — multi-page, structured, professional
    // ══════════════════════════════════════════════════════════════

    public byte[] generatePdf(String title, String script) throws IOException {
        String safeTitle = title != null ? title : "Islamic Script";
        String safeScript = script != null ? script : "";
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("MMMM d, yyyy"));

        // ── Parse script into structured sections ──
        List<Section> sections = parseIntoSections(safeScript);

        // ── Paginate: split content into pages ──
        List<List<DrawCmd>> pages = paginate(safeTitle, date, sections);

        return buildPdfBytes(pages);
    }

    // ── Section parser — detects headings by markdown-style ** or ALL-CAPS lines ──
    private List<Section> parseIntoSections(String script) {
        List<Section> sections = new ArrayList<>();
        String[] rawLines = script.split("\n");

        Section current = new Section("", new ArrayList<>());
        for (String raw : rawLines) {
            String trimmed = raw.trim();

            // Detect heading: **Heading**, ### Heading, or ALL-CAPS line (>4 chars)
            String heading = extractHeading(trimmed);
            if (heading != null) {
                if (!current.heading.isEmpty() || !current.lines.isEmpty()) {
                    sections.add(current);
                }
                current = new Section(heading, new ArrayList<>());
                continue;
            }

            // Normal body line (or blank)
            current.lines.add(trimmed);
        }
        if (!current.heading.isEmpty() || !current.lines.isEmpty()) {
            sections.add(current);
        }
        return sections;
    }

    private String extractHeading(String line) {
        // **Bold heading**
        if (line.startsWith("**") && line.endsWith("**") && line.length() > 4) {
            return line.substring(2, line.length() - 2).trim();
        }
        // ### Markdown heading
        if (line.startsWith("###")) return line.replaceFirst("^#{1,4}\\s*", "").trim();
        if (line.startsWith("##")) return line.replaceFirst("^#{1,4}\\s*", "").trim();
        if (line.startsWith("#")) return line.replaceFirst("^#{1,4}\\s*", "").trim();
        // ALL-CAPS line with 5+ alpha chars and ending with colon or alone
        if (line.length() >= 5 && line.length() <= 60
                && line.equals(line.toUpperCase())
                && line.chars().filter(Character::isLetter).count() >= 5) {
            return titleCase(line.replace(":", "").trim());
        }
        return null;
    }

    // ── Pagination — produces draw commands per page ──
    private List<List<DrawCmd>> paginate(String title, String date, List<Section> sections) {
        List<List<DrawCmd>> pages = new ArrayList<>();
        List<DrawCmd> page = new ArrayList<>();
        float y = PAGE_H - MARGIN_TOP;

        // ── Title block (first page only) ──
        y = addTitle(page, title, date, y);
        y -= 10; // gap after title block

        // ── Sections ──
        for (Section sec : sections) {
            // Section heading
            if (!sec.heading.isEmpty()) {
                if (y - HEADING_H - LINE_H < MARGIN_BOTTOM) {
                    addFooter(page, pages.size() + 1);
                    pages.add(page);
                    page = new ArrayList<>();
                    y = PAGE_H - MARGIN_TOP;
                }
                y -= 6; // gap before heading
                page.add(new DrawCmd(Type.HEADING, sec.heading, MARGIN_LEFT, y));
                y -= HEADING_H;
                // thin line under heading
                page.add(new DrawCmd(Type.RULE, "", MARGIN_LEFT, y + 6));
                y -= 4;
            }

            // Body lines
            for (String line : sec.lines) {
                if (line.isEmpty()) {
                    y -= 8; // paragraph gap
                    continue;
                }

                // Detect bullet points
                boolean isBullet = line.startsWith("- ") || line.startsWith("* ")
                        || line.matches("^\\d+[\\.\\)]\\s.*");
                String text = isBullet ? line.replaceFirst("^[-*]\\s+|^\\d+[\\.\\)]\\s+", "") : line;
                // Strip remaining markdown bold
                text = text.replaceAll("\\*\\*(.+?)\\*\\*", "$1");

                List<String> wrapped = wordWrap(text, isBullet ? CHARS_PER_LINE - 4 : CHARS_PER_LINE);
                for (int i = 0; i < wrapped.size(); i++) {
                    if (y - LINE_H < MARGIN_BOTTOM) {
                        addFooter(page, pages.size() + 1);
                        pages.add(page);
                        page = new ArrayList<>();
                        y = PAGE_H - MARGIN_TOP;
                    }
                    float x = MARGIN_LEFT + (isBullet ? 12 : 0);
                    String prefix = (isBullet && i == 0) ? "\u2022  " : (isBullet ? "   " : "");
                    page.add(new DrawCmd(Type.BODY, prefix + wrapped.get(i), x, y));
                    y -= LINE_H;
                }
            }
        }

        // Final page footer
        addFooter(page, pages.size() + 1);
        pages.add(page);
        return pages;
    }

    private float addTitle(List<DrawCmd> page, String title, String date, float y) {
        // Decorative top line
        page.add(new DrawCmd(Type.THICK_RULE, "", MARGIN_LEFT, y));
        y -= 8;
        // Title text
        page.add(new DrawCmd(Type.TITLE, pdfEsc(title), MARGIN_LEFT, y));
        y -= 24;
        // Subtitle / date
        page.add(new DrawCmd(Type.META, "Islamic Script Generator  |  " + date + "  |  Premium Export",
                MARGIN_LEFT, y));
        y -= 14;
        // Bottom rule
        page.add(new DrawCmd(Type.THICK_RULE, "", MARGIN_LEFT, y));
        y -= 6;
        return y;
    }

    private void addFooter(List<DrawCmd> page, int pageNum) {
        page.add(new DrawCmd(Type.FOOTER_RULE, "", MARGIN_LEFT, MARGIN_BOTTOM - 10));
        page.add(new DrawCmd(Type.FOOTER,
                "Islamic Script Generator  -  Premium Export  -  Page " + pageNum,
                MARGIN_LEFT, MARGIN_BOTTOM - 22));
    }

    // ── Build raw PDF bytes from paginated draw commands ──
    private byte[] buildPdfBytes(List<List<DrawCmd>> pages) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        List<Integer> objOffsets = new ArrayList<>();
        objOffsets.add(0); // placeholder for 0-index

        int[] pos = {0};

        // Header
        pos[0] += writeStr(out, "%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n");

        // Obj 1: Catalog
        objOffsets.add(pos[0]);
        pos[0] += writeStr(out, "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

        // Obj 2: Pages (Kids filled later)
        int pagesObjPos = pos[0];
        objOffsets.add(pos[0]);

        StringBuilder kids = new StringBuilder();
        for (int i = 0; i < pages.size(); i++) {
            if (i > 0) kids.append(" ");
            kids.append(pageObjNum(i, pages.size())).append(" 0 R");
        }
        String pagesObj = "2 0 obj\n<< /Type /Pages /Kids [" + kids + "] /Count " + pages.size() + " >>\nendobj\n";
        pos[0] += writeStr(out, pagesObj);

        // Font objects: F1 = Helvetica, F2 = Helvetica-Bold
        int fontObj1 = objOffsets.size();
        objOffsets.add(pos[0]);
        pos[0] += writeStr(out, fontObj1 + " 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n");

        int fontObj2 = objOffsets.size();
        objOffsets.add(pos[0]);
        pos[0] += writeStr(out, fontObj2 + " 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n");

        // Resources dict (shared)
        String resources = "<< /Font << /F1 " + fontObj1 + " 0 R /F2 " + fontObj2 + " 0 R >> >>";

        // Page + Content stream objects
        for (int pi = 0; pi < pages.size(); pi++) {
            byte[] stream = renderPageStream(pages.get(pi));

            // Content stream object
            int streamObjNum = objOffsets.size();
            objOffsets.add(pos[0]);
            pos[0] += writeStr(out, streamObjNum + " 0 obj\n<< /Length " + stream.length + " >>\nstream\n");
            out.write(stream);
            pos[0] += stream.length;
            pos[0] += writeStr(out, "\nendstream\nendobj\n");

            // Page object
            int pageObjNum = objOffsets.size();
            objOffsets.add(pos[0]);
            pos[0] += writeStr(out, pageObjNum + " 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
                    + "/Contents " + streamObjNum + " 0 R /Resources " + resources + " >>\nendobj\n");
        }

        // Xref
        int xrefPos = pos[0];
        StringBuilder xref = new StringBuilder();
        xref.append("xref\n0 ").append(objOffsets.size()).append("\n");
        xref.append("0000000000 65535 f \n");
        for (int i = 1; i < objOffsets.size(); i++) {
            xref.append(String.format("%010d 00000 n \n", objOffsets.get(i)));
        }
        writeStr(out, xref.toString());

        writeStr(out, "trailer\n<< /Size " + objOffsets.size() + " /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF\n");

        return out.toByteArray();
    }

    private int pageObjNum(int pageIndex, int totalPages) {
        // Each page produces 2 objects (stream + page), starting after 4 fixed objects
        return 5 + pageIndex * 2 + 1;
    }

    private byte[] renderPageStream(List<DrawCmd> cmds) {
        StringBuilder s = new StringBuilder();
        for (DrawCmd cmd : cmds) {
            switch (cmd.type) {
                case TITLE:
                    s.append("BT /F2 ").append(TITLE_FONT).append(" Tf ")
                     .append(fmt(cmd.x)).append(" ").append(fmt(cmd.y)).append(" Td (")
                     .append(cmd.text).append(") Tj ET\n");
                    break;
                case HEADING:
                    s.append("BT /F2 ").append(HEADING_FONT).append(" Tf ")
                     .append(fmt(cmd.x)).append(" ").append(fmt(cmd.y)).append(" Td (")
                     .append(pdfEsc(cmd.text)).append(") Tj ET\n");
                    break;
                case META:
                    s.append("BT /F1 8 Tf 0.45 0.45 0.45 rg ")
                     .append(fmt(cmd.x)).append(" ").append(fmt(cmd.y)).append(" Td (")
                     .append(pdfEsc(cmd.text)).append(") Tj 0 0 0 rg ET\n");
                    break;
                case BODY:
                    s.append("BT /F1 ").append(BODY_FONT).append(" Tf ")
                     .append(fmt(cmd.x)).append(" ").append(fmt(cmd.y)).append(" Td (")
                     .append(pdfEsc(cmd.text)).append(") Tj ET\n");
                    break;
                case RULE:
                    s.append("0.75 0.75 0.75 RG 0.5 w ")
                     .append(fmt(cmd.x)).append(" ").append(fmt(cmd.y)).append(" m ")
                     .append(fmt(cmd.x + CONTENT_W)).append(" ").append(fmt(cmd.y)).append(" l S\n");
                    break;
                case THICK_RULE:
                    s.append("0.55 0.45 0.18 RG 1.5 w ")
                     .append(fmt(cmd.x)).append(" ").append(fmt(cmd.y)).append(" m ")
                     .append(fmt(cmd.x + CONTENT_W)).append(" ").append(fmt(cmd.y)).append(" l S\n");
                    break;
                case FOOTER_RULE:
                    s.append("0.82 0.82 0.82 RG 0.4 w ")
                     .append(fmt(cmd.x)).append(" ").append(fmt(cmd.y)).append(" m ")
                     .append(fmt(cmd.x + CONTENT_W)).append(" ").append(fmt(cmd.y)).append(" l S\n");
                    break;
                case FOOTER:
                    s.append("BT /F1 ").append(FOOTER_FONT).append(" Tf 0.55 0.55 0.55 rg ")
                     .append(fmt(cmd.x)).append(" ").append(fmt(cmd.y)).append(" Td (")
                     .append(pdfEsc(cmd.text)).append(") Tj 0 0 0 rg ET\n");
                    break;
            }
        }
        return s.toString().getBytes(StandardCharsets.US_ASCII);
    }

    // ══════════════════════════════════════════════════════════════
    //  DOCX Generation
    // ══════════════════════════════════════════════════════════════

    public byte[] generateDocx(String title, String script) throws IOException {
        String cleanTitle = escapeXml(title != null ? title : "Islamic Script");
        String cleanScript = script != null ? script : "";
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("MMMM d, yyyy"));

        StringBuilder body = new StringBuilder();

        // Title
        body.append("<w:p><w:pPr><w:jc w:val=\"center\"/></w:pPr>")
            .append("<w:r><w:rPr><w:b/><w:sz w:val=\"36\"/><w:color w:val=\"1a1a1a\"/></w:rPr>")
            .append("<w:t>").append(cleanTitle).append("</w:t></w:r></w:p>");

        // Date subtitle
        body.append("<w:p><w:pPr><w:jc w:val=\"center\"/></w:pPr>")
            .append("<w:r><w:rPr><w:sz w:val=\"18\"/><w:color w:val=\"888888\"/></w:rPr>")
            .append("<w:t>Islamic Script Generator  |  ").append(escapeXml(date)).append("  |  Premium Export</w:t></w:r></w:p>");

        // Spacer
        body.append("<w:p/>");

        // Script body
        for (String line : cleanScript.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) {
                body.append("<w:p/>");
                continue;
            }

            String heading = extractHeading(trimmed);
            if (heading != null) {
                body.append("<w:p><w:pPr><w:spacing w:before=\"200\" w:after=\"80\"/></w:pPr>")
                    .append("<w:r><w:rPr><w:b/><w:sz w:val=\"26\"/><w:color w:val=\"2d2d2d\"/></w:rPr>")
                    .append("<w:t>").append(escapeXml(heading)).append("</w:t></w:r></w:p>");
                continue;
            }

            String escaped = escapeXml(trimmed.replaceAll("\\*\\*(.+?)\\*\\*", "$1"));
            body.append("<w:p><w:r><w:rPr><w:sz w:val=\"22\"/></w:rPr>")
                .append("<w:t xml:space=\"preserve\">").append(escaped).append("</w:t></w:r></w:p>");
        }

        // Footer
        body.append("<w:p/><w:p><w:pPr><w:jc w:val=\"center\"/></w:pPr>")
            .append("<w:r><w:rPr><w:i/><w:sz w:val=\"16\"/><w:color w:val=\"999999\"/></w:rPr>")
            .append("<w:t>Generated by Islamic Script Generator - Premium Export</w:t></w:r></w:p>");

        String documentXml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
            + "<w:document xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" "
            + "xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">"
            + "<w:body>" + body + "</w:body></w:document>";

        String contentTypes = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
            + "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">"
            + "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>"
            + "<Default Extension=\"xml\" ContentType=\"application/xml\"/>"
            + "<Override PartName=\"/word/document.xml\" "
            + "ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/>"
            + "</Types>";

        String rels = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
            + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
            + "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" "
            + "Target=\"word/document.xml\"/></Relationships>";

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (java.util.zip.ZipOutputStream zos = new java.util.zip.ZipOutputStream(baos)) {
            zipEntry(zos, "[Content_Types].xml", contentTypes);
            zipEntry(zos, "_rels/.rels", rels);
            zipEntry(zos, "word/document.xml", documentXml);
        }
        return baos.toByteArray();
    }

    // ══════════════════════════════════════════════════════════════
    //  Helpers
    // ══════════════════════════════════════════════════════════════

    private enum Type { TITLE, HEADING, META, BODY, RULE, THICK_RULE, FOOTER_RULE, FOOTER }

    private record Section(String heading, List<String> lines) {}
    private record DrawCmd(Type type, String text, float x, float y) {}

    private String pdfEsc(String t) {
        if (t == null) return "";
        return t.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }

    private String fmt(float v) { return String.format("%.1f", v); }

    private int writeStr(ByteArrayOutputStream out, String s) throws IOException {
        byte[] b = s.getBytes(StandardCharsets.US_ASCII);
        out.write(b);
        return b.length;
    }

    private List<String> wordWrap(String text, int maxChars) {
        List<String> lines = new ArrayList<>();
        while (text.length() > maxChars) {
            int brk = text.lastIndexOf(' ', maxChars);
            if (brk <= 0) brk = maxChars;
            lines.add(text.substring(0, brk).trim());
            text = text.substring(brk).trim();
        }
        if (!text.isEmpty()) lines.add(text);
        return lines;
    }

    private String titleCase(String s) {
        if (s == null || s.isEmpty()) return s;
        StringBuilder sb = new StringBuilder();
        for (String word : s.toLowerCase().split("\\s+")) {
            if (!sb.isEmpty()) sb.append(' ');
            sb.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
        }
        return sb.toString();
    }

    private String escapeXml(String t) {
        if (t == null) return "";
        return t.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
                .replace("\"","&quot;").replace("'","&apos;");
    }

    private void zipEntry(java.util.zip.ZipOutputStream z, String name, String content) throws IOException {
        z.putNextEntry(new java.util.zip.ZipEntry(name));
        z.write(content.getBytes(StandardCharsets.UTF_8));
        z.closeEntry();
    }
}
