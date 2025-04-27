import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import Navbar from "./Navbar";

const Stories = () => {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [unseenCount, setUnseenCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressIntervalRef = useRef(null);
  const [storyProgress, setStoryProgress] = useState(0);

  // Auto progression settings
  const storyDuration = 5000; // 5 seconds per story

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [storyCaption, setStoryCaption] = useState("");
  const [storyHashtag, setStoryHashtag] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Fetch stories from Supabase on component mount
  useEffect(() => {
    fetchStories();
    return () => {
      // Clean up interval on unmount
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Auto progression effect
  useEffect(() => {
    if (stories.length === 0 || isPaused) return;

    // Set up story progression
    const progressStep = 100 / (storyDuration / 100); // Progress increment every 100ms
    let currentProgress = 0;

    progressIntervalRef.current = setInterval(() => {
      currentProgress += progressStep;
      setStoryProgress(currentProgress);

      if (currentProgress >= 100) {
        // Move to next story
        const nextIndex = (selectedStoryIndex + 1) % stories.length;
        setSelectedStoryIndex(nextIndex);
        setSelectedStory(stories[nextIndex]);
        currentProgress = 0;
        setStoryProgress(0);
      }
    }, 100);

    return () => {
      clearInterval(progressIntervalRef.current);
    };
  }, [stories, selectedStoryIndex, isPaused]);

  // Update selected story when selected index changes
  useEffect(() => {
    if (stories.length > 0 && selectedStoryIndex < stories.length) {
      setSelectedStory(stories[selectedStoryIndex]);
    }
  }, [selectedStoryIndex, stories]);

  // Function to fetch stories from Supabase
  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch error details:", error);
        throw error;
      }

      if (data && data.length > 0) {
        setStories(data);
        setSelectedStory(data[0]);
        setSelectedStoryIndex(0);

        // Calculate unseen stories (this would depend on your user session logic)
        // For demo purposes, we'll assume all are unseen
        setUnseenCount(data.length);
      }
    } catch (error) {
      console.error("Error fetching stories:", error.message);
    }
  };

  const handleStorySelect = (story, index) => {
    setSelectedStory(story);
    setSelectedStoryIndex(index);
    setStoryProgress(0); // Reset progress when manually selecting a story

    // In a real app, you might want to mark the story as seen in the database
    // markStorySeen(story.id);
  };

  // Pause story progression when hovering over the story
  const handleStoryHover = (isHovering) => {
    setIsPaused(isHovering);
  };

  const uploadStoryToSupabase = async () => {
    if (!selectedFile || !storyCaption) return;

    setUploadError(null);
    try {
      setIsUploading(true);

      // First, check authentication status
      const authResponse = await supabase.auth.getUser();
      console.log("Auth status:", authResponse);

      // Upload image to Supabase Storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Math.random()
        .toString(36)
        .substring(2, 15)}.${fileExt}`;
      const filePath = `stories/${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("story-images")
        .upload(filePath, selectedFile, {
          onUploadProgress: (progress) => {
            setUploadProgress((progress.loaded / progress.total) * 100);
          },
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      // Get the public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from("story-images")
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;

      // Prepare the story data - simplified to avoid potential schema issues
      const storyData = {
        image: imageUrl,
        caption: storyCaption,
        hashtag: storyHashtag.startsWith("#")
          ? storyHashtag
          : `#${storyHashtag}`,
        created_at: new Date().toISOString(),
      };

      // Try to add user_id if we have a user, but make it optional
      if (authResponse?.data?.user) {
        storyData.user_id = authResponse.data.user.id;
      }

      console.log("Attempting to insert story with data:", storyData);

      // Try direct SQL execution through Supabase with error handling
      const { data, error } = await supabase
        .from("stories")
        .insert([storyData])
        .select();

      if (error) {
        console.error("Database insert error details:", error);
        setUploadError(`Error: ${error.message} (Code: ${error.code})`);
        throw error;
      }

      console.log("Story inserted successfully:", data);

      // Add the new story to the state
      if (data && data.length > 0) {
        setStories([data[0], ...stories]);
        setSelectedStory(data[0]);
        setSelectedStoryIndex(0);
        setUnseenCount(unseenCount + 1);
      }

      // Close modal and reset form
      setIsModalOpen(false);
      resetForm();

      return data[0];
    } catch (error) {
      console.error("Error uploading story:", error);
      setUploadError(`Upload failed: ${error.message}`);
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setStoryCaption("");
    setStoryHashtag("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
  };

  const handleAddStory = () => {
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // Navigate to previous story
  const goToPreviousStory = () => {
    if (stories.length <= 1) return;

    const newIndex =
      selectedStoryIndex === 0 ? stories.length - 1 : selectedStoryIndex - 1;

    setSelectedStoryIndex(newIndex);
    setStoryProgress(0);
  };

  // Navigate to next story
  const goToNextStory = () => {
    if (stories.length <= 1) return;

    const newIndex = (selectedStoryIndex + 1) % stories.length;
    setSelectedStoryIndex(newIndex);
    setStoryProgress(0);
  };

  return (
    <>
      <Navbar />
      <div className="flex h-screen bg-gray-900">
        {/* Sidebar */}
        <div className="w-[450px] bg-[#0f172a] p-9 shadow-md overflow-y-auto mt-[5rem] border-r border-gray-700  ">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-white">Stories</h2>
            <button
              onClick={handleAddStory}
              className="bg-[#203047] rounded-full p-1 hover:bg-[#bfdbfe]"
              disabled={isUploading}
            >
              {isUploading ? (
                <div className="h-6 w-6 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="1.5em"
                  height="1.5em"
                  fill="#94a3b8"
                  className="bi bi-plus-lg"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"
                  ></path>
                </svg>
              )}
            </button>
          </div>

          <p className="text-sm text-white mb-4">
            {unseenCount} unseen stories
          </p>

          {isUploading && (
            <div className="mb-4">
              <div className="bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-300 mt-1">
                Uploading: {Math.round(uploadProgress)}%
              </p>
            </div>
          )}

          <div className="space-y-4">
            {stories.length === 0 && !isUploading && (
              <p className="text-gray-400 text-center py-8">
                No stories yet. Add your first one!
              </p>
            )}

            {stories.map((story, index) => (
              <div
                key={story.id}
                className={`cursor-pointer rounded-md overflow-hidden ${
                  selectedStory?.id === story.id
                    ? "ring-2 ring-blue-500 w-fit"
                    : ""
                }`}
                onClick={() => handleStorySelect(story, index)}
              >
                <img
                  src={story.image}
                  alt={story.caption}
                  className="w-[180px] h-[250px] object-cover p-2"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          {selectedStory ? (
            <div
              className="bg-gray-900 shadow-lg rounded-lg overflow-hidden max-w-2xl w-full relative"
              onMouseEnter={() => handleStoryHover(true)}
              onMouseLeave={() => handleStoryHover(false)}
            >
              {/* Progress bar at the top */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700">
                <div
                  className="h-full bg-white"
                  style={{ width: `${storyProgress}%` }}
                ></div>
              </div>

              {/* Navigation buttons */}
              <div className="absolute inset-0 flex">
                <div
                  className="w-1/2 h-full cursor-pointer z-10"
                  onClick={goToPreviousStory}
                  title="Previous story"
                ></div>
                <div
                  className="w-1/2 h-full cursor-pointer z-10"
                  onClick={goToNextStory}
                  title="Next story"
                ></div>
              </div>

              <div className="relative">
                <img
                  src={selectedStory.image}
                  alt={selectedStory.caption}
                  className="w-[557px] h-[637px] object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
                  <p className="text-lg font-semibold">
                    {selectedStory.caption}
                  </p>
                  <p className="text-sm opacity-80">{selectedStory.hashtag}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {new Date(selectedStory.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400">Select a story or add a new one</div>
          )}
        </div>

        {/* Add Story Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Add New Story
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-white"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Error message display */}
                {uploadError && (
                  <div
                    className="bg-red-500 bg-opacity-20 border border-red-400 text-red-100 px-4 py-3 rounded relative"
                    role="alert"
                  >
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{uploadError}</span>
                  </div>
                )}

                {/* Image Upload */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Choose Image
                  </label>

                  {previewUrl ? (
                    <div className="relative mb-2">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-md"
                      />
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                        className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 rounded-full p-1 text-white hover:bg-opacity-100"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
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
                  ) : (
                    <div
                      className="border-2 border-dashed border-gray-600 rounded-md p-6 text-center cursor-pointer hover:border-gray-400"
                      onClick={() =>
                        document.getElementById("story-image-input").click()
                      }
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="mt-1 text-sm text-gray-400">
                        Click to upload an image
                      </p>
                    </div>
                  )}

                  <input
                    id="story-image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Caption Input */}
                <div>
                  <label
                    htmlFor="caption"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Caption
                  </label>
                  <input
                    type="text"
                    id="caption"
                    value={storyCaption}
                    onChange={(e) => setStoryCaption(e.target.value)}
                    className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    placeholder="Enter a caption for your story"
                    required
                  />
                </div>

                {/* Hashtag Input */}
                <div>
                  <label
                    htmlFor="hashtag"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Hashtag
                  </label>
                  <input
                    type="text"
                    id="hashtag"
                    value={storyHashtag}
                    onChange={(e) => setStoryHashtag(e.target.value)}
                    className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    placeholder="Enter a hashtag (e.g. #adventure)"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    onClick={uploadStoryToSupabase}
                    disabled={!selectedFile || !storyCaption || isUploading}
                    className={`px-4 py-2 text-white rounded-md ${
                      !selectedFile || !storyCaption || isUploading
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isUploading ? "Uploading..." : "Add Story"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Stories;
