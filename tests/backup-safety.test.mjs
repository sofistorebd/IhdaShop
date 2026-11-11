import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import swc from "next/dist/build/swc/index.js";

const require = createRequire(import.meta.url);
await swc.loadBindings();

async function loadModule(relativePath, mocks = {}, globals = {}) {
  const source = await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
  const { code } = await swc.transform(source, {
    filename: relativePath,
    jsc: { parser: { syntax: "ecmascript", jsx: relativePath.endsWith("jsx") } },
    module: { type: "commonjs" },
  });
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
    console,
    process: globals.process || process,
    Buffer,
    URL,
    URLSearchParams,
    Response,
    fetch: globals.fetch || fetch,
    setTimeout,
    clearTimeout,
  });
  return module.exports;
}

function adminRequest({ cookie = "valid-token", origin = "https://shop.test", action = "google-drive-backup" } = {}) {
  return {
    url: "https://shop.test/api/admin/google-drive/run",
    cookies: { get: () => cookie ? { value: cookie } : undefined },
    headers: new Headers({ origin, "x-admin-action": action }),
  };
}

test("backup admin routes require a valid session and same-origin action", async () => {
  const auth = await loadModule("lib/admin-request.js", {
    "./auth": { ADMIN_COOKIE: "store_admin", sessionToken: async () => "valid-token" },
  });
  assert.equal(await auth.authorizeAdminRequest(adminRequest(), { mutation: true }), null);
  assert.equal((await auth.authorizeAdminRequest(adminRequest({ cookie: "wrong" }))).status, 401);
  assert.equal((await auth.authorizeAdminRequest(adminRequest({ origin: "https://attacker.test" }), { mutation: true })).status, 403);
  assert.equal((await auth.authorizeAdminRequest(adminRequest({ action: "" }), { mutation: true })).status, 403);
});

function serviceMocks({ verificationFails = false } = {}) {
  const events = [];
  return {
    events,
    mocks: {
      "./backup-artifact": {
        createBackupArtifact: async () => {
          events.push("artifact");
          return { filePath: "/tmp/backup", fileName: "backup.enc", size: 100, md5: "abc", cleanup: async () => events.push("cleanup") };
        },
      },
      "./backup-db": {
        backupServerConfig: () => ({ database: true, googleOAuth: true, encryption: true }),
        claimBackup: async () => ({ refreshToken: "refresh", folderId: "folder" }),
        finishBackupFailure: async () => events.push("failure"),
        finishBackupSuccess: async () => events.push("success"),
      },
      "./google-drive": {
        refreshGoogleAccessToken: async () => "access",
        ensureBackupFolder: async () => "folder",
        uploadBackupFile: async () => { events.push("upload"); return { id: "new" }; },
        verifyDriveFile: async () => {
          events.push("verify");
          if (verificationFails) throw new Error("verification failed");
          return { id: "new", name: "backup.enc", size: "100", md5Checksum: "abc" };
        },
        enforceSevenBackupRetention: async () => { events.push("retention"); return { retainedCount: 7 }; },
      },
    },
  };
}

test("old backups are cleaned only after the new upload is verified", async () => {
  const setup = serviceMocks();
  const service = await loadModule("lib/backup-service.js", setup.mocks);
  const result = await service.runGoogleDriveBackup({ force: true });
  assert.equal(result.ok, true);
  assert.ok(setup.events.indexOf("verify") < setup.events.indexOf("retention"));
  assert.ok(setup.events.indexOf("retention") < setup.events.indexOf("success"));
  assert.equal(setup.events.at(-1), "cleanup");
});

test("failed upload verification never invokes retention", async () => {
  const setup = serviceMocks({ verificationFails: true });
  const service = await loadModule("lib/backup-service.js", setup.mocks);
  await assert.rejects(service.runGoogleDriveBackup({ force: true }), /verification failed/);
  assert.equal(setup.events.includes("retention"), false);
  assert.equal(setup.events.includes("success"), false);
  assert.equal(setup.events.includes("failure"), true);
  assert.equal(setup.events.at(-1), "cleanup");
});

test("Drive retention keeps seven newest files and deletes only older files", async () => {
  const deleted = [];
  const files = Array.from({ length: 9 }, (_, index) => ({ id: `file-${index + 1}` }));
  const fakeFetch = async (url, options = {}) => {
    if (options.method === "DELETE") {
      deleted.push(String(url).split("/").at(-1));
      return { ok: true, status: 204, json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => ({ files }) };
  };
  const drive = await loadModule("lib/google-drive.js", {}, { fetch: fakeFetch });
  const result = await drive.enforceSevenBackupRetention({ accessToken: "access", folderId: "folder" });
  assert.deepEqual(deleted, ["file-8", "file-9"]);
  assert.equal(result.retainedCount, 7);
  assert.equal(result.deleted, 2);
});

test("Google authorization asks for offline per-file Drive access", async () => {
  const fakeProcess = { env: { GOOGLE_CLIENT_ID: "client", GOOGLE_CLIENT_SECRET: "secret" } };
  const drive = await loadModule("lib/google-drive.js", {}, { process: fakeProcess });
  const url = new URL(drive.googleAuthorizationUrl({ state: "state", redirectUri: "https://shop.test/callback" }));
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("prompt"), "consent");
  assert.match(url.searchParams.get("scope"), /drive\.file/);
  assert.equal(url.searchParams.get("state"), "state");
});

test("backup encryption round-trips and hides plaintext", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ihda-encryption-test-"));
  const source = path.join(root, "source.bin");
  const encrypted = path.join(root, "backup.enc");
  const restored = path.join(root, "restored.bin");
  const plaintext = Buffer.from("private customer and order data\n".repeat(100));
  const fakeProcess = { ...process, env: { ...process.env, BACKUP_ENCRYPTION_KEY: "test-only-strong-key" } };
  try {
    await writeFile(source, plaintext);
    const artifact = await loadModule("lib/backup-artifact.js", {
      "./db": { getConnectionString: () => "" },
    }, { process: fakeProcess });
    await artifact.encryptBackupFile(source, encrypted);
    assert.equal((await readFile(encrypted)).includes(plaintext.subarray(0, 30)), false);
    await artifact.decryptBackupFile(encrypted, restored);
    assert.deepEqual(await readFile(restored), plaintext);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
