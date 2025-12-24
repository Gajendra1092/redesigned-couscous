const BACKEND_URL = "http://localhost:5000";

async function upload() {
  const fileInput = document.getElementById("fileInput");
  const log = document.getElementById("log");

  if (!fileInput.files.length) {
    log.innerText = "No file selected";
    return;
  }

  const file = fileInput.files[0];
  log.innerText = "Initializing upload...\n";

  // STEP 1: Call init-upload
  const initRes = await fetch(`${BACKEND_URL}/api/v1/video/init-upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
    }),
  });

  const { uploadUrl, videoId, filePath } = await initRes.json();

  log.innerText += "Uploading to Supabase...\n";

  // STEP 2: Upload directly to Supabase
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadRes.ok) {
    log.innerText += "Upload failed ❌";
    return;
  }

  log.innerText += "Upload completed ✅\n";

  // STEP 3: Notify backend
  await fetch(`${BACKEND_URL}/api/v1/video/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      videoId,
      filePath,
    }),
  });

  log.innerText += "Backend notified 🎉\n";
}
