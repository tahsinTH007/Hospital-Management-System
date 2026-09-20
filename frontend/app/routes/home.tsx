import { redirect } from "react-router";

// The index route has no content of its own. The protected layout sends
// visitors without a session on to the login page (never in demo mode, where
// everyone is signed in automatically).
export function loader() {
  return redirect("/dashboard");
}

export default function Home() {
  return null;
}
