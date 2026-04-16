"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  LOCAL_ADMIN_EMAIL,
  LOCAL_ADMIN_PASSWORD,
  mapAuthErrorToMessage,
  registerCustomer,
  resendVerificationEmail,
  setAdminMode,
  sendPasswordResetLink,
  signOutCurrentUser,
  signInWithEmailPassword,
  signInWithGoogle,
  syncVerificationStatus
} from "@/services";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/[0-9]/, "Password must include at least one number.");

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required."),
    lastName: z.string().trim().min(1, "Last name is required."),
    email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
    phone: z.string().trim()
      .min(10, "Phone number must be at least 10 digits.")
      .regex(/^[+]?[\d\s\-().]+$/, "Enter a valid phone number."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required."),
    promotionsOptIn: z.boolean().default(false),
    street: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    zip: z.string().trim().optional()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

const loginDefaults = {
  email: "",
  password: ""
};

const registerDefaults = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  promotionsOptIn: false,
  street: "",
  city: "",
  state: "",
  zip: ""
};

const VERIFICATION_REQUIRED_POPUP_MESSAGE =
  "Account is not verified. Please check your email to verify your account.";

const pageShellStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px 16px",
  background:
    "radial-gradient(circle at top, rgba(59,130,246,0.14), transparent 35%), linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,1))"
};

const cardStyle = {
  width: "100%",
  maxWidth: "780px"
};

const toggleContainerStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px"
};

const formGridStyle = {
  display: "grid",
  gap: "16px"
};

const twoColumnStyle = {
  display: "grid",
  gap: "16px",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
};

const sectionStyle = {
  padding: "16px",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: "12px",
  display: "grid",
  gap: "16px",
  background: "rgba(15, 23, 42, 0.35)"
};

const noteStyle = {
  padding: "12px 14px",
  borderRadius: "10px",
  fontSize: "0.95rem",
  lineHeight: 1.5
};

const requiredMarkStyle = {
  color: "#f87171",
  marginLeft: "4px"
};

function RequiredLabel({ children }) {
  return (
    <>
      {children}
      <span style={requiredMarkStyle}>*</span>
    </>
  );
}

function buildAddress(values) {
  const address = {
    street: values.street.trim(),
    city: values.city.trim(),
    state: values.state.trim(),
    zip: values.zip.trim()
  };

  return Object.values(address).some(Boolean) ? address : null;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [registrationState, setRegistrationState] = useState(null);
  const [socialState, setSocialState] = useState({
    loading: false,
    message: ""
  });
  const [resendState, setResendState] = useState({
    loading: false,
    message: ""
  });
  const [syncState, setSyncState] = useState({
    loading: false,
    message: ""
  });
  const [forgotPasswordState, setForgotPasswordState] = useState({
    open: false,
    email: "",
    loading: false,
    message: "",
    isError: false
  });
  const [verificationPopupOpen, setVerificationPopupOpen] = useState(false);

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaults
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: registerDefaults
  });

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const requestedMode = router.query.mode === "register" ? "register" : "login";
    setMode(requestedMode);
  }, [router.isReady, router.query.mode]);

  const successPanel = useMemo(() => {
    if (!registrationState?.ok) {
      return null;
    }

    const isActive = registrationState.profile?.status === "Active" || statusMessage.includes("active");

    return {
      isActive,
      title: isActive ? "Account is active" : "Registration successful",
      message: isActive
        ? "Your account is active."
        : "Account created. Verify your email to activate the account."
    };
  }, [registrationState, statusMessage]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setFormError("");
    setStatusMessage("");
    setSocialState({
      loading: false,
      message: ""
    });
    setForgotPasswordState({
      open: false,
      email: "",
      loading: false,
      message: "",
      isError: false
    });
    setVerificationPopupOpen(false);
  };

  const handleEmailLogin = async (values) => {
    setFormError("");
    setStatusMessage("");
    setVerificationPopupOpen(false);
    setSocialState({
      loading: false,
      message: ""
    });
    setForgotPasswordState((previous) => ({
      ...previous,
      loading: false,
      message: "",
      isError: false
    }));

    const normalizedEmail = values.email.trim().toLowerCase();
    const normalizedPassword = values.password;
    const isHardcodedAdminLogin =
      normalizedEmail === LOCAL_ADMIN_EMAIL && normalizedPassword === LOCAL_ADMIN_PASSWORD;

    if (isHardcodedAdminLogin) {
      await signOutCurrentUser();
      setAdminMode(true);
      setStatusMessage("Admin login successful. Redirecting to admin page...");
      void router.push("/");
      return;
    }

    setAdminMode(false);

    const result = await signInWithEmailPassword(values);
    if (!result.ok) {
      if (result.requiresVerification) {
        setVerificationPopupOpen(true);
        return;
      }

      setFormError(result.message || "Unable to sign in right now.");
      return;
    }

    setStatusMessage("Signed in successfully. Redirecting...");
    void router.push("/");
  };

  const handleToggleForgotPassword = () => {
    setForgotPasswordState((previous) => {
      if (previous.open) {
        return {
          ...previous,
          open: false,
          loading: false,
          message: "",
          isError: false
        };
      }

      const loginEmail = loginForm.getValues("email");
      return {
        ...previous,
        open: true,
        email: previous.email || (typeof loginEmail === "string" ? loginEmail : ""),
        loading: false,
        message: "",
        isError: false
      };
    });
  };

  const handleForgotPasswordEmailChange = (event) => {
    const value = typeof event?.target?.value === "string" ? event.target.value : "";
    setForgotPasswordState((previous) => ({
      ...previous,
      email: value,
      message: "",
      isError: false
    }));
  };

  const handleSendResetPasswordLink = async () => {
    const fallbackEmail = loginForm.getValues("email");
    const email = (
      forgotPasswordState.email ||
      (typeof fallbackEmail === "string" ? fallbackEmail : "")
    ).trim();
    const normalizedEmail = email.toLowerCase();

    if (!email) {
      setForgotPasswordState((previous) => ({
        ...previous,
        message: "Enter your email to receive a reset link.",
        isError: true
      }));
      return;
    }

    if (normalizedEmail === LOCAL_ADMIN_EMAIL) {
      setForgotPasswordState((previous) => ({
        ...previous,
        email,
        message: "Admin account cannot be modified.",
        isError: true
      }));
      return;
    }

    setForgotPasswordState((previous) => ({
      ...previous,
      loading: true,
      message: "",
      isError: false
    }));

    const result = await sendPasswordResetLink(email);
    setForgotPasswordState((previous) => ({
      ...previous,
      open: result.ok ? false : true,
      email: result.ok ? "" : previous.email,
      loading: false,
      message: result.ok
        ? result.message
        : result.message || "Unable to send password reset link.",
      isError: !result.ok
    }));
  };
  const isAdminForgotPasswordEmail =
    forgotPasswordState.email.trim().toLowerCase() === LOCAL_ADMIN_EMAIL;

  const handleRegister = async (values) => {
    setFormError("");
    setStatusMessage("");
    setResendState({
      loading: false,
      message: ""
    });
    setSyncState({
      loading: false,
      message: ""
    });
    setAdminMode(false);

    const result = await registerCustomer({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      password: values.password,
      promotionsOptIn: values.promotionsOptIn,
      address: buildAddress(values)
    });

    setRegistrationState(result);

    if (!result.ok) {
      setFormError(result.message || "We could not create your account.");
      return;
    }
  };

  const handleSocialAuth = async () => {
    setSocialState({
      loading: true,
      message: ""
    });
    setFormError("");
    setStatusMessage("");
    setVerificationPopupOpen(false);
    setAdminMode(false);

    const result = await signInWithGoogle();
    if (!result.ok) {
      if (result.requiresVerification) {
        setSocialState({
          loading: false,
          message: ""
        });
        setVerificationPopupOpen(true);
        return;
      }

      setSocialState({
        loading: false,
        message: result.message || "Sign-in failed."
      });
      return;
    }

    setRegistrationState({
      ok: true,
      profile: result.profile
    });
    setStatusMessage(result.profile?.status === "Active" ? "Your account is now active." : "");
    setSocialState({
      loading: false,
      message: "Google sign-in successful."
    });
    void router.push("/");
  };

  const handleResendVerification = async () => {
    setResendState({
      loading: true,
      message: ""
    });

    const result = await resendVerificationEmail();

    setResendState({
      loading: false,
      message: result.ok
        ? result.message
        : result.message || mapAuthErrorToMessage(result.error)
    });
  };

  const handleSyncVerification = async () => {
    setSyncState({
      loading: true,
      message: ""
    });

    const result = await syncVerificationStatus();

    if (!result.ok) {
      setSyncState({
        loading: false,
        message: result.message || "We could not refresh your verification status."
      });
      return;
    }

    const isActive = result.status === "Active";
    setRegistrationState((current) =>
      current?.ok
        ? {
            ...current,
            profile: {
              ...current.profile,
              ...result.profile
            }
          }
        : current
    );
    setStatusMessage(
      isActive
        ? "Your account is now active."
        : "Your account is still inactive until Firebase reports the email as verified."
    );
    setSyncState({
      loading: false,
      message: isActive
        ? "Verification synced successfully."
        : "Verification checked. The email is not marked verified yet."
    });
  };

  return (
    <div style={pageShellStyle}>
      <AlertDialog open={verificationPopupOpen} onOpenChange={setVerificationPopupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verify Your Account</AlertDialogTitle>
            <AlertDialogDescription>{VERIFICATION_REQUIRED_POPUP_MESSAGE}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setVerificationPopupOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Card style={cardStyle}>
        <CardHeader>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <CardTitle>{mode === "login" ? "Sign In" : "Create your account"}</CardTitle>
              <CardDescription>
                Access your cart, payments, and bookings from one account page.
              </CardDescription>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent style={{ display: "grid", gap: "20px" }}>
          <div style={toggleContainerStyle}>
            <Button
              type="button"
              variant={mode === "login" ? "default" : "outline"}
              onClick={() => switchMode("login")}
            >
              Sign In
            </Button>
            <Button
              type="button"
              variant={mode === "register" ? "default" : "outline"}
              onClick={() => switchMode("register")}
            >
              Register
            </Button>
          </div>

          {formError ? (
            <div
              style={{
                ...noteStyle,
                background: "rgba(127, 29, 29, 0.35)",
                border: "1px solid rgba(248, 113, 113, 0.35)",
                color: "#fecaca"
              }}
            >
              {formError}
            </div>
          ) : null}

          {successPanel ? (
            <div
              style={{
                ...noteStyle,
                background: successPanel.isActive
                  ? "rgba(20, 83, 45, 0.35)"
                  : "rgba(3, 105, 161, 0.25)",
                border: successPanel.isActive
                  ? "1px solid rgba(74, 222, 128, 0.35)"
                  : "1px solid rgba(56, 189, 248, 0.3)",
                color: successPanel.isActive ? "#bbf7d0" : "#dbeafe"
              }}
            >
              <strong>{successPanel.title}</strong>
              <div>{successPanel.message}</div>
              {statusMessage ? <div style={{ marginTop: "8px" }}>{statusMessage}</div> : null}
            </div>
          ) : null}

          {!successPanel && statusMessage ? (
            <div style={{ ...noteStyle, background: "rgba(20, 83, 45, 0.35)", border: "1px solid rgba(74, 222, 128, 0.35)", color: "#bbf7d0" }}>
              {statusMessage}
            </div>
          ) : null}

          {/* Google sign-in is temporarily disabled.
          <div style={{ display: "grid", gap: "8px" }}>
            <Button
              type="button"
              variant="outline"
              onClick={handleSocialAuth}
              disabled={socialState.loading || loginForm.formState.isSubmitting || registerForm.formState.isSubmitting}
            >
              {socialState.loading ? "Connecting..." : "Continue with Google"}
            </Button>
            {socialState.message ? (
              <p style={{ margin: 0, color: "#f8fafc", fontSize: "0.92rem" }}>{socialState.message}</p>
            ) : null}
          </div>
          */}

          {mode === "login" ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleEmailLogin)} style={formGridStyle}>
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>Email</RequiredLabel>
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>Password</RequiredLabel>
                      </FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleToggleForgotPassword}
                    disabled={loginForm.formState.isSubmitting || socialState.loading}
                  >
                    Forgot password?
                  </Button>
                </div>
                {forgotPasswordState.open ? (
                  <div
                    style={{
                      ...sectionStyle,
                      gap: "12px",
                      background: "rgba(15, 23, 42, 0.45)"
                    }}
                  >
                    <p style={{ margin: 0, color: "rgba(226,232,240,0.82)", fontSize: "0.92rem" }}>
                      Enter your email and we will send a password reset link.
                    </p>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={forgotPasswordState.email}
                      onChange={handleForgotPasswordEmailChange}
                      disabled={forgotPasswordState.loading}
                    />
                    {isAdminForgotPasswordEmail ? (
                      <p style={{ margin: 0, color: "#fca5a5", fontSize: "0.85rem" }}>
                        Admin account cannot be modified.
                      </p>
                    ) : null}
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <Button
                        type="button"
                        onClick={handleSendResetPasswordLink}
                        disabled={forgotPasswordState.loading || loginForm.formState.isSubmitting || socialState.loading}
                      >
                        {forgotPasswordState.loading ? "Sending..." : "Send Reset Link"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleToggleForgotPassword}
                        disabled={forgotPasswordState.loading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
                {forgotPasswordState.message ? (
                  <div
                    style={{
                      ...noteStyle,
                      background: forgotPasswordState.isError
                        ? "rgba(127, 29, 29, 0.35)"
                        : "rgba(20, 83, 45, 0.35)",
                      border: forgotPasswordState.isError
                        ? "1px solid rgba(248, 113, 113, 0.35)"
                        : "1px solid rgba(74, 222, 128, 0.35)",
                      color: forgotPasswordState.isError ? "#fecaca" : "#bbf7d0"
                    }}
                  >
                    {forgotPasswordState.message}
                  </div>
                ) : null}
                <Button type="submit" disabled={loginForm.formState.isSubmitting || socialState.loading}>
                  {loginForm.formState.isSubmitting ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(handleRegister)} style={formGridStyle}>
                <div style={twoColumnStyle}>
                  <FormField
                    control={registerForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>First Name</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>Last Name</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div style={twoColumnStyle}>
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>Email</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>Phone</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="Enter your phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div style={twoColumnStyle}>
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>Password</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Create a password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>Confirm Password</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Re-enter your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={registerForm.control}
                  name="promotionsOptIn"
                  render={({ field }) => (
                    <FormItem
                      style={{
                        padding: "14px",
                        border: "1px solid rgba(244, 63, 94, 0.55)",
                        borderRadius: "12px",
                        background:
                          "linear-gradient(135deg, rgba(127, 29, 29, 0.18), rgba(15, 23, 42, 0.55))"
                      }}
                    >
                      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        <FormControl>
                          <Checkbox
                            id="promotionsOptIn"
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                            style={{
                              width: "22px",
                              height: "22px",
                              border: "2px solid #f43f5e",
                              background: "rgba(15, 23, 42, 0.9)",
                              borderRadius: "6px",
                              marginTop: "1px"
                            }}
                          />
                        </FormControl>
                        <div style={{ display: "grid", gap: "6px" }}>
                          <FormLabel htmlFor="promotionsOptIn" style={{ margin: 0, color: "#ffe4e6", fontWeight: 600 }}>
                            Subscribe for promotions
                          </FormLabel>
                          <p style={{ margin: 0, color: "rgba(255,228,230,0.82)", fontSize: "0.86rem" }}>
                            Get offers and movie release updates by email.
                          </p>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <section style={sectionStyle}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Optional address</h2>
                    <p style={{ margin: "6px 0 0", color: "rgba(226,232,240,0.72)", fontSize: "0.92rem" }}>
                      Add address details now, or leave them blank and complete them later.
                    </p>
                  </div>

                  <FormField
                    control={registerForm.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div style={twoColumnStyle}>
                    <FormField
                      control={registerForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="State" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={registerForm.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP</FormLabel>
                        <FormControl>
                          <Input placeholder="ZIP code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>

                <Button type="submit" disabled={registerForm.formState.isSubmitting || socialState.loading}>
                  {registerForm.formState.isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </Form>
          )}

          {mode === "register" && registrationState?.ok ? (
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Button
                type="button"
                variant="outline"
                onClick={handleResendVerification}
                disabled={resendState.loading}
              >
                {resendState.loading ? "Sending..." : "Resend Verification Email"}
              </Button>
              <Button type="button" onClick={handleSyncVerification} disabled={syncState.loading}>
                {syncState.loading ? "Refreshing..." : "I've Verified My Email / Refresh Status"}
              </Button>
            </div>
          ) : null}

          {resendState.message ? (
            <div style={{ ...noteStyle, background: "rgba(15,23,42,0.55)", border: "1px solid rgba(148,163,184,0.25)" }}>
              {resendState.message}
            </div>
          ) : null}

          {syncState.message ? (
            <div style={{ ...noteStyle, background: "rgba(15,23,42,0.55)", border: "1px solid rgba(148,163,184,0.25)" }}>
              {syncState.message}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
