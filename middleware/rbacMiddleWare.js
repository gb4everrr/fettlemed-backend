const { ClinicAdmin } = require('../models');
const ROLES = require('../config/roles');

// Helper to check permissions (including inheritance & custom overrides)
const hasPermission = (userRole, userCustomPerms, requiredPermission) => {
  // 1. Check Custom Overrides first
  if (userCustomPerms && Array.isArray(userCustomPerms) && userCustomPerms.includes(requiredPermission)) {
    return true;
  }

  const roleConfig = ROLES[userRole];
  if (!roleConfig) return false;

  // 2. Check direct permissions
  if (roleConfig.permissions.includes(requiredPermission)) return true;

  // 3. Check inherited roles
  if (roleConfig.inherits && roleConfig.inherits.length > 0) {
    return roleConfig.inherits.some(inheritedRole => 
      hasPermission(inheritedRole, [], requiredPermission)
    );
  }

  return false;
};

exports.checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // --- THE FIX IS HERE ---
      // We use optional chaining (?.) to prevent crashing if req.body is undefined
      const clinicId = 
        (req.body && req.body.clinic_id) || 
        (req.query && req.query.clinic_id) || 
        (req.params && req.params.clinic_id);

      if (!clinicId) {
        console.error("RBAC Block: No clinic_id found in request");
        return res.status(400).json({ error: "Context missing: clinic_id is required." });
      }

      // 1. Find the user's role in this specific clinic
      const staffMember = await ClinicAdmin.findOne({
        where: { 
          user_id: userId, 
          clinic_id: clinicId,
          active: true 
        }
      });

      if (!staffMember) {
        return res.status(403).json({ error: "Access Denied: You are not a member of this clinic." });
      }

      // 2. Validate Permission
      const customPerms = staffMember.custom_permissions || [];
      
      if (!hasPermission(staffMember.role, customPerms, permission)) {
        console.error(`RBAC Block: User ${userId} (Role: ${staffMember.role}) tried to ${permission}`);
        return res.status(403).json({ 
          error: `Access Denied: You lack the '${permission}' permission.` 
        });
      }

      // Attach staff info for controllers to use
      req.staffMember = staffMember; 
      
      next();

    } catch (err) {
      console.error("RBAC Error:", err);
      res.status(500).json({ error: "Internal Authorization Error" });
    }
  };
};