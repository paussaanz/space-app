import NotificationBell from "../../notifications/NotificationBell";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar--container">
        <nav className="navbar--actions">
          {/* otros botones */}
          <NotificationBell />
        </nav>
      </div>
    </header>
  );
}
