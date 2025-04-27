import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { Link } from "react-router-dom";

const ProfileDisplay = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stories, setStories] = useState([]); // Add stories state
  const [selectedStory, setSelectedStory] = useState(null);
  const [user, setUser] = useState(null);
  const [contactsCount, setContactsCount] = useState(0);
  const [activeTab, setActiveTab] = useState("info"); // Track active tab
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "",
    content: "",
  });

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUser(user);
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (error) {
            console.error("Error fetching profile", error);
            openModal(
              "Error",
              "Failed to fetch profile data. Please try again later."
            );
          } else if (data) {
            setProfile(data);

            const { count, error: contactsError } = await supabase
              .from("contacts")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id);

            if (!contactsError) {
              setContactsCount(count || 0);
            } else {
              console.error("Error fetching contacts count", contactsError);
            }

            // Now fetch stories for this specific user
            fetchUserStories(user.id);
          }
        }
      } catch (error) {
        console.error("Error:", error.message);
        openModal(
          "Error",
          "An unexpected error occurred. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndProfile();
  }, []);

  const fetchUserStories = async (userId) => {
    try {
      // Filter stories by the user_id field
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("user_id", userId) // Only get stories for this user
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch error details:", error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log(`Found ${data.length} stories for user ${userId}`);
        setStories(data);
        // Set the first story as selected by default
        setSelectedStory(data[0]);
      } else {
        console.log(`No stories found for user ${userId}`);
        setStories([]);
        setSelectedStory(null);
      }
    } catch (error) {
      console.error("Error fetching stories:", error.message);
    }
  };

  // Function to open modal with specific content
  const openModal = (title, content) => {
    setModalContent({ title, content });
    setModalOpen(true);
  };

  // Function to close modal
  const closeModal = () => {
    setModalOpen(false);
  };

  // Function to handle story selection
  const handleStorySelect = (story) => {
    setSelectedStory(story);
  };

  // Modal component
  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-gray-800 rounded-lg w-full max-w-md mx-4">
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white focus:outline-none"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="p-4">{children}</div>
          <div className="p-4 border-t border-gray-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Tab content components
  const renderTabContent = () => {
    switch (activeTab) {
      case "info":
        return (
          <>
            {/* About Section */}
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">About {profile.name}</h2>
              <p className="text-gray-300">
                {profile.bio || "No bio added yet."}
              </p>
            </div>
            {/* Social Links */}
            <div className="mt-8 flex space-x-4">
              {profile.social_links?.facebook && (
                <a
                  href={`https://facebook.com/${profile.social_links.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-500"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z" />
                  </svg>
                </a>
              )}

              {profile.social_links?.twitter && (
                <a
                  href={`https://twitter.com/${profile.social_links.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                  </svg>
                </a>
              )}

              {profile.social_links?.instagram && (
                <a
                  href={`https://instagram.com/${profile.social_links.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-pink-500"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 011.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 01-1.153 1.772 4.915 4.915 0 01-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 01-1.772-1.153 4.904 4.904 0 01-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 011.153-1.772A4.897 4.897 0 015.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 1.802c-2.67 0-2.986.01-4.04.059-.976.045-1.505.207-1.858.344-.466.182-.8.398-1.15.748-.35.35-.566.684-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.055-.058 1.37-.058 4.041 0 2.67.01 2.986.058 4.04.045.977.207 1.505.344 1.858.182.466.398.8.748 1.15.35.35.684.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058 2.67 0 2.987-.01 4.04-.058.977-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.684.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041 0-2.67-.01-2.986-.058-4.04-.045-.977-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.055-.048-1.37-.058-4.041-.058zm0 3.063a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 8.468a3.333 3.333 0 100-6.666 3.333 3.333 0 000 6.666zm6.538-8.469a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z" />
                  </svg>
                </a>
              )}

              {profile.social_links?.tiktok && (
                <a
                  href={`https://tiktok.com/@${profile.social_links.tiktok}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.83 4.83 0 01-1-.1z" />
                  </svg>
                </a>
              )}
            </div>
            {/* Basic Info */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 ">
              {profile.birth_day && (
                <div
                  className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700"
                  onClick={() =>
                    openModal(
                      "Birthday",
                      `${profile.name}'s birthday is on ${profile.birth_day}`
                    )
                  }
                >
                  <div className="flex items-center">
                    <div className="mr-4 bg-gray-700 p-3 rounded-full">
                      <svg
                        className="w-6 h-6 text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">
                        Birth Day
                      </h3>
                      <p className="text-white">{profile.birth_day}</p>
                    </div>
                  </div>
                </div>
              )}

              {profile.gender && (
                <div
                  className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700"
                  onClick={() =>
                    openModal(
                      "Gender",
                      `${profile.name} identifies as ${profile.gender}`
                    )
                  }
                >
                  <div className="flex items-center">
                    <div className="mr-4 bg-gray-700 p-3 rounded-full">
                      <svg
                        className="w-6 h-6 text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">
                        Gender
                      </h3>
                      <p className="text-white">{profile.gender}</p>
                    </div>
                  </div>
                </div>
              )}

              {profile.phone && (
                <div
                  className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700"
                  onClick={() =>
                    openModal("Contact Information", `Phone: ${profile.phone}`)
                  }
                >
                  <div className="flex items-center">
                    <div className="mr-4 bg-gray-700 p-3 rounded-full">
                      <svg
                        className="w-6 h-6 text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">
                        Phone No.
                      </h3>
                      <p className="text-white">{profile.phone}</p>
                    </div>
                  </div>
                </div>
              )}

              {profile.email && (
                <div
                  className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700"
                  onClick={() =>
                    openModal("Contact Information", `Email: ${profile.email}`)
                  }
                >
                  <div className="flex items-center">
                    <div className="mr-4 bg-gray-700 p-3 rounded-full">
                      <svg
                        className="w-6 h-6 text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">
                        Email
                      </h3>
                      <p className="text-white">{profile.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        );
      case "posts":
        return (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Posts</h2>
            <p className="text-gray-300">Posts content will appear here.</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              onClick={() =>
                openModal(
                  "Coming Soon",
                  "Posts functionality will be available in the next update."
                )
              }
            >
              View More Posts
            </button>
          </div>
        );
      case "photos":
        return (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Photos</h2>

            <div>
              {/* Story Navigation/Thumbnails */}
              <div className="flex overflow-x-auto space-x-2 mb-6 pb-2">
                {stories.map((story) => (
                  <div
                    key={story.id}
                    className={`cursor-pointer rounded-md overflow-hidden ${
                      selectedStory?.id === story.id
                        ? "ring-2 ring-blue-500"
                        : ""
                    }`}
                    onClick={() => handleStorySelect(story)}
                  >
                    <img
                      src={story.image}
                      alt={story.caption || "Story"}
                      className="w-24 h-24 object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case "videos":
        return (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Videos</h2>
            <p className="text-gray-300">Videos content will appear here.</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              onClick={() =>
                openModal(
                  "Coming Soon",
                  "Video gallery will be available in the next update."
                )
              }
            >
              View All Videos
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <h1 className="text-2xl mb-4">No profile found</h1>
        <Link
          to="/edit-profile"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          Create Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={modalContent.title}>
        <p className="text-gray-300">{modalContent.content}</p>
      </Modal>

      {/* Cover Image */}
      <div className="relative h-64 w-full">
        {profile.cover_image_url ? (
          <img
            src={profile.cover_image_url}
            alt="Cover"
            className="w-full h-[490px] object-cover"
            onClick={() =>
              profile.cover_image_url &&
              openModal(
                "Cover Image",
                <img
                  src={profile.cover_image_url}
                  alt="Cover"
                  className="w-full h-auto"
                />
              )
            }
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <p className="text-gray-500">No cover image</p>
          </div>
        )}
      </div>

      {/* Profile Header */}
      <div className="max-w-4xl mx-auto px-4 relative mt-[20rem]">
        <div className="flex flex-col md:flex-row">
          {/* Profile Image */}
          <div
            className="w-32 h-32 overflow-hidden rounded-full border-4 border-gray-900 bg-gray-800 cursor-pointer"
            onClick={() =>
              profile.profile_image_url &&
              openModal(
                "Profile Picture",
                <img
                  src={profile.profile_image_url}
                  alt={profile.name}
                  className="w-full h-auto"
                />
              )
            }
          >
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-500">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : "?"}
                </span>
              </div>
            )}
          </div>

          {/* Name and Username */}
          <div className="md:ml-4 mt-4 md:mt-0 flex-1">
            <h1 className="text-2xl font-bold">
              {profile.name || "Unnamed User"}
            </h1>
            <p className="text-gray-400">@{profile.username || "username"}</p>
            <div className="mt-2 flex items-center">
              <span
                className="text-sm cursor-pointer hover:text-blue-400"
                onClick={() =>
                  openModal(
                    "Contacts",
                    `${profile.name} has ${contactsCount} contacts`
                  )
                }
              >
                {contactsCount} Contacts
              </span>
              <span className="mx-2">•</span>
              <span
                className="text-sm cursor-pointer hover:text-blue-400"
                onClick={() =>
                  openModal("Folders", `${profile.name} has 1 folder`)
                }
              >
                1 Folder
              </span>
            </div>
          </div>

          {/* Edit Profile Button */}
          <div className="mt-4 md:mt-0">
            <Link
              to="/edit-profile"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded inline-block"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 border-b border-gray-800">
          <nav className="flex">
            <button
              onClick={() => setActiveTab("info")}
              className={`px-4 py-2 font-medium ${
                activeTab === "info"
                  ? "text-blue-500 border-b-2 border-blue-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Info
            </button>
            <button
              onClick={() => setActiveTab("posts")}
              className={`px-4 py-2 font-medium ${
                activeTab === "posts"
                  ? "text-blue-500 border-b-2 border-blue-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab("photos")}
              className={`px-4 py-2 font-medium ${
                activeTab === "photos"
                  ? "text-blue-500 border-b-2 border-blue-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Photos
            </button>
            <button
              onClick={() => setActiveTab("videos")}
              className={`px-4 py-2 font-medium ${
                activeTab === "videos"
                  ? "text-blue-500 border-b-2 border-blue-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Videos
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6 pb-12">{renderTabContent()}</div>
      </div>
    </div>
  );
};

export default ProfileDisplay;
