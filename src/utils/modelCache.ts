// OPFS utilities for caching models on Quest and other platforms
// where blob URLs may not work reliably

// Check if we're running on Quest/Android WebVR where blob URLs might fail
export const isQuestOrAndroid = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes("quest") ||
    userAgent.includes("android") ||
    userAgent.includes("oculus")
  );
};

// Process file and return appropriate URL based on platform
export const processModelFile = async (
  file: File
): Promise<{ url: string; filename: string }> => {
  const filename = file.name;

  if (isQuestOrAndroid()) {
    // Check if OPFS is available
    if (!('storage' in navigator) || !('getDirectory' in navigator.storage)) {
      throw new Error('OPFS not supported');
    }

    const arrayBuffer = await file.arrayBuffer();

    // Store in OPFS
    const opfsRoot = await navigator.storage.getDirectory();
    const fileHandle = await opfsRoot.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(arrayBuffer);
    await writable.close();

    // Get file from OPFS and convert to data URL
    const opfsFile = await fileHandle.getFile();
    const opfsArrayBuffer = await opfsFile.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(opfsArrayBuffer)));
    const dataUrl = `data:${file.type || 'application/octet-stream'};base64,${base64}`;
    
    return { url: dataUrl, filename };
  } else {
    // Use traditional blob URL for desktop
    return {
      url: URL.createObjectURL(file),
      filename,
    };
  }
};
