import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const packageJsonPath = path.join(ROOT, "package.json");
const serverJsonPath = path.join(ROOT, "server.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const packageJson = readJson(packageJsonPath);
const serverJson = readJson(serverJsonPath);

const errors = [];
const packageVersion = packageJson.version;
const packageName = packageJson.name;
const mcpName = packageJson.mcpName;

if (!packageVersion) {
  errors.push("package.json is missing version.");
}

if (!packageName) {
  errors.push("package.json is missing name.");
}

if (serverJson.version !== packageVersion) {
  errors.push(
    `Version mismatch: package.json=${packageVersion} but server.json=${serverJson.version}.`,
  );
}

if (serverJson.name && mcpName && serverJson.name !== mcpName) {
  errors.push(
    `MCP name mismatch: package.json mcpName=${mcpName} but server.json name=${serverJson.name}.`,
  );
}

if (!Array.isArray(serverJson.packages) || serverJson.packages.length === 0) {
  errors.push("server.json must include at least one package entry.");
} else {
  const npmPkg = serverJson.packages.find((pkg) => pkg.registryType === "npm");
  if (!npmPkg) {
    errors.push("server.json must include an npm package entry.");
  } else {
    if (npmPkg.identifier !== packageName) {
      errors.push(
        `Package identifier mismatch: server.json npm identifier=${npmPkg.identifier} but package.json name=${packageName}.`,
      );
    }
    if (npmPkg.version !== packageVersion) {
      errors.push(
        `Package version mismatch: server.json npm version=${npmPkg.version} but package.json version=${packageVersion}.`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error("Manifest validation failed:");
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
}

console.log("Manifest validation passed.");
