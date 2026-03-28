"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  mapAuthErrorToMessage,
  registerCustomer,
  resendVerificationEmail,
  syncVerificationStatus
} from "@/services";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/[0-9]/, "Password must include at least one number.");

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required."),
    lastName: z.string().trim().min(1, "Last name is required."),
    email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
    phone: z.string().trim().min(1, "Phone is required."),
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

const defaultValues = {
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
  maxWidth: "760px"
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

export default function RegisterPage() {
  const [formError, setFormError] = useState("");
  const [registrationState, setRegistrationState] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [resendState, setResendState] = useState({
    loading: false,
    message: ""
  });
  const [syncState, setSyncState] = useState({
    loading: false,
    message: ""
  });

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues
  });

  const successPanel = useMemo(() => {
    if (!registrationState?.ok) {
      return null;
    }

    const isActive = registrationState.profile?.status === "Active" || statusMessage.includes("active");

    return {
      isActive,
      title: isActive ? "Account is active" : "Registration successful",
      message: isActive
        ? "Your email has been verified and your account is now active."
        : "Account created. A verification email has been sent. Your account stays Inactive until your email is verified."
    };
  }, [registrationState, statusMessage]);

  async function handleSubmit(values) {
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
  }

  async function handleResendVerification() {
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
  }

  async function handleSyncVerification() {
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
  }

  return (
    <div style={pageShellStyle}>
      <Card style={cardStyle}>
        <CardHeader>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>
                Register to track your bookings and verify your email before activation.
              </CardDescription>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent style={{ display: "grid", gap: "20px" }}>
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

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} style={formGridStyle}>
              <div style={twoColumnStyle}>
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                control={form.control}
                name="promotionsOptIn"
                render={({ field }) => (
                  <FormItem>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                      </FormControl>
                      <div style={{ display: "grid", gap: "6px" }}>
                        <FormLabel style={{ margin: 0 }}>Send me promotions and release updates</FormLabel>
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
                  control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                  control={form.control}
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

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/">Back to Home</Link>
                </Button>
              </div>
            </form>
          </Form>

          {registrationState?.ok ? (
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Button type="button" variant="outline" onClick={handleResendVerification} disabled={resendState.loading}>
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
