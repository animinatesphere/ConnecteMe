import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://iogwhfgdxivisgmiltjt.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvZ3doZmdkeGl2aXNnbWlsdGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMjAxNDksImV4cCI6MjA2MDg5NjE0OX0.OJbogyrOXEJT8UcXBArw6eCIKeDhCNlDQKhG66xlFd0";

export const supabase = createClient(supabaseUrl, supabaseKey);
