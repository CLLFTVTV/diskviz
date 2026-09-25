import { type RouteConfig, route, index, layout } from "@react-router/dev/routes";

export default [
  index("./routes/home.tsx"),
  route("scan", "./routes/scan.tsx"),
  layout("./routes/results.tsx", [
    route("results/:id", "./routes/results.overview.tsx"),
    route("results/:id/files", "./routes/results.files.tsx"),
    route("results/:id/duplicates", "./routes/results.duplicates.tsx"),
    route("results/:id/large-files", "./routes/results.large-files.tsx"),
  ]),
] satisfies RouteConfig;
