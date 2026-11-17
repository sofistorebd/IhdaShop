import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import swc from "next/dist/build/swc/index.js";

const require = createRequire(import.meta.url);
await swc.loadBindings();

export async function loadModule(file, mocks = {}, globals = {}) {
  const source = await readFile(new URL("../../" + file, import.meta.url), "utf8");
  const { code } = await swc.transform(source, {
    filename: file,
    jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } } },
    module: { type: "commonjs" },
  });
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
    process: { env: { ENCRYPTION_KEY: "isolated-test-secret", DATABASE_URL: "postgres://isolated" } },
    console: { error() {}, log() {} }, Buffer, URL, URLSearchParams,
    Response, Request, Headers, AbortSignal, TextEncoder, fetch,
    setTimeout, clearTimeout, setInterval, clearInterval, ...globals,
  });
  return module.exports;
}
