import type { ChildProcess } from 'child_process';

export type ActiveDownloadHandle = {
  cancel: () => void;
  process: ChildProcess;
};

const activeDownloads = new Map<string, ActiveDownloadHandle>();

export function setActiveDownload(id: string, handle: ActiveDownloadHandle): void {
  activeDownloads.set(id, handle);
}

export function clearActiveDownload(id: string): void {
  activeDownloads.delete(id);
}

export function getActiveDownload(id: string): ActiveDownloadHandle | undefined {
  return activeDownloads.get(id);
}
