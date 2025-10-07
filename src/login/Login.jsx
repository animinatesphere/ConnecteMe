import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { supabase } from "../../supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  async function checkUserExists(email) {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error && error.message.includes("User not found")) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking user:", error);
      return false;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotification("");
    setLoading(true);

    try {
      const { error } = await signIn({ email, password });

      if (error) {
        if (
          error.message.includes("Invalid login credentials") ||
          error.message.includes("User not found")
        ) {
          setNotification(
            "This email doesn't seem to be registered. Would you like to create an account? or confirm your email?"
          );
        } else {
          setError(error.message);
        }
        return;
      }

      navigate("/dashboard");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <svg
            width="240"
            height="32"
            viewBox="0 0 225 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto mb-6"
          >
            <path
              d="M37.2652 14.793C37.2652 14.793 45.0769 20.3653 41.9523 29.531C41.9523 29.531 41.3794 31.1975 39.0359 34.4264L42.473 37.9677C42.473 37.9677 43.3063 39.4779 41.5877 39.9987H24.9228C24.9228 39.9987 19.6108 40.155 14.8196 36.9782C14.8196 36.9782 12.1637 35.2075 9.76807 31.9787L18.6213 32.0308C18.6213 32.0308 24.2978 31.9787 29.766 28.3332C35.2342 24.6878 37.4215 18.6988 37.2652 14.793Z"
              fill="#3B82F6"
            />
            <path
              d="M34.5053 12.814C32.2659 1.04441 19.3506 0.0549276 19.3506 0.0549276C8.31004 -0.674164 3.31055 6.09597 3.31055 6.09597C-4.24076 15.2617 3.6751 23.6983 3.6751 23.6983C3.6751 23.6983 2.99808 24.6357 0.862884 26.5105C-1.27231 28.3854 1.22743 29.3748 1.22743 29.3748H17.3404C23.4543 28.7499 25.9124 27.3959 25.9124 27.3959C36.328 22.0318 34.5053 12.814 34.5053 12.814ZM19.9963 18.7301H9.16412C8.41419 18.7301 7.81009 18.126 7.81009 17.3761C7.81009 16.6261 8.41419 16.022 9.16412 16.022H19.9963C20.7463 16.022 21.3504 16.6261 21.3504 17.3761C21.3504 18.126 20.7358 18.7301 19.9963 18.7301ZM25.3708 13.314H9.12245C8.37253 13.314 7.76843 12.7099 7.76843 11.96C7.76843 11.21 8.37253 10.6059 9.12245 10.6059H25.3708C26.1207 10.6059 26.7248 11.21 26.7248 11.96C26.7248 12.7099 26.1103 13.314 25.3708 13.314Z"
              fill="#1E40AF"
            />
            <path
              d="M61.98 20.2C61.98 18.2773 62.4093 16.56 63.268 15.048C64.1453 13.5173 65.3307 12.332 66.824 11.492C68.336 10.6333 70.0253 10.204 71.892 10.204C74.076 10.204 75.9893 10.764 77.632 11.884C79.2747 13.004 80.4227 14.5533 81.076 16.532H76.568C76.12 15.5987 75.4853 14.8987 74.664 14.432C73.8613 13.9653 72.928 13.732 71.864 13.732C70.7253 13.732 69.708 14.0027 68.812 14.544C67.9347 15.0667 67.244 15.8133 66.74 16.784C66.2547 17.7547 66.012 18.8933 66.012 20.2C66.012 21.488 66.2547 22.6267 66.74 23.616C67.244 24.5867 67.9347 25.3427 68.812 25.884C69.708 26.4067 70.7253 26.668 71.864 26.668C72.928 26.668 73.8613 26.4347 74.664 25.968C75.4853 25.4827 76.12 24.7733 76.568 23.84H81.076C80.4227 25.8373 79.2747 27.396 77.632 28.516C76.008 29.6173 74.0947 30.168 71.892 30.168C70.0253 30.168 68.336 29.748 66.824 28.908C65.3307 28.0493 64.1453 26.864 63.268 25.352C62.4093 23.84 61.98 22.1227 61.98 20.2ZM91.3122 30.252C89.8189 30.252 88.4749 29.9253 87.2802 29.272C86.0855 28.6 85.1429 27.6573 84.4522 26.444C83.7802 25.2307 83.4442 23.8307 83.4442 22.244C83.4442 20.6573 83.7895 19.2573 84.4802 18.044C85.1895 16.8307 86.1509 15.8973 87.3642 15.244C88.5775 14.572 89.9309 14.236 91.4242 14.236C92.9175 14.236 94.2709 14.572 95.4842 15.244C96.6975 15.8973 97.6495 16.8307 98.3402 18.044C99.0495 19.2573 99.4042 20.6573 99.4042 22.244C99.4042 23.8307 99.0402 25.2307 98.3122 26.444C97.6029 27.6573 96.6322 28.6 95.4002 29.272C94.1869 29.9253 92.8242 30.252 91.3122 30.252ZM91.3122 26.836C92.0215 26.836 92.6842 26.668 93.3002 26.332C93.9349 25.9773 94.4389 25.4547 94.8122 24.764C95.1855 24.0733 95.3722 23.2333 95.3722 22.244C95.3722 20.7693 94.9802 19.64 94.1962 18.856C93.4309 18.0533 92.4882 17.652 91.3682 17.652C90.2482 17.652 89.3055 18.0533 88.5402 18.856C87.7935 19.64 87.4202 20.7693 87.4202 22.244C87.4202 23.7187 87.7842 24.8573 88.5122 25.66C89.2589 26.444 90.1922 26.836 91.3122 26.836ZM110.876 14.264C112.724 14.264 114.217 14.852 115.356 16.028C116.494 17.1853 117.064 18.8093 117.064 20.9V30H113.144V21.432C113.144 20.2 112.836 19.2573 112.22 18.604C111.604 17.932 110.764 17.596 109.7 17.596C108.617 17.596 107.758 17.932 107.124 18.604C106.508 19.2573 106.2 20.2 106.2 21.432V30H102.28V14.488H106.2V16.42C106.722 15.748 107.385 15.2253 108.188 14.852C109.009 14.46 109.905 14.264 110.876 14.264ZM129.387 14.264C131.235 14.264 132.729 14.852 133.867 16.028C135.006 17.1853 135.575 18.8093 135.575 20.9V30H131.655V21.432C131.655 20.2 131.347 19.2573 130.731 18.604C130.115 17.932 129.275 17.596 128.211 17.596C127.129 17.596 126.27 17.932 125.635 18.604C125.019 19.2573 124.711 20.2 124.711 21.432V30H120.791V14.488H124.711V16.42C125.234 15.748 125.897 15.2253 126.699 14.852C127.521 14.46 128.417 14.264 129.387 14.264ZM153.723 21.908C153.723 22.468 153.686 22.972 153.611 23.42H142.271C142.364 24.54 142.756 25.4173 143.447 26.052C144.138 26.6867 144.987 27.004 145.995 27.004C147.451 27.004 148.487 26.3787 149.103 25.128H153.331C152.883 26.6213 152.024 27.8533 150.755 28.824C149.486 29.776 147.927 30.252 146.079 30.252C144.586 30.252 143.242 29.9253 142.047 29.272C140.871 28.6 139.947 27.6573 139.275 26.444C138.622 25.2307 138.295 23.8307 138.295 22.244C138.295 20.6387 138.622 19.2293 139.275 18.016C139.928 16.8027 140.843 15.8693 142.019 15.216C143.195 14.5627 144.548 14.236 146.079 14.236C147.554 14.236 148.87 14.5533 150.027 15.188C151.203 15.8227 152.108 16.728 152.743 17.904C153.396 19.0613 153.723 20.396 153.723 21.908ZM149.663 20.788C149.644 19.78 149.28 18.9773 148.571 18.38C147.862 17.764 146.994 17.456 145.967 17.456C144.996 17.456 144.175 17.7547 143.503 18.352C142.85 18.9307 142.448 19.7427 142.299 20.788H149.663ZM155.576 22.244C155.576 20.6387 155.903 19.2387 156.556 18.044C157.21 16.8307 158.115 15.8973 159.272 15.244C160.43 14.572 161.755 14.236 163.248 14.236C165.171 14.236 166.758 14.7213 168.008 15.692C169.278 16.644 170.127 17.988 170.556 19.724H166.328C166.104 19.052 165.722 18.5293 165.18 18.156C164.658 17.764 164.004 17.568 163.22 17.568C162.1 17.568 161.214 17.9787 160.56 18.8C159.907 19.6027 159.58 20.7507 159.58 22.244C159.58 23.7187 159.907 24.8667 160.56 25.688C161.214 26.4907 162.1 26.892 163.22 26.892C164.807 26.892 165.843 26.1827 166.328 24.764H170.556C170.127 26.444 169.278 27.7787 168.008 28.768C166.739 29.7573 165.152 30.252 163.248 30.252C161.755 30.252 160.43 29.9253 159.272 29.272C158.115 28.6 157.21 27.6667 156.556 26.472C155.903 25.2587 155.576 23.8493 155.576 22.244ZM177.992 17.708V25.212C177.992 25.7347 178.113 26.1173 178.356 26.36C178.617 26.584 179.047 26.696 179.644 26.696H181.464V30H179C175.696 30 174.044 28.3947 174.044 25.184V17.708H172.196V14.488H174.044V10.652H177.992V14.488H181.464V17.708H177.992ZM205.592 10.456V30H201.672V17.288L196.436 30H193.468L188.204 17.288V30H184.284V10.456H188.736L194.952 24.988L201.168 10.456H205.592ZM223.887 21.908C223.887 22.468 223.85 22.972 223.775 23.42H212.435C212.528 24.54 212.92 25.4173 213.611 26.052C214.302 26.6867 215.151 27.004 216.159 27.004C217.615 27.004 218.651 26.3787 219.267 25.128H223.495C223.047 26.6213 222.188 27.8533 220.919 28.824C219.65 29.776 218.091 30.252 216.243 30.252C214.75 30.252 213.406 29.9253 212.211 29.272C211.035 28.6 210.111 27.6573 209.439 26.444C208.786 25.2307 208.459 23.8307 208.459 22.244C208.459 20.6387 208.786 19.2293 209.439 18.016C210.092 16.8027 211.007 15.8693 212.183 15.216C213.359 14.5627 214.712 14.236 216.243 14.236C217.718 14.236 219.034 14.5533 220.191 15.188C221.367 15.8227 222.272 16.728 222.907 17.904C223.56 19.0613 223.887 20.396 223.887 21.908ZM219.827 20.788C219.808 19.78 219.444 18.9773 218.735 18.38C218.026 17.764 217.158 17.456 216.131 17.456C215.16 17.456 214.339 17.7547 213.667 18.352C213.014 18.9307 212.612 19.7427 212.463 20.788H219.827Z"
              fill="#1E293B"
            />
          </svg>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Welcome Back
          </h2>
          <p className="text-slate-500">Sign in to continue to your account</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8">
            {/* Notification */}
            {notification && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-blue-800">{notification}</p>
                    <Link
                      to="/register"
                      className="inline-block mt-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Create an account →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-red-800 flex-1">{error}</p>
                </div>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email-address"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="youremail@example.com"
                />
              </div>

              {/* Password Field */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed pr-12"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-500 font-medium">
                    Or continue with
                  </span>
                </div>
              </div>
            </div>

            {/* Social Login */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={loading}
                className="flex items-center justify-center px-4 py-3 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                </svg>
                Google
              </button>

              <button
                type="button"
                disabled={loading}
                className="flex items-center justify-center px-4 py-3 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>
            </div>
          </div>
        </div>

        {/* Sign Up Link */}
        <div className="mt-6 text-center">
          <p className="text-slate-600">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
