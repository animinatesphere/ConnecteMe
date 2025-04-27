import { useState, useEffect } from "react";
import { useAuth } from "../login/AuthProvider";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../supabase";
import ThemeToggle from "../mode/ThemeToggle";

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [profilePicture, setProfilePicture] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Function to extract profile picture from Google account if available
  useEffect(() => {
    // Function to fetch user profile from Supabase
    const fetchUserProfile = async () => {
      try {
        setLoading(true);

        if (user) {
          // Fetch profile data from Supabase
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (error) {
            console.error("Error fetching profile", error);
          } else if (data) {
            setProfile(data);

            // If profile has an image URL, use it
            if (data.profile_image_url) {
              setProfilePicture(data.profile_image_url);
            }
            // Otherwise, check for Google provider image
            else if (
              user.providerData &&
              user.providerData.some(
                (provider) => provider.providerId === "google.com"
              )
            ) {
              const googleProvider = user.providerData.find(
                (provider) => provider.providerId === "google.com"
              );

              if (googleProvider && googleProvider.photoURL) {
                setProfilePicture(googleProvider.photoURL);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching user profile:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  // Add this useEffect to fetch unread messages and notifications
  useEffect(() => {
    if (!user) return;

    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact" })
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      setUnreadCount(count || 0);
    };

    // Fetch notifications
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      setNotifications(data || []);
    };

    fetchUnreadCount();
    fetchNotifications();

    // Set up real-time subscriptions
    const messagesSubscription = supabase
      .channel("unread-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    const notificationsSubscription = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSubscription);
      supabase.removeChannel(notificationsSubscription);
    };
  }, [user]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        mobileMenuOpen &&
        !event.target.closest(".mobile-menu") &&
        !event.target.closest(".hamburger-button")
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]);

  return (
    <>
      {/* Fixed navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex h-[63px] bg-gray-900 border-b border-gray-800">
        {/* Left Side - Logo */}
        <div className="flex items-center justify-center p-4 ">
          <div className="flex items-center ">
            {/* Desktop logo */}
            <svg
              width="160"
              height="40"
              viewBox="0 0 225 40"
              fill="none"
              className="hidden sm:block"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M37.2652 14.793C37.2652 14.793 45.0769 20.3653 41.9523 29.531C41.9523 29.531 41.3794 31.1975 39.0359 34.4264L42.473 37.9677C42.473 37.9677 43.3063 39.4779 41.5877 39.9987H24.9228C24.9228 39.9987 19.6108 40.155 14.8196 36.9782C14.8196 36.9782 12.1637 35.2075 9.76807 31.9787L18.6213 32.0308C18.6213 32.0308 24.2978 31.9787 29.766 28.3332C35.2342 24.6878 37.4215 18.6988 37.2652 14.793Z"
                fill="#60A5FA"
              ></path>
              <path
                d="M34.5053 12.814C32.2659 1.04441 19.3506 0.0549276 19.3506 0.0549276C8.31004 -0.674164 3.31055 6.09597 3.31055 6.09597C-4.24076 15.2617 3.6751 23.6983 3.6751 23.6983C3.6751 23.6983 2.99808 24.6357 0.862884 26.5105C-1.27231 28.3854 1.22743 29.3748 1.22743 29.3748H17.3404C23.4543 28.7499 25.9124 27.3959 25.9124 27.3959C36.328 22.0318 34.5053 12.814 34.5053 12.814ZM19.9963 18.7301H9.16412C8.41419 18.7301 7.81009 18.126 7.81009 17.3761C7.81009 16.6261 8.41419 16.022 9.16412 16.022H19.9963C20.7463 16.022 21.3504 16.6261 21.3504 17.3761C21.3504 18.126 20.7358 18.7301 19.9963 18.7301ZM25.3708 13.314H9.12245C8.37253 13.314 7.76843 12.7099 7.76843 11.96C7.76843 11.21 8.37253 10.6059 9.12245 10.6059H25.3708C26.1207 10.6059 26.7248 11.21 26.7248 11.96C26.7248 12.7099 26.1103 13.314 25.3708 13.314Z"
                fill="#2563EB"
              ></path>
            </svg>

            {/* Mobile logo - appropriately sized */}
            <svg
              width="40"
              height="40"
              viewBox="0 0 45 40"
              fill="none"
              className="block sm:hidden"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M37.2652 14.793C37.2652 14.793 45.0769 20.3653 41.9523 29.531C41.9523 29.531 41.3794 31.1975 39.0359 34.4264L42.473 37.9677C42.473 37.9677 43.3063 39.4779 41.5877 39.9987H24.9228C24.9228 39.9987 19.6108 40.155 14.8196 36.9782C14.8196 36.9782 12.1637 35.2075 9.76807 31.9787L18.6213 32.0308C18.6213 32.0308 24.2978 31.9787 29.766 28.3332C35.2342 24.6878 37.4215 18.6988 37.2652 14.793Z"
                fill="#60A5FA"
              ></path>
              <path
                d="M34.5053 12.814C32.2659 1.04441 19.3506 0.0549276 19.3506 0.0549276C8.31004 -0.674164 3.31055 6.09597 3.31055 6.09597C-4.24076 15.2617 3.6751 23.6983 3.6751 23.6983C3.6751 23.6983 2.99808 24.6357 0.862884 26.5105C-1.27231 28.3854 1.22743 29.3748 1.22743 29.3748H17.3404C23.4543 28.7499 25.9124 27.3959 25.9124 27.3959C36.328 22.0318 34.5053 12.814 34.5053 12.814ZM19.9963 18.7301H9.16412C8.41419 18.7301 7.81009 18.126 7.81009 17.3761C7.81009 16.6261 8.41419 16.022 9.16412 16.022H19.9963C20.7463 16.022 21.3504 16.6261 21.3504 17.3761C21.3504 18.126 20.7358 18.7301 19.9963 18.7301ZM25.3708 13.314H9.12245C8.37253 13.314 7.76843 12.7099 7.76843 11.96C7.76843 11.21 8.37253 10.6059 9.12245 10.6059H25.3708C26.1207 10.6059 26.7248 11.21 26.7248 11.96C26.7248 12.7099 26.1103 13.314 25.3708 13.314Z"
                fill="#2563EB"
              ></path>
            </svg>
          </div>
        </div>
        <div className="flex items-center w-full h-full px-4">
          {/* Middle Section - Navigation Icons (Hidden on Mobile) */}
          <div className="hidden md:flex items-center border-l border-r border-gray-800 px-2 ml-4 lg:ml-16">
            <Link to="/messages">
              <NavItem badge={unreadCount > 0 ? unreadCount : null}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M16 8c0 3.866-3.582 7-8 7a9 9 0 0 1-2.347-.306c-.584.296-1.925.864-4.181 1.234-.2.032-.352-.176-.273-.362.354-.836.674-1.95.77-2.966C.744 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7M4.5 5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0 2.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1z"></path>
                </svg>
              </NavItem>
            </Link>

            <div className="relative ml-2 group cursor-pointer">
              <NavItem
                badge={notifications.length > 0 ? notifications.length : null}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="24"
                  height="24"
                  fill="currentColor"
                  className="bi bi-bell"
                >
                  <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6"></path>
                </svg>
              </NavItem>

              {/* Notification dropdown */}
              {notifications.length > 0 && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-md shadow-lg py-1 z-20 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-300 max-h-96 overflow-y-auto">
                  <div className="px-4 py-2 text-sm font-semibold text-gray-200 border-b border-gray-700">
                    Notifications
                  </div>
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 border-b border-gray-700"
                      onClick={async () => {
                        // Mark as read when clicked
                        await supabase
                          .from("notifications")
                          .update({ is_read: true })
                          .eq("id", notification.id);

                        // Navigate if there's a link
                        if (notification.link) {
                          navigate(notification.link);
                        }
                      }}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-blue-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-xs text-gray-400">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(
                              notification.created_at
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="px-4 py-2 text-center text-xs text-blue-400 hover:underline">
                    <Link to="/notifications">View all notifications</Link>
                  </div>
                </div>
              )}
            </div>
            <Link to="/contact">
              <NavItem active>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="24"
                  height="24"
                  fill="currentColor"
                  className="bi bi-person-lines-fill"
                >
                  <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zM11 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5m.5 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1zm2 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1zm0 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1z"></path>
                </svg>
              </NavItem>
            </Link>
            <NavItem>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                width="24"
                height="24"
                fill="currentColor"
                className="bi bi-robot"
              >
                <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.6 26.6 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.93.93 0 0 1-.765.935c-.845.147-2.34.346-4.235.346s-3.39-.2-4.235-.346A.93.93 0 0 1 3 9.219zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a25 25 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25 25 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135"></path>
                <path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2zM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5"></path>
              </svg>
            </NavItem>
            <NavItem badge="2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                width="24"
                height="24"
                fill="currentColor"
                className="bi bi-person-bounding-box"
              >
                <path d="M1.5 1a.5.5 0 0 0-.5.5v3a.5.5 0 0 1-1 0v-3A1.5 1.5 0 0 1 1.5 0h3a.5.5 0 0 1 0 1zM11 .5a.5.5 0 0 1 .5-.5h3A1.5 1.5 0 0 1 16 1.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 1-.5-.5M.5 11a.5.5 0 0 1 .5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 1 0 1h-3A1.5 1.5 0 0 1 0 14.5v-3a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v3a1.5 1.5 0 0 1-1.5 1.5h-3a.5.5 0 0 1 0-1h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 1 .5-.5"></path>
                <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm8-9a3 3 0 1 1-6 0 3 3 0 0 1 6 0"></path>
              </svg>
            </NavItem>
            <Link to="/stories">
              <NavItem>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="24"
                  height="24"
                  fill="currentColor"
                  className="bi bi-subtract"
                >
                  <path d="M0 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"></path>
                </svg>
              </NavItem>
            </Link>
          </div>

          {/* Right Side - User Profile & Actions */}
          <div className="flex items-center ml-auto space-x-2">
            {/* Hamburger menu button - Only visible on mobile */}
            <button
              className="md:hidden p-2 text-gray-400 hover:text-gray-200 focus:outline-none hamburger-button"
              onClick={toggleMobileMenu}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    mobileMenuOpen
                      ? "M6 18L18 6M6 6l12 12"
                      : "M4 6h16M4 12h16M4 18h16"
                  }
                />
              </svg>
            </button>

            {/* For tablet size, show some important icons */}
            <div className="hidden sm:flex md:hidden">
              <Link to="/messages">
                <NavItem badge={unreadCount > 0 ? unreadCount : null}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M16 8c0 3.866-3.582 7-8 7a9 9 0 0 1-2.347-.306c-.584.296-1.925.864-4.181 1.234-.2.032-.352-.176-.273-.362.354-.836.674-1.95.77-2.966C.744 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7M4.5 5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0 2.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1z"></path>
                  </svg>
                </NavItem>
              </Link>
              <div className="relative ml-2 group cursor-pointer">
                <NavItem
                  badge={notifications.length > 0 ? notifications.length : null}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="24"
                    height="24"
                    fill="currentColor"
                    className="bi bi-bell"
                  >
                    <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6"></path>
                  </svg>
                </NavItem>
                {/* Notification dropdown - Same as above */}
                {notifications.length > 0 && (
                  <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-md shadow-lg py-1 z-20 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-300 max-h-96 overflow-y-auto">
                    {/* Same notification content as above */}
                    <div className="px-4 py-2 text-sm font-semibold text-gray-200 border-b border-gray-700">
                      Notifications
                    </div>
                    {/* Notifications mapping - same as above */}
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 border-b border-gray-700"
                        onClick={async () => {
                          await supabase
                            .from("notifications")
                            .update({ is_read: true })
                            .eq("id", notification.id);

                          if (notification.link) {
                            navigate(notification.link);
                          }
                        }}
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg
                              className="h-5 w-5 text-blue-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-xs text-gray-400">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(
                                notification.created_at
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="px-4 py-2 text-center text-xs text-blue-400 hover:underline">
                      <Link to="/notifications">View all notifications</Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="mr-2">
              <ThemeToggle />
            </div>

            {/* Profile Picture/Avatar */}
            {user ? (
              <div className="relative group">
                <button className="flex items-center focus:outline-none">
                  <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-blue-500">
                    {profilePicture ? (
                      <img
                        src={profilePicture}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gray-700 flex items-center justify-center text-gray-300">
                        {profile?.username?.charAt(0)?.toUpperCase() ||
                          user.email?.charAt(0)?.toUpperCase() ||
                          "U"}
                      </div>
                    )}
                  </div>
                </button>

                {/* Dropdown menu for profile */}
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg overflow-hidden z-10 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-300">
                  <div className="py-2">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Your Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={async () => {
                        const { error } = await supabase.auth.signOut();
                        if (!error) {
                          navigate("/login");
                        }
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-sm font-medium text-blue-500 hover:text-blue-400"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={toggleMobileMenu}
        >
          <div
            className="fixed top-[63px] right-0 w-64 h-full bg-gray-900 shadow-lg p-4 mobile-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col space-y-4">
              <Link
                to="/messages"
                className="flex items-center text-gray-300 hover:text-white py-2"
                onClick={toggleMobileMenu}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="mr-3"
                >
                  <path d="M16 8c0 3.866-3.582 7-8 7a9 9 0 0 1-2.347-.306c-.584.296-1.925.864-4.181 1.234-.2.032-.352-.176-.273-.362.354-.836.674-1.95.77-2.966C.744 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7M4.5 5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0 2.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1z"></path>
                </svg>
                Messages
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>

              <Link
                to="/notifications"
                className="flex items-center text-gray-300 hover:text-white py-2"
                onClick={toggleMobileMenu}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="24"
                  height="24"
                  fill="currentColor"
                  className="mr-3"
                >
                  <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6"></path>
                </svg>
                Notifications
                {notifications.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {notifications.length}
                  </span>
                )}
              </Link>

              <Link
                to="/contact"
                className="flex items-center text-gray-300 hover:text-white py-2"
                onClick={toggleMobileMenu}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="24"
                  height="24"
                  fill="currentColor"
                  className="mr-3"
                >
                  <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zM11 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5m.5 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1zm2 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1zm0 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1z"></path>
                </svg>
                Contacts
              </Link>

              <Link
                to="/ai"
                className="flex items-center text-gray-300 hover:text-white py-2"
                onClick={toggleMobileMenu}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="24"
                  height="24"
                  fill="currentColor"
                  className="mr-3"
                >
                  <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.6 26.6 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.93.93 0 0 1-.765.935c-.845.147-2.34.346-4.235.346s-3.39-.2-4.235-.346A.93.93 0 0 1 3 9.219zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a25 25 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25 25 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135"></path>
                  <path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2zM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5"></path>
                </svg>
                AI Assistant
              </Link>

              <Link
                to="/connections"
                className="flex items-center text-gray-300 hover:text-white py-2"
                onClick={toggleMobileMenu}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="24"
                  height="24"
                  fill="currentColor"
                  className="mr-3"
                >
                  <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm8-9a3 3 0 1 1-6 0 3 3 0 0 1 6 0"></path>
                  <path d="M1.5 1a.5.5 0 0 0-.5.5v3a.5.5 0 0 1-1 0v-3A1.5 1.5 0 0 1 1.5 0h3a.5.5 0 0 1 0 1zM11 .5a.5.5 0 0 1 .5-.5h3A1.5 1.5 0 0 1 16 1.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 1-.5-.5M.5 11a.5.5 0 0 1 .5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 1 0 1h-3A1.5 1.5 0 0 1 0 14.5v-3a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v3a1.5 1.5 0 0 1-1.5 1.5h-3a.5.5 0 0 1 0-1h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 1 .5-.5"></path>
                </svg>
                Connections
              </Link>

              <Link
                to="/stories"
                className="flex items-center text-gray-300 hover:text-white py-2"
                onClick={toggleMobileMenu}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="24"
                  height="24"
                  fill="currentColor"
                  className="mr-3"
                >
                  <path d="M0 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2H2a2 2 0 0 1-2-2z"></path>
                </svg>
                Stories
              </Link>

              <hr className="border-gray-700" />

              {user ? (
                <>
                  <Link
                    to="/profile"
                    className="flex items-center text-gray-300 hover:text-white py-2"
                    onClick={toggleMobileMenu}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      className="mr-3"
                      viewBox="0 0 16 16"
                    >
                      <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                      <path
                        fillRule="evenodd"
                        d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"
                      />
                    </svg>
                    Your Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center text-gray-300 hover:text-white py-2"
                    onClick={toggleMobileMenu}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      className="mr-3"
                      viewBox="0 0 16 16"
                    >
                      <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
                      <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z" />
                    </svg>
                    Settings
                  </Link>
                  <button
                    onClick={async () => {
                      const { error } = await supabase.auth.signOut();
                      if (!error) {
                        navigate("/login");
                      }
                      toggleMobileMenu();
                    }}
                    className="flex items-center text-gray-300 hover:text-white py-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      className="mr-3"
                      viewBox="0 0 16 16"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"
                      />
                      <path
                        fillRule="evenodd"
                        d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"
                      />
                    </svg>
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center text-gray-300 hover:text-white py-2"
                  onClick={toggleMobileMenu}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="currentColor"
                    className="mr-3"
                    viewBox="0 0 16 16"
                  >
                    <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                    <path
                      fillRule="evenodd"
                      d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"
                    />
                  </svg>
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// NavItem component for the navigation icons
function NavItem({ children, active, badge }) {
  return (
    <div className="relative">
      <div
        className={`h-full py-4 px-3 flex items-center justify-center cursor-pointer transition-colors ${
          active ? "text-blue-500" : "text-gray-400 hover:text-gray-200"
        }`}
      >
        {children}
        {badge && (
          <div className="absolute top-3 right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {badge}
          </div>
        )}
      </div>
    </div>
  );
}
