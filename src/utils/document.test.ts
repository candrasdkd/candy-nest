import { describe, expect, it } from 'vitest';
import { getFileType, isEnvFile, validateDocFile } from './document';

describe('document file utilities', () => {
  it('mengenali variasi nama file environment meski MIME kosong', () => {
    const envFile = new File(['API_KEY=secret'], ['.env'].join(''), { type: '' });
    const localEnvFile = new File(['API_URL=test'], '.env.local', { type: 'text/plain' });
    const namedEnvFile = new File(['NODE_ENV=test'], 'app.env', { type: 'text/plain' });

    expect(isEnvFile(envFile)).toBe(true);
    expect(isEnvFile(localEnvFile)).toBe(true);
    expect(isEnvFile(namedEnvFile)).toBe(true);
    expect(getFileType(envFile.type, envFile.name)).toBe('env');
    expect(validateDocFile(envFile)).toBeNull();
    expect(validateDocFile(localEnvFile)).toBeNull();
  });

  it('tidak mengizinkan file teks biasa yang bukan ENV', () => {
    const textFile = new File(['catatan'], 'catatan.txt', { type: 'text/plain' });
    expect(isEnvFile(textFile)).toBe(false);
    expect(validateDocFile(textFile)).toContain('tidak didukung');
  });
});
