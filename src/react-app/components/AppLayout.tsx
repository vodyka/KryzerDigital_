import { useState } from "react";
import { Outlet } from "react-router";
import Topbar from "@/react-app/components/Topbar";

export default function AppLayout() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`min-h-screen ${darkMode ? "dark bg-gray-900" : "bg-[#f7f8fa]"}`}>
      {/* Topbar */}
      <Topbar darkMode={darkMode} setDarkMode={setDarkMode} />

      {/* Page Content */}
      <main className="p-4 lg:p-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 mt-8">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <p>© 2026 Kryzer Digital</p>
            <p>Built with ❤️ by the team</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
