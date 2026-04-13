import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  layout("routes/protected/layout.tsx", [
    route("dashboard", "routes/protected/dashboard.tsx"),
    route("admins", "routes/protected/admins.tsx"),
  ]),
] satisfies RouteConfig;
