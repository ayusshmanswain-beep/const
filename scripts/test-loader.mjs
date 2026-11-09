import { pathToFileURL } from "node:url";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

export async function resolve(specifier, context, defaultResolve) {
  let candidate = null;

  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    const abs = join(process.cwd(), "src", rel);
    for (const ext of ["", ".ts", ".js", "/index.ts", "/index.js"]) {
      const c = abs + ext;
      if (existsSync(c) && statSync(c).isFile()) {
        candidate = c;
        break;
      }
    }
  } else if (specifier.startsWith(".") && context.parentURL) {
    const parentPath = new URL(context.parentURL).pathname;
    const dir = parentPath.substring(0, parentPath.lastIndexOf("/"));
    const normalizedDir = process.platform === "win32" && dir.startsWith("/") ? dir.slice(1) : dir;

    for (const ext of ["", ".ts", ".js", "/index.ts", "/index.js"]) {
      const c = join(normalizedDir, specifier + ext);
      if (existsSync(c) && statSync(c).isFile()) {
        candidate = c;
        break;
      }
    }
  }

  if (candidate) {
    return defaultResolve(pathToFileURL(candidate).href, context);
  }

  return defaultResolve(specifier, context);
}
