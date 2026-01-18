import {Router} from "express";
import {initUpload, completeUpload, getVideo, deleteVideo} from "../controllers/video.controller.js";

const router = Router();

router.post("/init-upload", initUpload);
router.post("/complete", completeUpload);
router.get("/:videoId", getVideo);
router.delete("/:videoId/delete", deleteVideo);
// router.route("/video").post(uploadVideo).get(getVideo);

export default router;