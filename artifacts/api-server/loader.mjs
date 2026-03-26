import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Change to workspace root so dotenv can find .env
// loader.mjs is at: workspace/artifacts/api-server/loader.mjs
// We need to go up 2 levels to reach workspace root
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDir, "../../");
process.chdir(workspaceRoot);

// Load environment variables before importing the app
dotenv.config();

// Now import the main app
await import("./dist/index.mjs");




