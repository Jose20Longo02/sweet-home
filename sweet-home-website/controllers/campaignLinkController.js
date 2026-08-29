// controllers/campaignLinkController.js

exports.showGuide = (req, res) => {
  const isSuperAdmin = req.session.user?.role === 'SuperAdmin';
  const dashboardPath = isSuperAdmin ? '/superadmin/dashboard' : '/admin/dashboard';

  res.render('campaign-links/guide', {
    title: 'Campaign links',
    currentUser: req.session.user,
    user: req.session.user,
    dashboardPath,
    standalone: true
  });
};
