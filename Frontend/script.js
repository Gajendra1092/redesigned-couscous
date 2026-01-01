const BACKEND_URL = "http://localhost:5000";
let isUploading = false;

async function upload() {
  const fileInput = document.getElementById("fileInput");
  const log = document.getElementById("log");

  if (isUploading) return; // prevent double upload
  isUploading = true;

  try {
    // -------- SAFETY CHECK 1: File existence --------
    if (!fileInput.files.length) {
      log.innerText = "❌ No file selected";
      return;
    }

    const file = fileInput.files[0];

    // -------- SAFETY CHECK 2: File size (example: 500MB) --------
    const MAX_SIZE = 500 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      log.innerText = "❌ File too large";
      return;
    }

    // -------- SAFETY CHECK 3: File type --------
    if (!file.type.startsWith("video/")) {
      log.innerText = "❌ Invalid file type";
      return;
    }

    log.innerText = "Initializing upload...\n";

    // -------- STEP 1: Init upload --------
    const initRes = await fetch(`${BACKEND_URL}/api/v1/video/init-upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
      }),
    });

    // -------- SAFETY CHECK 4: Backend response --------
    if (!initRes.ok) {
      log.innerText += "❌ Init upload failed";
      return;
    }

    const initData = await initRes.json();
    const { uploadUrl, videoId, filePath } = initData;

    // -------- SAFETY CHECK 5: Required fields --------
    if (!uploadUrl || !videoId || !filePath) {
      log.innerText += "❌ Invalid init-upload response";
      return;
    }

    log.innerText += "Uploading to Supabase...\n";

    // -------- STEP 2: Upload file --------
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadRes.ok) {
      log.innerText += "❌ Upload failed";
      return;
    }

    log.innerText += "Upload completed ✅\n";

    // -------- STEP 3: Notify backend --------
    const completeRes = await fetch(`${BACKEND_URL}/api/v1/video/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    });

    if (!completeRes.ok) {
      log.innerText += "⚠️ Upload done but backend not notified";
      return;
    }

    log.innerText += "Backend notified 🎉\n";
  } catch (err) {
    console.error(err);
    log.innerText += "❌ Unexpected error occurred";
  } finally {
    isUploading = false; // always reset
  }
}

let currentVideoData = null;

/**
 * Load video metadata + signed URLs
 */
async function loadVideo() {
  const videoId = document.getElementById("videoIdInput").value;
  const video = document.getElementById("videoPlayer");
  const thumbnail = document.getElementById("thumbnail");
  const qualitySelect = document.getElementById("qualitySelect");

  if (!videoId) {
    alert("Please enter videoId");
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/video/${videoId}`);
    
    if (!res.ok) {
      alert("Video not ready or not found!");
      return;
    }

    const data = await res.json();
    currentVideoData = data; 

    // ---- Thumbnail ----
    thumbnail.src = data.thumbnailUrl;
    thumbnail.style.display = "block";

    // ---- Video ----
    video.src = data.renditions[0].url;
    video.poster = data.thumbnailUrl;
    video.style.display = "block";

    // ---- Quality Selector ----
    qualitySelect.innerHTML = "";
    data.renditions.forEach((r, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.text = `${r.height}p`;
      qualitySelect.appendChild(option);
    });

    qualitySelect.style.display = "block";
  } catch (err) {
    console.error(err);
    alert("Failed to load video");
  }
}

/**
 * Change video quality manually
 */
function changeQuality() {
  const video = document.getElementById("videoPlayer");
  const qualitySelect = document.getElementById("qualitySelect");

  if (!currentVideoData) return;

  const selected = qualitySelect.value;
  const currentTime = video.currentTime;

  video.src = currentVideoData.renditions[selected].url;
  video.currentTime = currentTime;
  video.play();
}
