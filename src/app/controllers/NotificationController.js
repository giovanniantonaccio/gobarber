import Notification from '../schemas/Notification';
import User from '../models/User';

class NotificationController {
  async index(req, res) {
    /**
     * Check if the user is a provider
     */
    const checkIsProvider = await User.findOne({
      where: { id: req.userId, provider: true },
    });

    if (!checkIsProvider) {
      res.status(401).json({ error: 'Only providers can check notifications' });
    }

    /**
     * Retrieve from mongoDB all notifications for the provider
     */
    const notifications = await Notification.find({
      user: req.userId,
    })
      .sort({ createdAt: 'desc' })
      .limit(20);

    /**
     * Return a list of notifications
     */
    return res.json(notifications);
  }

  async update(req, res) {
    /**
     * Update the read parameter for the specified ID
     */
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    /**
     * Return the updated notification
     */
    return res.json(notification);
  }
}

export default new NotificationController();
