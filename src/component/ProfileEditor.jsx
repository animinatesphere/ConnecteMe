import { useState, useEffect } from "react";
import { supabase } from "../../supabase"; // Adjust the import path as needed
import { useNavigate } from "react-router-dom";

const ProfileEditor = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("success");
  const [profileData, setProfileData] = useState({
    name: "",
    username: "",
    bio: "",
    birthDay: "",
    gender: "",
    phone: "",
    email: "",
    socialLinks: {
      facebook: "",
      twitter: "",
      instagram: "",
      tiktok: "",
    },
  });
  const [coverImage, setCoverImage] = useState(null);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchProfile(user.id);
      } else {
        navigate("/login");
      }
    };

    getUser();
  }, [navigate]);

  const fetchProfile = async (userId) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(); // Use maybeSingle() instead of single()

      if (error) {
        console.error("Error fetching profile", error);
      } else {
        // Initialize with empty values if no profile exists
        setProfileData({
          name: data?.name || "",
          username: data?.username || "",
          bio: data?.bio || "",
          birthDay: data?.birth_day || "",
          gender: data?.gender || "",
          phone: data?.phone || "",
          email: data?.email || user?.email || "", // Use user email if available
          socialLinks: data?.social_links || {
            facebook: "",
            twitter: "",
            instagram: "",
            tiktok: "",
          },
        });

        if (data?.cover_image_url) setCoverImageUrl(data.cover_image_url);
        if (data?.profile_image_url) setProfileImageUrl(data.profile_image_url);
      }
    } catch (error) {
      console.error("Error fetching profile:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: value });
  };

  const handleSocialLinkChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      socialLinks: { ...profileData.socialLinks, [name]: value },
    });
  };

  const handleCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImage(file);
      const fileUrl = URL.createObjectURL(file);
      setCoverImageUrl(fileUrl);
    }
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const fileUrl = URL.createObjectURL(file);
      setProfileImageUrl(fileUrl);
    }
  };

  const uploadImage = async (file, path) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("profileimages")
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("profileimages")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const showSuccessModal = () => {
    setModalType("success");
    setModalMessage("Profile updated successfully!");
    setShowModal(true);
  };

  const showErrorModal = (message) => {
    setModalType("error");
    setModalMessage(message || "Error updating profile. Please try again.");
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    if (modalType === "success") {
      navigate("/profile");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Upload images if they exist
      let coverImageUrlToSave = coverImageUrl;
      let profileImageUrlToSave = profileImageUrl;

      if (coverImage) {
        coverImageUrlToSave = await uploadImage(coverImage, "covers");
      }

      if (profileImage) {
        profileImageUrlToSave = await uploadImage(profileImage, "avatars");
      }

      // Check if we have an existing profile to determine if this is an update or insert
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Prepare the profile data
      const profilePayload = {
        user_id: user.id,
        name: profileData.name,
        username: profileData.username,
        bio: profileData.bio,
        birth_day: profileData.birthDay,
        gender: profileData.gender,
        phone: profileData.phone,
        email: profileData.email,
        social_links: profileData.socialLinks,
        cover_image_url: coverImageUrlToSave,
        profile_image_url: profileImageUrlToSave,
        updated_at: new Date(),
      };

      // If we have an existing profile, include the ID for upsert
      if (existingProfile?.id) {
        profilePayload.id = existingProfile.id;
      } else {
        // For new profiles, generate a UUID
        profilePayload.id = crypto.randomUUID(); // or use a UUID library
      }

      // Update profile in Supabase
      const { error } = await supabase.from("profiles").upsert(profilePayload);

      if (error) throw error;

      // Show success modal instead of alert
      showSuccessModal();
    } catch (error) {
      console.error("Error updating profile:", error.message);
      // Show error modal instead of alert
      showErrorModal(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Modal component
  const Modal = ({ show, onClose, type, message }) => {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center mb-4">
            {type === "success" ? (
              <div className="bg-green-500 rounded-full p-2 mr-3">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
            ) : (
              <div className="bg-red-500 rounded-full p-2 mr-3">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </div>
            )}
            <h3 className="text-xl font-semibold">
              {type === "success" ? "Success" : "Error"}
            </h3>
          </div>
          <p className="mb-6 text-gray-300">{message}</p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded ${
                type === "success"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              } text-white`}
            >
              {type === "success" ? "Continue" : "Close"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen pb-12">
      {/* Modal component */}
      <Modal
        show={showModal}
        onClose={handleModalClose}
        type={modalType}
        message={modalMessage}
      />

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold pt-8 pb-6">Edit Profile</h1>

        {/* Cover Image */}
        <div className="mb-8">
          <label className="block mb-2 font-medium">Cover Image</label>
          <div className="relative h-64 rounded-lg overflow-hidden bg-gray-700">
            {coverImageUrl ? (
              <img
                src={coverImageUrl}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">No cover image</p>
              </div>
            )}
            <div className="absolute bottom-4 right-4">
              <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded cursor-pointer">
                <span>Change Cover</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleCoverImageChange}
                  accept="image/*"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Profile Image */}
        <div className="mb-8 flex">
          <div className="relative">
            <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-700">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400 text-xs">No image</p>
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <input
                type="file"
                className="hidden"
                onChange={handleProfileImageChange}
                accept="image/*"
              />
            </label>
          </div>
          <div className="ml-6 flex-1">
            <div className="mb-4">
              <label className="block mb-1 text-sm font-medium">Name</label>
              <input
                type="text"
                name="name"
                value={profileData.name}
                onChange={handleInputChange}
                className="w-full bg-gray-800 rounded p-2 border border-gray-700"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 text-sm font-medium">Username</label>
              <div className="flex items-center">
                <span className="text-gray-400 mr-1">@</span>
                <input
                  type="text"
                  name="username"
                  value={profileData.username}
                  onChange={handleInputChange}
                  className="flex-1 bg-gray-800 rounded p-2 border border-gray-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">About</h2>
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium">Bio</label>
            <textarea
              name="bio"
              value={profileData.bio}
              onChange={handleInputChange}
              className="w-full bg-gray-800 rounded p-2 border border-gray-700 min-h-24"
              placeholder="Tell us about yourself..."
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Social Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-sm font-medium">Facebook</label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-gray-800 rounded-l border-y border-l border-gray-700">
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z" />
                  </svg>
                </span>
                <input
                  type="text"
                  name="facebook"
                  value={profileData.socialLinks.facebook}
                  onChange={handleSocialLinkChange}
                  className="flex-1 bg-gray-800 rounded-r p-2 border-y border-r border-gray-700"
                  placeholder="Username or URL"
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Twitter</label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-gray-800 rounded-l border-y border-l border-gray-700">
                  <svg
                    className="w-5 h-5 text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                  </svg>
                </span>
                <input
                  type="text"
                  name="twitter"
                  value={profileData.socialLinks.twitter}
                  onChange={handleSocialLinkChange}
                  className="flex-1 bg-gray-800 rounded-r p-2 border-y border-r border-gray-700"
                  placeholder="Username or URL"
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">
                Instagram
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-gray-800 rounded-l border-y border-l border-gray-700">
                  <svg
                    className="w-5 h-5 text-pink-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 011.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 01-1.153 1.772 4.915 4.915 0 01-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 01-1.772-1.153 4.904 4.904 0 01-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 011.153-1.772A4.897 4.897 0 015.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 1.802c-2.67 0-2.986.01-4.04.059-.976.045-1.505.207-1.858.344-.466.182-.8.398-1.15.748-.35.35-.566.684-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.055-.058 1.37-.058 4.041 0 2.67.01 2.986.058 4.04.045.977.207 1.505.344 1.858.182.466.398.8.748 1.15.35.35.684.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058 2.67 0 2.987-.01 4.04-.058.977-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.684.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041 0-2.67-.01-2.986-.058-4.04-.045-.977-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.055-.048-1.37-.058-4.041-.058zm0 3.063a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 8.468a3.333 3.333 0 100-6.666 3.333 3.333 0 000 6.666zm6.538-8.469a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  name="instagram"
                  value={profileData.socialLinks.instagram}
                  onChange={handleSocialLinkChange}
                  className="flex-1 bg-gray-800 rounded-r p-2 border-y border-r border-gray-700"
                  placeholder="Username or URL"
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">TikTok</label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-gray-800 rounded-l border-y border-l border-gray-700">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.83 4.83 0 01-1-.1z" />
                  </svg>
                </span>
                <input
                  type="text"
                  name="tiktok"
                  value={profileData.socialLinks.tiktok}
                  onChange={handleSocialLinkChange}
                  className="flex-1 bg-gray-800 rounded-r p-2 border-y border-r border-gray-700"
                  placeholder="Username or URL"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Basic Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-sm font-medium">
                Birth Day
              </label>
              <input
                type="date"
                name="birthDay"
                value={profileData.birthDay}
                onChange={handleInputChange}
                className="w-full bg-gray-800 rounded p-2 border border-gray-700"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Gender</label>
              <select
                name="gender"
                value={profileData.gender}
                onChange={handleInputChange}
                className="w-full bg-gray-800 rounded p-2 border border-gray-700"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={profileData.phone}
                onChange={handleInputChange}
                className="w-full bg-gray-800 rounded p-2 border border-gray-700"
                placeholder="e.g., 0098 4554 554"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Email</label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleInputChange}
                className="w-full bg-gray-800 rounded p-2 border border-gray-700"
                placeholder="e.g., your@email.com"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 rounded font-medium ${
              loading
                ? "bg-blue-700 opacity-70"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileEditor;
