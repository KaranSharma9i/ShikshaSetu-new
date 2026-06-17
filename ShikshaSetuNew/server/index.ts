import "./config";
import express from "express";
import cors from "cors";
import path from "path";
import homeworkRoutes from "./routes/homework";
import studentHomeworkRoutes from "./routes/studentHomework";
import registrationRoutes from "./routes/registration";

const app = express();
const PORT = Number(process.env.PORT || process.env.SERVER_PORT || 3001);

app.use(cors({ origin: "*" })); // tighten in production
app.use(express.json({ limit: "10mb" }));

// Static asset serving for local PDF generator
app.use("/assets", express.static(path.join(process.cwd(), "server/assets")));
app.use("/katex", express.static(path.join(path.dirname(require.resolve("katex/package.json")), "dist")));

app.get("/health", (_, res) => res.json({ status: "ok", service: "margam-server" }));
app.use("/api/teacher", homeworkRoutes);
app.use("/api", studentHomeworkRoutes);
app.use("/api", registrationRoutes);

app.listen(PORT,'0.0.0.0', () => {
  console.log(`Margam server running on port ${PORT}`);
});

export default app;
