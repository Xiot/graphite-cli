import rmtree from "./rmtree";
import fs from "fs";
import os from "os";
import path from "path";
import { unwrap } from "@withgraphite/gti-shared/utils";

export type ExistingServerInfo = {
  sensitiveToken: string;
  challengeToken: string;
  logFileLocation: string;
  /** Which command name was used to launch this server instance,
   * so it can be propagated to run further gt commands by the server.
   * Usually, "gt". */
  command: string;
  /**
   * `gt version` string. If the version of gt changes, we shouldn't re-use that server instance,
   * due to potential incompatibilities between the old running server javascript and the new client javascript.
   */
  gtVersion: string;
};

const cacheDir =
  process.platform == "win32"
    ? path.join(unwrap(process.env.LOCALAPPDATA), "cache")
    : process.platform == "darwin"
    ? path.join(os.homedir(), "Library/Caches")
    : process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");

/**
 * Per-user cache dir with restrictive permissions.
 * Inside this folder will be a number of files, one per port for an active GTI server.
 */
const savedActiveServerUrlsDirectory = path.join(cacheDir, "graphite-gti");

function fileNameForPort(port: number): string {
  return `reusable_server_${port}`;
}

function isMode700(stat: fs.Stats): boolean {
  // eslint-disable-next-line no-bitwise
  return (stat.mode & 0o777) === 0o700;
}

/**
 * Make a temp directory with restrictive permissions where we can write existing server information.
 * Ensures directory has proper restrictive mode if the directory already exists.
 */
export async function ensureExistingServerFolder(): Promise<void> {
  await fs.promises.mkdir(savedActiveServerUrlsDirectory, {
    // directory needs rwx
    mode: 0o700,
    recursive: true,
  });

  const stat = await fs.promises.stat(savedActiveServerUrlsDirectory);
  if (process.platform !== "win32" && !isMode700(stat)) {
    throw new Error(
      `active servers folder ${savedActiveServerUrlsDirectory} has the wrong permissions: ${stat.mode}`
    );
  }
  if (stat.isSymbolicLink()) {
    throw new Error(
      `active servers folder ${savedActiveServerUrlsDirectory} is a symlink`
    );
  }
}

export function deleteExistingServerFile(port: number): Promise<void> {
  const folder = path.join(
    savedActiveServerUrlsDirectory,
    fileNameForPort(port)
  );
  if (typeof fs.promises.rm === "function") {
    return fs.promises.rm(folder, { force: true });
  } else {
    return rmtree(folder);
  }
}

export async function writeExistingServerFile(
  port: number,
  data: ExistingServerInfo
): Promise<void> {
  await fs.promises.writeFile(
    path.join(savedActiveServerUrlsDirectory, fileNameForPort(port)),
    JSON.stringify(data),
    { encoding: "utf-8", flag: "w", mode: 0o600 }
  );
}

export async function readExistingServerFile(
  port: number
): Promise<ExistingServerInfo> {
  // TODO: do we need to verify the permissions of this file?
  const data: string = await fs.promises.readFile(
    path.join(savedActiveServerUrlsDirectory, fileNameForPort(port)),
    { encoding: "utf-8", flag: "r" }
  );
  return JSON.parse(data) as ExistingServerInfo;
}
