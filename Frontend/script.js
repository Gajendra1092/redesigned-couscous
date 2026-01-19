const BACKEND_URL = "http://localhost:5000";
let isUploading = false;
let hls = null;

async function upload() {
  const fileInput = document.getElementById("fileInput");
  const log = document.getElementById("log");

  if (isUploading) return;
  isUploading = true;

  try {
    if (!fileInput.files.length) {
      log.innerText = "❌ No file selected";
      return;
    }

    const file = fileInput.files[0];

    const MAX_SIZE = 500 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      log.innerText = "❌ File too large";
      return;
    }

    if (!file.type.startsWith("video/")) {
      log.innerText = "❌ Invalid file type";
      return;
    }

    log.innerText = "Initializing upload...\n";

    const initRes = await fetch(`${BACKEND_URL}/api/v1/video/init-upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
      }),
    });

    if (!initRes.ok) {
      log.innerText += "❌ Init upload failed";
      return;
    }

    const { uploadUrl, videoId, filePath } = await initRes.json();

    if (!uploadUrl || !videoId || !filePath) {
      log.innerText += "❌ Invalid init-upload response";
      return;
    }

    log.innerText += "Uploading to Supabase...\n";

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
    isUploading = false;
  }
}

const qualityControls = document.getElementById("qualityControls");

function buildQualityButtons(levels) {
  qualityControls.innerHTML = `
    <strong>Quality:</strong>
    <button onclick="setQuality(-1)">Auto</button>
  `;

  levels.forEach((level, index) => {
    const btn = document.createElement("button");
    btn.innerText = `${level.height}p`;
    btn.onclick = () => setQuality(index);
    qualityControls.appendChild(btn);
  });
}

function setQuality(levelIndex) {
  if (!hls) return;

  hls.currentLevel = levelIndex;

  console.log(
    levelIndex === -1
      ? "Quality set to AUTO"
      : `Quality set to ${hls.levels[levelIndex].height}p`
  );
}



async function loadVideo() {
  const videoId = document.getElementById("videoIdInput").value;
  const video = document.getElementById("videoPlayer");
  const thumbnail = document.getElementById("thumbnail");

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

    thumbnail.src = data.thumbnailUrl;
    thumbnail.style.display = "block";

    video.style.display = "block";
    video.poster = data.thumbnailUrl;

    // Cleanup old instance
    if (hls) {
      hls.destroy();
      hls = null;
    }

    qualityControls.style.display = "none";
    qualityControls.innerHTML = "";

    if (Hls.isSupported()) {
      hls = new Hls({
        autoStartLoad: true,
        capLevelToPlayerSize: true,
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.log(data.type, data.details, data.fatal);
      });

      hls.loadSource(data.hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        buildQualityButtons(hls.levels);
        qualityControls.style.display = "block";
        video.play();
      });
    } else {
      alert("HLS not supported in this browser");
    }
  } catch (err) {
    console.error(err);
    alert("Failed to load video");
  }
}


async function deleteVideo() {
  const videoId = document.getElementById("videoIdInput").value;

  if (!videoId) {
    alert("Please enter videoId");
    return;
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/video/${videoId}/delete`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      alert("Failed to delete video");
      return;
    }

    alert("Video deleted successfully!");
  } catch (err) {
    console.error("Delete error:", err);
    alert("Error deleting video");
  }
}
