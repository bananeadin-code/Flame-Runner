import { useEffect, useState } from "react";

function read() {
  const [path, search = ""] = window.location.hash.replace(/^#\/?/, "").split("?");
  return { route: path || "inicio", query: Object.fromEntries(new URLSearchParams(search)) };
}

export function useRoute() {
  const [location, setLocation] = useState(read);
  useEffect(() => {
    const onChange = () => {
      setLocation(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return location;
}

export function href(route, query) {
  const search = query ? new URLSearchParams(Object.entries(query).filter(([, v]) => v)).toString() : "";
  return `#/${route}${search ? `?${search}` : ""}`;
}
