import {Router} from "express";
import {initUpload, completeUpload} from "../controllers/video.controller.js";


const router = Router();

router.post("/init-upload", initUpload);
router.post("/complete", completeUpload);
// router.route("/video").post(uploadVideo).get(getVideo);


export default router;