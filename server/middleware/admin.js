module.exports = function (req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Administrator access required.' });
  }
  next();
};
