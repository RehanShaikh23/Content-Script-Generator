export default function Footer({ onReportIssue }) {
  return (
    <footer className="footer" role="contentinfo">
      <span>آمين — May Allah make your content a sadaqah jaariyah</span>
      {onReportIssue && (
        <button className="footer__report-link" onClick={onReportIssue}>
          ⚑ Report Issue
        </button>
      )}
      <div className="footer__seo-links">
        <span className="footer__copyright">© {new Date().getFullYear()} Muslim Empire. All rights reserved.</span>
      </div>
    </footer>
  );
}
