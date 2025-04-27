// src/pages/Dashboard.jsx
import Navbar from "../component/Navbar";
import { useAuth } from "../login/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* navbar */}
      <Navbar />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-4 flex flex-col items-center justify-center">
            <h2 className="text-2xl font-semibold text-gray-700">
              Welcome to your Dashboard!
            </h2>
            <p className="mt-2 text-gray-500">
              You are logged in as {user.email}
            </p>
            <p className="mt-4 text-gray-500">
              This is a protected route - only authenticated users can see this
              page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
