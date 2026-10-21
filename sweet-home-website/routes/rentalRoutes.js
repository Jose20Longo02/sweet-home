const express = require('express');
const { ensureAuthenticated } = require('../middleware/authorize');
const uploadRentalPhotos = require('../middleware/uploadRentalPhotos');
const rentalController = require('../controllers/rentalController');

const router = express.Router();

function allowStaff(req, res, next) {
  const role = req.session.user?.role;
  if (role === 'Admin' || role === 'SuperAdmin') return next();
  return res.status(403).send('Forbidden – staff only');
}

router.use(ensureAuthenticated, allowStaff);
router.get('/', rentalController.list);
router.get('/new', rentalController.form);
router.post('/', uploadRentalPhotos, rentalController.save);
router.get('/:id/edit', rentalController.form);
router.post('/:id/status', rentalController.setStatus);
router.post('/:id/delete', rentalController.remove);
router.post('/:id', uploadRentalPhotos, rentalController.save);

module.exports = router;
