// src/App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./login/AuthProvider";
import { supabase } from "../supabase";
import { useEffect, useState } from "react";
import Login from "./login/Login";
import Register from "./login/Register";
import Dashboard from "./page/Dashboard";
import Stories from "./component/Stories";
import { ThemeProvider } from "./mode/ThemeProvider";
import ProfileEditor from "./component/ProfileEditor";
import ProfileDisplay from "./component/ProfileDisplay";
import Navbar from "./component/Navbar";
import Contacts from "./component/Contacts";
import Chat from "./component/Chat";
import Messages from "./component/Messages";

const PrivateRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAuthenticated(!!user);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
        <div className="w-16 h-16 relative">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div
            className="absolute top-1 left-1 w-14 h-14 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "1.2s" }}
          ></div>
        </div>
        <p className="mt-4 text-gray-300 font-medium">
          Loading your experience...
        </p>
      </div>
    );
  }

  return authenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          {/* Protected routes */}
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfileDisplay />
              </PrivateRoute>
            }
          />
          <Route
            path="/edit-profile"
            element={
              <PrivateRoute>
                <ProfileEditor />
              </PrivateRoute>
            }
          />
          <Route path="/stories" element={<Stories />} />

          {/* Updated Contact Routes */}
          <Route
            path="/contacts"
            element={
              <PrivateRoute>
                <Contacts />
              </PrivateRoute>
            }
          />
          <Route
            path="/contacts/:contactId"
            element={
              <PrivateRoute>
                <Contacts />
              </PrivateRoute>
            }
          />
          {/* Chat Route */}
          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            }
          />
          {/* Chat Route */}
          <Route
            path="/chat/:contactId"
            element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            }
          />

          {/* Keep for backward compatibility if you've linked to this elsewhere */}
          <Route
            path="/contact"
            element={<Navigate to="/contacts" replace />}
          />
          <Route path="/messages" element={<Messages />} />
          {/* Redirect to login if no route matches */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
