import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../db/index.js";

// Configuración de Google OAuth Strategy
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn(
    "⚠️  ADVERTENCIA: GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no están configurados"
  );
  console.warn(
    "   La autenticación con Google no funcionará hasta que se configuren"
  );
}

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID || "dummy-client-id",
      clientSecret: GOOGLE_CLIENT_SECRET || "dummy-client-secret",
      callbackURL: `${BACKEND_URL}/auth/google/callback`,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extraer información del perfil de Google
        const googleId = profile.id;
        const email =
          profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        const name = profile.displayName || "Usuario";
        const avatar =
          profile.photos && profile.photos[0] ? profile.photos[0].value : null;

        // Buscar si el usuario ya existe por googleId o email
        let user = await User.findOne({
          where: { googleId },
        });

        if (!user && email) {
          // Si no existe por googleId, buscar por email
          user = await User.findOne({
            where: { email },
          });
        }

        if (user) {
          // Usuario existe: actualizar información
          user.googleId = googleId;
          user.name = name;
          user.avatar = avatar;
          user.lastLogin = new Date();
          await user.save();

          console.log(`✅ Usuario existente autenticado: ${user.email}`);
        } else {
          // Usuario nuevo: crear
          user = await User.create({
            googleId,
            email,
            name,
            avatar,
            lastLogin: new Date(),
          });

          console.log(`🆕 Nuevo usuario creado: ${user.email}`);
        }

        // Retornar el usuario
        return done(null, user);
      } catch (error) {
        console.error("❌ Error en Google OAuth callback:", error);
        return done(error, null);
      }
    }
  )
);

// Serializar usuario (guardar en sesión)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserializar usuario (obtener de sesión)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
