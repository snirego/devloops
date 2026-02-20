const fs = require("fs");
const path = require("path");

const nodeModules = path.join(__dirname, "..", "node_modules");

const metroPackages = [
  "metro",
  "metro-babel-transformer",
  "metro-cache",
  "metro-cache-key",
  "metro-config",
  "metro-core",
  "metro-file-map",
  "metro-minify-terser",
  "metro-resolver",
  "metro-runtime",
  "metro-source-map",
  "metro-symbolicate",
  "metro-transform-plugins",
  "metro-transform-worker",
];

let patched = 0;
for (const name of metroPackages) {
  const pkgPath = path.join(nodeModules, name, "package.json");
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg.exports && !pkg.exports["./src/*"]) {
      pkg.exports["./src/*"] = "./src/*.js";
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
      patched++;
    }
  } catch {
    // package may not be installed
  }
}

if (patched > 0) {
  console.log(`Patched exports in ${patched} metro package(s)`);
}
