export default function Header() {
  return (
    <header className="header" role="banner">
      <span className="header__ornament" aria-hidden="true">✦ ☽ ✦</span>
      <div className="header__bismillah" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
      <h1 className="header__title">Islamic Script Generator</h1>
      <p className="header__subtitle">
        AI-powered YouTube Shorts &amp; video scripts — Islamic content only
      </p>
    </header>
  );
}
