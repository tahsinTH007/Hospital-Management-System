import { Router } from "express";
import Notification from "../models/notification.ts";
import { requireAuth } from "../middleware/auth.ts";

const notificationRouter = Router();

notificationRouter.get("/", requireAuth, async (req, res) => {
  try {
    const currentUserId = (req as any).user.id;
    const notifications = await Notification.find({ user: currentUserId })
      .sort({ createdAt: -1 })
      .limit(20);

    const unreadCount = await Notification.countDocuments({
      user: currentUserId,
      isRead: false,
    });
    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

notificationRouter.post("/read-all", requireAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: (req as any).user.id, isRead: false },
      { isRead: true },
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

notificationRouter.post("/:id/read", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    // Scope to the current user so nobody can mark someone else's as read.
    await Notification.findOneAndUpdate(
      { _id: id, user: (req as any).user.id },
      { isRead: true },
    );
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default notificationRouter;
