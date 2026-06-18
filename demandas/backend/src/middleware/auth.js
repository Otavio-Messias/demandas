const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'demandas_secret_key_2024';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  try {
    req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito ao administrador' });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware, JWT_SECRET };
