// Save every selected original before starting any optional QR scan. A decoder
// failure or cancellation must never prevent later originals from being kept.
export async function saveOriginalBatch(files, save, onProgress = () => {}) {
  if (files.length > 20 || files.reduce((sum, file) => sum + file.size, 0) > 45 * 1024 * 1024) {
    throw Error('Choose up to 20 original pages totaling 45 MB at a time. Nothing from this selection was saved.');
  }
  const results = [];
  for (const [index, file] of files.entries()) {
    onProgress(index + 1, files.length);
    try { results.push({ file, document: await save(file) }); }
    catch (error) { results.push({ file, error: error?.message || 'Could not save this original. Try again.' }); }
  }
  return results;
}

export function originalBatchSummary(results) {
  const saved = results.filter(result => result.document).length;
  const failed = results.filter(result => !result.document);
  return `${saved} of ${results.length} original file(s) saved on this device.` +
    (failed.length ? '\nNOT SAVED — choose these files again:\n' + failed.map(result => `${result.file.name}: ${result.error}`).join('\n') : '') +
    (saved > 1 ? '\nScan each saved original below. All selected pages belong to this one state permit.' : '');
}
