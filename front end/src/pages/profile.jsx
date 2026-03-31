"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changeCurrentUserPassword,
  fetchCurrentUserProfile,
  subscribeToAuthState,
  updateCurrentUserProfile
} from "@/services";
import styles from "./profile.module.css";

function createEmptyForm() {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    promotionsOptIn: false,
    street: "",
    city: "",
    state: "",
    zip: ""
  };
}

function toForm(profile) {
  const address = profile?.address && typeof profile.address === "object" ? profile.address : {};

  return {
    firstName: typeof profile?.firstName === "string" ? profile.firstName : "",
    lastName: typeof profile?.lastName === "string" ? profile.lastName : "",
    email: typeof profile?.email === "string" ? profile.email : "",
    phone:
      typeof profile?.phone === "string"
        ? profile.phone
        : typeof profile?.phoneNumber === "string"
          ? profile.phoneNumber
          : "",
    promotionsOptIn: Boolean(profile?.promotionsOptIn),
    street: typeof address?.street === "string" ? address.street : "",
    city: typeof address?.city === "string" ? address.city : "",
    state: typeof address?.state === "string" ? address.state : "",
    zip: typeof address?.zip === "string" ? address.zip : ""
  };
}

function toDisplayValue(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "Not provided";
}

function hasPasswordProvider(user) {
  if (!user || !Array.isArray(user.providerData)) {
    return false;
  }

  return user.providerData.some(
    (provider) => typeof provider?.providerId === "string" && provider.providerId === "password"
  );
}

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(createEmptyForm());
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: ""
  });

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      setCurrentUser(user ?? null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!currentUser) {
        setProfile(null);
        setForm(createEmptyForm());
        setIsEditing(false);
        setLoading(false);
        setError("");
        setShowPasswordForm(false);
        setPasswordSaving(false);
        setPasswordError("");
        setPasswordMessage("");
        setPasswordForm({
          currentPassword: "",
          newPassword: ""
        });
        return;
      }

      setLoading(true);
      setError("");
      const result = await fetchCurrentUserProfile();
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setError(result.message || "Unable to load profile details.");
        const fallbackProfile = {
          email: currentUser.email ?? "",
          firstName: "",
          lastName: "",
          phone: "",
          address: null,
          promotionsOptIn: false
        };
        setProfile(fallbackProfile);
        setForm(toForm(fallbackProfile));
        setIsEditing(false);
        setLoading(false);
        return;
      }

      setProfile(result.profile ?? null);
      setForm(toForm(result.profile ?? null));
      setIsEditing(false);
      setLoading(false);
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, currentUser?.email]);

  useEffect(() => {
    setShowPasswordForm(false);
    setPasswordSaving(false);
    setPasswordError("");
    setPasswordMessage("");
    setPasswordForm({
      currentPassword: "",
      newPassword: ""
    });
  }, [currentUser?.uid]);

  const hasMissingProfileFields = useMemo(() => {
    return (
      form.firstName.trim().length === 0 ||
      form.lastName.trim().length === 0 ||
      form.phone.trim().length === 0
    );
  }, [form.firstName, form.lastName, form.phone]);

  const addressText = useMemo(
    () =>
      [form.street.trim(), form.city.trim(), form.state.trim(), form.zip.trim()]
        .filter(Boolean)
        .join(", "),
    [form.city, form.state, form.street, form.zip]
  );

  const profileCompletion = useMemo(() => {
    const fields = [
      form.firstName,
      form.lastName,
      form.email,
      form.phone,
      form.street,
      form.city,
      form.state,
      form.zip
    ];
    const completed = fields.filter((value) => typeof value === "string" && value.trim().length > 0).length;
    return Math.round((completed / fields.length) * 100);
  }, [form.city, form.email, form.firstName, form.lastName, form.phone, form.state, form.street, form.zip]);

  const avatarInitial = useMemo(() => {
    const source = form.firstName || form.email || "U";
    return source.trim().charAt(0).toUpperCase();
  }, [form.firstName, form.email]);

  const fullName = useMemo(() => {
    const parts = [form.firstName.trim(), form.lastName.trim()].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "Profile details";
  }, [form.firstName, form.lastName]);
  const canChangePassword = useMemo(
    () => hasPasswordProvider(currentUser),
    [currentUser]
  );

  const handleChange = (key) => (event) => {
    const value = typeof event?.target?.value === "string" ? event.target.value : "";
    setMessage("");
    setForm((previous) => ({
      ...previous,
      [key]: value
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      promotionsOptIn: Boolean(form.promotionsOptIn),
      address: {
        street: form.street.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim()
      }
    };

    const result = await updateCurrentUserProfile(payload);
    setSaving(false);

    if (!result.ok) {
      setError(result.message || "Unable to update profile.");
      return;
    }

    setProfile(result.profile ?? null);
    setForm(toForm(result.profile ?? null));
    setIsEditing(false);
    setMessage("Profile saved successfully.");
  };

  const handleStartEdit = () => {
    setError("");
    setMessage("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setForm(toForm(profile));
    setError("");
    setMessage("");
    setIsEditing(false);
  };

  const handlePasswordFieldChange = (key) => (event) => {
    const value = typeof event?.target?.value === "string" ? event.target.value : "";
    setPasswordMessage("");
    setPasswordError("");
    setPasswordForm((previous) => ({
      ...previous,
      [key]: value
    }));
  };

  const handleShowPasswordForm = () => {
    setPasswordMessage("");
    setPasswordError("");
    setShowPasswordForm(true);
  };

  const handleCancelPasswordChange = () => {
    setShowPasswordForm(false);
    setPasswordSaving(false);
    setPasswordError("");
    setPasswordMessage("");
    setPasswordForm({
      currentPassword: "",
      newPassword: ""
    });
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    const currentPassword = passwordForm.currentPassword;
    const newPassword = passwordForm.newPassword;

    if (currentPassword.length === 0) {
      setPasswordError("Current password is required.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from the current password.");
      return;
    }

    setPasswordSaving(true);
    const result = await changeCurrentUserPassword(currentPassword, newPassword);
    setPasswordSaving(false);

    if (!result.ok) {
      setPasswordError(result.message || "Unable to update password.");
      return;
    }

    setPasswordMessage(result.message || "Password updated successfully.");
    setShowPasswordForm(false);
    setPasswordForm({
      currentPassword: "",
      newPassword: ""
    });
  };

  return (
    <div className={styles.pageShell}>
      <div className={styles.backgroundGlow} />
      <main className={styles.pageLayout}>
        <header className={styles.hero}>
          <div className={styles.identityWrap}>
            <div className={styles.avatar}>{avatarInitial}</div>
            <div className={styles.heroCopy}>
              <h1 className={styles.title}>Your Profile</h1>
              <p className={styles.subtitle}>
                Keep your account details updated for a smoother booking experience.
              </p>
              {currentUser ? <p className={styles.heroMeta}>{toDisplayValue(form.email)}</p> : null}
            </div>
          </div>
          <div className={styles.heroActions}>
            <Button variant="outline" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </header>

        {!currentUser && !loading ? (
          <section className={styles.panel}>
            <div className={styles.stack}>
              <div className={[styles.note, styles.noteWarning].join(" ")}>
                Sign in to access your profile details.
              </div>
              <Button asChild>
                <Link href="/login">Go to Login</Link>
              </Button>
            </div>
          </section>
        ) : null}

        {currentUser && loading ? (
          <section className={styles.panel}>
            <p className={styles.loadingText}>Loading profile details...</p>
          </section>
        ) : null}

        {currentUser && !loading ? (
          <section className={styles.panel}>
            <div className={styles.stack}>
              {hasMissingProfileFields ? (
                <div className={[styles.note, styles.noteInfo].join(" ")}>
                  Required details are missing. Click Edit Profile to complete your account.
                </div>
              ) : null}

              {error ? <div className={[styles.note, styles.noteError].join(" ")}>{error}</div> : null}
              {message ? <div className={[styles.note, styles.noteSuccess].join(" ")}>{message}</div> : null}

              {!isEditing ? (
                <div className={styles.readOnlyLayout}>
                  <aside className={styles.summaryCard}>
                    <p className={styles.summaryLabel}>Profile Completion</p>
                    <p className={styles.summaryValue}>{profileCompletion}%</p>
                    <div className={styles.progressTrack} aria-hidden="true">
                      <span className={styles.progressFill} style={{ width: `${profileCompletion}%` }} />
                    </div>
                    <p className={styles.summaryHint}>
                      {hasMissingProfileFields ? "Add missing details to complete your profile." : "All core details are available."}
                    </p>

                    <div className={styles.metaList}>
                      <div className={styles.metaRow}>
                        <p className={styles.metaLabel}>Name</p>
                        <p className={styles.metaValue}>{toDisplayValue(fullName)}</p>
                      </div>
                      <div className={styles.metaRow}>
                        <p className={styles.metaLabel}>Status</p>
                        <p
                          className={[
                            styles.statusBadge,
                            hasMissingProfileFields ? styles.statusPending : styles.statusComplete
                          ].join(" ")}
                        >
                          {hasMissingProfileFields ? "Needs update" : "Complete"}
                        </p>
                      </div>
                      <div className={styles.metaRow}>
                        <p className={styles.metaLabel}>Promotions</p>
                        <p className={styles.metaValue}>{form.promotionsOptIn ? "Subscribed" : "Not subscribed"}</p>
                      </div>
                    </div>

                    <Button type="button" onClick={handleStartEdit}>
                      Edit Profile
                    </Button>
                  </aside>

                  <section className={styles.detailsCard}>
                    <h2 className={styles.sectionHeading}>Account Details</h2>
                    <div className={styles.dataGrid}>
                      <div className={styles.dataCard}>
                        <p className={styles.dataLabel}>First Name</p>
                        <p className={styles.dataValue}>{toDisplayValue(form.firstName)}</p>
                      </div>
                      <div className={styles.dataCard}>
                        <p className={styles.dataLabel}>Last Name</p>
                        <p className={styles.dataValue}>{toDisplayValue(form.lastName)}</p>
                      </div>
                      <div className={styles.dataCard}>
                        <p className={styles.dataLabel}>Email</p>
                        <p className={styles.dataValue}>{toDisplayValue(form.email)}</p>
                      </div>
                      <div className={styles.dataCard}>
                        <p className={styles.dataLabel}>Mobile Number</p>
                        <p className={styles.dataValue}>{toDisplayValue(form.phone)}</p>
                      </div>
                      <div className={[styles.dataCard, styles.dataCardWide].join(" ")}>
                        <p className={styles.dataLabel}>Address</p>
                        <p className={styles.dataValue}>{toDisplayValue(addressText)}</p>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <form onSubmit={handleSave} className={styles.form}>
                  <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Personal</h3>
                    <div className={styles.gridTwo}>
                      <div className={styles.field}>
                        <Label htmlFor="profile-first-name">First Name</Label>
                        <Input
                          id="profile-first-name"
                          value={form.firstName}
                          onChange={handleChange("firstName")}
                          placeholder="First name"
                          required
                        />
                      </div>
                      <div className={styles.field}>
                        <Label htmlFor="profile-last-name">Last Name</Label>
                        <Input
                          id="profile-last-name"
                          value={form.lastName}
                          onChange={handleChange("lastName")}
                          placeholder="Last name"
                          required
                        />
                      </div>
                    </div>
                  </section>

                  <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Contact</h3>
                    <div className={styles.gridTwo}>
                      <div className={styles.field}>
                        <Label htmlFor="profile-email">Email</Label>
                        <Input
                          id="profile-email"
                          type="email"
                          value={form.email}
                          onChange={handleChange("email")}
                          disabled
                        />
                      </div>
                      <div className={styles.field}>
                        <Label htmlFor="profile-phone">Mobile Number</Label>
                        <Input
                          id="profile-phone"
                          type="tel"
                          value={form.phone}
                          onChange={handleChange("phone")}
                          placeholder="Mobile number"
                          required
                        />
                      </div>
                    </div>
                  </section>

                  <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Address</h3>
                    <div className={styles.gridTwo}>
                      <div className={styles.field}>
                        <Label htmlFor="profile-street">Street</Label>
                        <Input
                          id="profile-street"
                          value={form.street}
                          onChange={handleChange("street")}
                          placeholder="Street address"
                        />
                      </div>
                      <div className={styles.field}>
                        <Label htmlFor="profile-city">City</Label>
                        <Input
                          id="profile-city"
                          value={form.city}
                          onChange={handleChange("city")}
                          placeholder="City"
                        />
                      </div>
                      <div className={styles.field}>
                        <Label htmlFor="profile-state">State</Label>
                        <Input
                          id="profile-state"
                          value={form.state}
                          onChange={handleChange("state")}
                          placeholder="State"
                        />
                      </div>
                      <div className={styles.field}>
                        <Label htmlFor="profile-zip">ZIP</Label>
                        <Input
                          id="profile-zip"
                          value={form.zip}
                          onChange={handleChange("zip")}
                          placeholder="ZIP code"
                        />
                      </div>
                    </div>
                  </section>

                  <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Preferences</h3>
                    <div className={styles.checkboxRow}>
                      <Checkbox
                        checked={form.promotionsOptIn}
                        onCheckedChange={(checked) =>
                          setForm((previous) => ({
                            ...previous,
                            promotionsOptIn: Boolean(checked)
                          }))
                        }
                      />
                      <Label>Send me promotions and release updates</Label>
                    </div>
                  </section>

                  <div className={styles.actionsRow}>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save Profile"}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={saving}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </section>
        ) : null}

        {currentUser && !loading && canChangePassword ? (
          <section className={styles.panel}>
            <div className={styles.stack}>
              <h2 className={styles.sectionHeading}>Security</h2>

              {passwordError ? (
                <div className={[styles.note, styles.noteError].join(" ")}>{passwordError}</div>
              ) : null}
              {passwordMessage ? (
                <div className={[styles.note, styles.noteSuccess].join(" ")}>{passwordMessage}</div>
              ) : null}

              {!showPasswordForm ? (
                <div className={styles.actionsRow}>
                  <Button type="button" variant="outline" onClick={handleShowPasswordForm}>
                    Change Password
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePasswordChange} className={styles.form}>
                  <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Update Password</h3>
                    <div className={styles.gridTwo}>
                      <div className={styles.field}>
                        <Label htmlFor="profile-current-password">Current Password</Label>
                        <Input
                          id="profile-current-password"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={handlePasswordFieldChange("currentPassword")}
                          placeholder="Enter current password"
                          autoComplete="current-password"
                          required
                        />
                      </div>
                      <div className={styles.field}>
                        <Label htmlFor="profile-new-password">New Password</Label>
                        <Input
                          id="profile-new-password"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={handlePasswordFieldChange("newPassword")}
                          placeholder="Enter new password"
                          autoComplete="new-password"
                          required
                        />
                      </div>
                    </div>
                    <p className={styles.securityHint}>
                      New password must be at least 6 characters.
                    </p>
                  </section>

                  <div className={styles.actionsRow}>
                    <Button type="submit" disabled={passwordSaving}>
                      {passwordSaving ? "Updating..." : "Update Password"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelPasswordChange}
                      disabled={passwordSaving}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
