import { app } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import type { OBSBackup, OBSSettingsSnapshot } from '../shared/types';
import { validateOBSBackup } from '../shared/validation';

export function getBackupPath(): string {
  return path.join(app.getPath('userData'), 'obsrec-backup.json');
}

function sanitizeSnapshot(snapshot: OBSSettingsSnapshot): OBSSettingsSnapshot {
  return {
    streamServer: snapshot.streamServer,
    baseResolution: snapshot.baseResolution,
    outputResolution: snapshot.outputResolution,
    fps: snapshot.fps,
    encoder: snapshot.encoder,
    bitrate: snapshot.bitrate,
    audioBitrate: snapshot.audioBitrate,
    recordingFormat: snapshot.recordingFormat,
    recordingQuality: snapshot.recordingQuality,
    audio: snapshot.audio,
  };
}

export async function saveBackup(snapshot: OBSSettingsSnapshot): Promise<void> {
  const backup: OBSBackup = {
    createdAt: new Date().toISOString(),
    appliedByObsrec: true,
    snapshot: sanitizeSnapshot(snapshot),
  };

  await fs.mkdir(path.dirname(getBackupPath()), { recursive: true });
  await fs.writeFile(getBackupPath(), JSON.stringify(backup, null, 2), 'utf8');
}

export async function loadBackup(): Promise<OBSBackup | null> {
  try {
    const content = await fs.readFile(getBackupPath(), 'utf8');
    const parsed: unknown = JSON.parse(content);
    const validation = validateOBSBackup(parsed);
    return validation.success ? validation.value : null;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    return null;
  }
}
