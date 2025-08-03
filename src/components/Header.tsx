import { Link } from "@tanstack/react-router";

export function Header() {
  return (
    <header className="bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-white">XR Formant</h1>
        </div>

        <nav className="flex items-center space-x-6">
          <Link
            to="/"
            className="text-white/80 hover:text-white transition-colors"
            activeProps={{ className: "text-white font-semibold" }}
          >
            Model loader
          </Link>
          <Link
            to="/audio"
            className="text-white/80 hover:text-white transition-colors"
            activeProps={{ className: "text-white font-semibold" }}
          >
            Audio
          </Link>
          <Link
            to="/about"
            className="text-white/80 hover:text-white transition-colors"
            activeProps={{ className: "text-white font-semibold" }}
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
