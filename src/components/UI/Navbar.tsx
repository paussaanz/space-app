import NotificationBell from "../../notifications/NotificationBell";
import logo from "/logo-white.svg";

export default function Navbar() {
  return (
    <header className="navbar position__fixed z-index-10 d__vw100 p__4">
      <div className="navbar--container">
        {/* Izquierda */}
        <nav className="navbar--left">
          <a
            href="/about"
            className="navbar--link text__decoration-none text__white text__transform-uppercase"
          >
            About us
          </a>
        </nav>

        {/* Centro */}
        <div className="navbar--center">
          <a
            href="/"
            className="navbar--brand-link text__decoration-none text__white"
          >
            <img
              src={logo}
              alt="NASA Space App Challenges"
              className="navbar--brand-img"
            />
          </a>
        </div>

        {/* Derecha */}
        <nav className="navbar--right">
          <NotificationBell />
        </nav>
      </div>
    </header>
  );
}
