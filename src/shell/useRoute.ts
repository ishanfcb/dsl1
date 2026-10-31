// Pages live in the URL hash: #map, #junction/J1, #junction/J2 (#junction alone is J1), #debug.
import { useEffect, useState } from "react";
import { JUNCTIONS, type JunctionId } from "../engine";

export type Route = { page: "map" } | { page: "junction"; junction: JunctionId } | { page: "debug" };

export function parseRoute(hash: string): Route {
  const [page, arg] = hash.replace(/^#/, "").split("/");
  if (page === "debug") return { page: "debug" };
  if (page === "junction") {
    const j = JUNCTIONS.find((id) => id.toLowerCase() === arg?.toLowerCase());
    return { page: "junction", junction: j ?? "J1" };
  }
  return { page: "map" };
}

export function hrefOf(route: Route): string {
  return route.page === "junction" ? `#junction/${route.junction}` : `#${route.page}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}
