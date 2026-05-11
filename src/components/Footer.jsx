export default function Footer({ onReportIssue }) {
  return (
    <div className="footer">
      <span>آمين — May Allah make your content a sadaqah jaariyah</span>
      {onReportIssue && (
        <button className="footer__report-link" onClick={onReportIssue}>
          ⚑ Report Issue
        </button>
      )}
    </div>
  );
}
