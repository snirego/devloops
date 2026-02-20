const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_, name) => {
      const localPath = path.resolve(projectRoot, "node_modules", String(name));
      try {
        require.resolve(localPath);
        return localPath;
      } catch {
        return path.resolve(monorepoRoot, "node_modules", String(name));
      }
    },
  },
);

config.resolver.disableHierarchicalLookup = true;

module.exports = config;
