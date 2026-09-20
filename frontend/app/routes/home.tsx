import { redirect } from "react-router";

// The index route has no content of its own; send visitors to the login
// page (which forwards signed-in users to their home page).
export function loader() {
  return redirect("/login");
}

export default function Home() {
  return null;
}
