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

let hls = null;
let currentVideoData = null;

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


    // ---- Thumbnail ----
    thumbnail.src = data.thumbnailUrl;
    thumbnail.style.display = "block";

    // ---- HLS Playback ----
    const hlsUrl = data.hlsUrl;
    video.style.display = "block";
    video.poster = data.thumbnailUrl;

    
    // Cleanup previous instance
    if (hls) {
      hls.destroy();
      hls = null;
    }


    // All other browsers
    if (Hls.isSupported()) {

      hls = new Hls({
        autoStartLoad: true,
        capLevelToPlayerSize: true,
      });

      
      hls.on(Hls.Events.ERROR, (event, data) => {
        const { type, details, fatal } = data;
        console.log(type, details, fatal);
      });
      
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
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
    if(!videoId){
      alert("Please enter videoId");
      return;
    }

    try{
       const response = await fetch(`${BACKEND_URL}/api/v1/video/${videoId}/delete`,{method:"DELETE"});
       if(!response.ok){
          alert("Failed to delete video");
          return;
       }
       else{
          console.log("Video deleted successfully");
          alert("Video Deleted successfully!");
       }
    }
    catch(err){
        console.log("Their is an error in deletingVideo, the error is:",err);
        alert("Error in deleting video");
    }

}