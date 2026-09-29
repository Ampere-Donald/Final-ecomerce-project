import { useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import apiClient from "../utils/apiClient";
import { apiMessage, safeReturnTo } from "./orderData";
import Footer from "./Footer";

export default function Auth() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"));
  const signupPage = pathname === "/signup";
  const recovery = pathname === "/forgot-password";
  const { login, signup, googleLogin } = useAuth();
  const { lang } = useI18n();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nom: "",
    email: "",
    identifiant: "",
    telephone: "",
    motDePasse: "",
    code: "",
    typeClient: "PARTICULIER",
  });
  const [stage, setStage] = useState("email");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  async function perform(operation) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (e) {
      setError(
        apiMessage(
          e,
          tr(
            "Impossible de terminer. Vérifiez votre connexion et réessayez.",
            "Unable to finish. Check your connection and try again.",
          ),
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function submit(event) {
    event.preventDefault();
    await perform(async () => {
      if (recovery) {
        if (stage === "email") {
          await apiClient.post(
            "/auth/forgot-password",
            { email: form.email.trim() },
            { timeout: 20000 },
          );
          setStage("code");
          setNotice(
            tr(
              "Si cette adresse correspond à un compte, un code a été envoyé. Consultez aussi vos courriers indésirables.",
              "If this address matches an account, a code has been sent. Check your spam folder too.",
            ),
          );
        } else {
          await apiClient.post(
            "/auth/reset-password",
            {
              email: form.email.trim(),
              code: form.code.trim(),
              newPassword: form.motDePasse,
            },
            { timeout: 20000 },
          );
          setStage("done");
          setNotice(
            tr(
              "Votre mot de passe a été modifié. Vous pouvez vous connecter.",
              "Your password has been changed. You can sign in.",
            ),
          );
          setForm({ ...form, motDePasse: "" });
        }
      } else {
        const result = signupPage
          ? await signup({
              nom: form.nom.trim(),
              email: form.email.trim(),
              telephone: form.telephone.trim() || undefined,
              motDePasse: form.motDePasse,
              typeClient: form.typeClient,
            })
          : await login(form.identifiant.trim(), form.motDePasse);
        if (result.access_token && result.user)
          navigate(returnTo, { replace: true });
        else {
          setNotice(
            tr(
              "Votre compte a été créé. Connectez-vous pour continuer.",
              "Your account has been created. Sign in to continue.",
            ),
          );
          setStage("done");
        }
      }
    });
  }
  const title = recovery
    ? tr("Retrouver votre accès", "Recover your account")
    : signupPage
      ? tr("Créer mon compte", "Create my account")
      : tr("Ravi de vous retrouver", "Welcome back");
  const field = (name, label, props = {}) => (
    <label className="e-field">
      {label}
      <input
        name={name}
        value={form[name]}
        onChange={change}
        required
        {...props}
      />
    </label>
  );
  return (
    <>
      <div className="e-wrap e-auth-layout">
        <aside className="e-auth-aside">
          <span className="e-eyebrow">NEWOTEG · X-Electronic</span>
          <h2>
            {tr(
              "Un compte. Tous vos projets.",
              "One account. All your projects.",
            )}
          </h2>
          <p>
            {tr(
              "Retrouvez vos commandes, gardez vos références à portée de main et restez en contact avec notre boutique à Douala.",
              "Track orders, keep your favourite products close and stay in touch with our shop in Douala.",
            )}
          </p>
          <img src="/design-e/multimetre.webp" alt="" />
          <span className="e-auth-caption">
            {tr(
              "Des outils, des composants et des conseils.",
              "Tools, components and advice.",
            )}
          </span>
        </aside>
        <section className="e-auth-content">
          <Link to="/catalogue">
            ← {tr("Retour au catalogue", "Back to catalogue")}
          </Link>
          <h1>{title}</h1>
          <p>
            {recovery
              ? tr(
                  "Utilisez l’adresse e-mail de votre compte.",
                  "Use the email address for your account.",
                )
              : tr(
                  "Vos commandes et vos favoris, au même endroit.",
                  "Your orders and favourites in one place.",
                )}
          </p>
          {error && (
            <div role="alert" className="e-form-error">
              {error}
            </div>
          )}
          {notice && (
            <p role="status" className="e-note">
              {notice}
            </p>
          )}
          {stage === "done" ? (
            <Link
              className="e-btn"
              to={`/login?returnTo=${encodeURIComponent(returnTo)}`}
            >
              {tr("Se connecter", "Sign in")}
            </Link>
          ) : (
            <form className="e-form" onSubmit={submit}>
              <fieldset disabled={busy}>
                {signupPage &&
                  field("nom", tr("Nom complet", "Full name"), {
                    autoComplete: "name",
                  })}
                {signupPage || recovery
                  ? field("email", tr("Adresse e-mail", "Email address"), {
                      type: "email",
                      autoComplete: "email",
                      readOnly: recovery && stage === "code",
                    })
                  : field(
                      "identifiant",
                      tr("E-mail ou téléphone", "Email or phone"),
                      { autoComplete: "username" },
                    )}
                {signupPage && (
                  <>
                    {field(
                      "telephone",
                      tr("Téléphone (facultatif)", "Phone (optional)"),
                      { type: "tel", autoComplete: "tel", required: false },
                    )}
                    <label className="e-field">
                      {tr("Vous êtes", "Customer type")}
                      <select
                        name="typeClient"
                        value={form.typeClient}
                        onChange={change}
                      >
                        <option value="PARTICULIER">
                          {tr("Particulier", "Individual")}
                        </option>
                        <option value="PROFESSIONNEL">
                          {tr("Professionnel", "Professional")}
                        </option>
                      </select>
                    </label>
                  </>
                )}
                {recovery &&
                  stage === "code" &&
                  field(
                    "code",
                    tr("Code reçu par e-mail", "Code received by email"),
                    { autoComplete: "one-time-code", inputMode: "numeric" },
                  )}
                {(!recovery || stage === "code") && (
                  <>
                    <label className="e-field">
                      {recovery
                        ? tr("Nouveau mot de passe", "New password")
                        : tr("Mot de passe", "Password")}
                      <span className="e-password">
                        <input
                          name="motDePasse"
                          type={show ? "text" : "password"}
                          required
                          value={form.motDePasse}
                          onChange={change}
                          autoComplete={
                            signupPage || recovery
                              ? "new-password"
                              : "current-password"
                          }
                          minLength={signupPage || recovery ? 8 : undefined}
                          pattern={
                            signupPage || recovery
                              ? "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}"
                              : undefined
                          }
                          aria-describedby={
                            signupPage || recovery
                              ? "auth-password-help"
                              : undefined
                          }
                        />
                        <button
                          type="button"
                          aria-label={
                            show
                              ? tr("Masquer le mot de passe", "Hide password")
                              : tr("Afficher le mot de passe", "Show password")
                          }
                          onClick={() => setShow(!show)}
                        >
                          {show ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </span>
                    </label>
                    {(signupPage || recovery) && (
                      <p className="e-field-help" id="auth-password-help">
                        {tr(
                          "8 caractères minimum, une majuscule, une minuscule et un chiffre.",
                          "At least 8 characters with uppercase, lowercase and a number.",
                        )}
                      </p>
                    )}
                  </>
                )}
                {!recovery && !signupPage && (
                  <Link
                    className="e-forgot"
                    to={`/forgot-password?returnTo=${encodeURIComponent(returnTo)}`}
                  >
                    {tr("Mot de passe oublié ?", "Forgot password?")}
                  </Link>
                )}
                {signupPage && (
                  <p className="e-field-help">
                    {tr(
                      "En créant un compte, vous acceptez les",
                      "By creating an account, you accept the",
                    )}{" "}
                    <Link to="/terms">
                      {tr("conditions d’utilisation", "terms of use")}
                    </Link>
                    .{" "}
                    <Link to="/privacy">
                      {tr("Confidentialité", "Privacy")}
                    </Link>
                  </p>
                )}
                <button className="e-btn">
                  {busy
                    ? tr("En cours…", "Working…")
                    : recovery
                      ? stage === "code"
                        ? tr("Modifier le mot de passe", "Change password")
                        : tr("Recevoir un code", "Send a code")
                      : signupPage
                        ? tr("Créer mon compte", "Create my account")
                        : tr("Se connecter", "Sign in")}
                  <ArrowRight size={18} />
                </button>
              </fieldset>
            </form>
          )}
          {!recovery &&
            stage !== "done" &&
            import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <div className="e-auth-google">
                <GoogleLogin
                  onSuccess={(response) =>
                    perform(async () => {
                      await googleLogin(response.credential);
                      navigate(returnTo, { replace: true });
                    })
                  }
                  onError={() =>
                    setError(
                      tr(
                        "La connexion Google a échoué.",
                        "Google sign-in failed.",
                      ),
                    )
                  }
                />
              </div>
            )}
          {!recovery ? (
            <p className="e-auth-switch">
              {signupPage
                ? tr("Déjà un compte ?", "Already registered?")
                : tr("Pas encore de compte ?", "New here?")}{" "}
              <Link
                to={`${signupPage ? "/login" : "/signup"}?returnTo=${encodeURIComponent(returnTo)}`}
              >
                {signupPage
                  ? tr("Se connecter", "Sign in")
                  : tr("Créer mon compte", "Create my account")}
              </Link>
            </p>
          ) : (
            stage !== "done" && (
              <div className="e-actions">
                <Link to={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
                  {tr("Retour à la connexion", "Back to sign-in")}
                </Link>
                {stage === "code" && (
                  <button
                    className="e-text-button"
                    disabled={busy}
                    onClick={() => {
                      setStage("email");
                      setNotice("");
                      setError("");
                    }}
                  >
                    {tr("Changer d’adresse", "Change email")}
                  </button>
                )}
              </div>
            )
          )}
        </section>
      </div>
      <Footer />
    </>
  );
}
