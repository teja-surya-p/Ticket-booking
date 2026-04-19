"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changeCurrentUserPassword,
  deleteSavedCard as deleteSavedCardRequest,
  fetchSavedCards,
  fetchCurrentUserProfile,
  getMeaningfulErrorMessage,
  isAPICallError,
  savePaymentCard,
  subscribeToAuthState,
  updateSavedCard as updateSavedCardRequest,
  updateCurrentUserProfile
} from "@/services";
import { fetchAvailablePromoCodes } from "@/services/promoCodesApi";
import { cancelBooking, fetchUserBookings } from "@/services/bookingApi";
import { Check, Clock, Copy, Tag, Ticket } from "lucide-react";
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

function formatCardExpiry(month, year) {
  const normalizedMonth = Number(month);
  const normalizedYear = Number(year);
  const monthText =
    Number.isInteger(normalizedMonth) && normalizedMonth > 0
      ? String(normalizedMonth).padStart(2, "0")
      : "--";
  const yearText =
    Number.isInteger(normalizedYear) && normalizedYear > 0 ? String(normalizedYear) : "----";

  return `${monthText}/${yearText}`;
}

function createEmptyCardForm() {
  return {
    cardholderName: "",
    cardNumber: "",
    cvv: "",
    expMonth: "",
    expYear: ""
  };
}

function createEmptyCardFieldErrors() {
  return {
    cardholderName: "",
    cardNumber: "",
    cvv: "",
    expMonth: "",
    expYear: ""
  };
}

function createEmptyEditCardForm() {
  return {
    cardholderName: "",
    expMonth: "",
    expYear: ""
  };
}

function createEmptyEditCardFieldErrors() {
  return {
    cardholderName: "",
    expMonth: "",
    expYear: ""
  };
}

function toMaxCardsAllowed(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3;
}

function mapPaymentMessageToField(message) {
  const normalizedMessage = typeof message === "string" ? message.trim() : "";
  const lowerMessage = normalizedMessage.toLowerCase();

  if (!normalizedMessage) {
    return null;
  }

  if (lowerMessage.includes("cardnumber") || lowerMessage.includes("card number")) {
    return "cardNumber";
  }

  if (
    lowerMessage.includes("cardholdername") ||
    lowerMessage.includes("card holder") ||
    lowerMessage.includes("cardholder")
  ) {
    return "cardholderName";
  }

  if (lowerMessage.includes("cvv")) {
    return "cvv";
  }

  if (
    lowerMessage.includes("expmonth") ||
    lowerMessage.includes("expiry month") ||
    lowerMessage.includes("expiration month")
  ) {
    return "expMonth";
  }

  if (
    lowerMessage.includes("expyear") ||
    lowerMessage.includes("expiry year") ||
    lowerMessage.includes("expiration year") ||
    lowerMessage.includes("expiry date") ||
    lowerMessage.includes("expiration date")
  ) {
    return "expYear";
  }

  return null;
}

function getCardErrorMessage(error) {
  if (isAPICallError(error)) {
    const serverMessage = typeof error?.message === "string" ? error.message.trim() : "";
    if (serverMessage.length > 0) {
      if (
        /cardnumber|card number/i.test(serverMessage) &&
        /invalid|not valid|failed/i.test(serverMessage)
      ) {
        return "Invalid card number.";
      }

      return serverMessage;
    }
  }

  return getMeaningfulErrorMessage(error, "user");
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
  const [savedCards, setSavedCards] = useState([]);
  const [savedCardsLoading, setSavedCardsLoading] = useState(false);
  const [savedCardsError, setSavedCardsError] = useState("");
  const [maxCardsAllowed, setMaxCardsAllowed] = useState(3);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [addCardSaving, setAddCardSaving] = useState(false);
  const [addCardError, setAddCardError] = useState("");
  const [addCardMessage, setAddCardMessage] = useState("");
  const [addCardForm, setAddCardForm] = useState(createEmptyCardForm());
  const [addCardFieldErrors, setAddCardFieldErrors] = useState(createEmptyCardFieldErrors());
  const [editingCardId, setEditingCardId] = useState("");
  const [editCardForm, setEditCardForm] = useState(createEmptyEditCardForm());
  const [editCardFieldErrors, setEditCardFieldErrors] = useState(createEmptyEditCardFieldErrors());
  const [editCardSaving, setEditCardSaving] = useState(false);
  const [deleteCardSaving, setDeleteCardSaving] = useState(false);
  const [deleteTargetCardId, setDeleteTargetCardId] = useState("");
  const [availablePromoCodes, setAvailablePromoCodes] = useState([]);
  const [promoCodesLoading, setPromoCodesLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");
  const [userBookings, setUserBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelInProgress, setCancelInProgress] = useState(false);
  const [cancelError, setCancelError] = useState("");

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

  useEffect(() => {
    let cancelled = false;

    const loadSavedCards = async () => {
      if (!currentUser) {
        setSavedCards([]);
        setSavedCardsLoading(false);
        setSavedCardsError("");
        setMaxCardsAllowed(3);
        setShowAddCardForm(false);
        setAddCardSaving(false);
        setAddCardError("");
        setAddCardMessage("");
        setAddCardForm(createEmptyCardForm());
        setAddCardFieldErrors(createEmptyCardFieldErrors());
        setEditingCardId("");
        setEditCardForm(createEmptyEditCardForm());
        setEditCardFieldErrors(createEmptyEditCardFieldErrors());
        setEditCardSaving(false);
        setDeleteCardSaving(false);
        setDeleteTargetCardId("");
        return;
      }

      const userEmail =
        typeof currentUser.email === "string" ? currentUser.email.trim().toLowerCase() : "";
      if (userEmail.length === 0) {
        setSavedCards([]);
        setSavedCardsLoading(false);
        setSavedCardsError("Email is not available for this account.");
        setShowAddCardForm(false);
        setEditingCardId("");
        setEditCardForm(createEmptyEditCardForm());
        setEditCardFieldErrors(createEmptyEditCardFieldErrors());
        setDeleteTargetCardId("");
        return;
      }

      setSavedCardsLoading(true);
      setSavedCardsError("");

      try {
        const token = await currentUser.getIdToken();
        const response = await fetchSavedCards(
          userEmail,
          typeof currentUser.uid === "string" ? currentUser.uid : undefined,
          token
        );

        if (cancelled) {
          return;
        }

        setSavedCards(Array.isArray(response?.cards) ? response.cards : []);
        setMaxCardsAllowed(toMaxCardsAllowed(response?.maxCardsAllowed));
        setShowAddCardForm(false);
        setEditingCardId("");
        setEditCardForm(createEmptyEditCardForm());
        setEditCardFieldErrors(createEmptyEditCardFieldErrors());
        setDeleteTargetCardId("");
        setAddCardSaving(false);
        setEditCardSaving(false);
        setDeleteCardSaving(false);
      } catch (loadCardsError) {
        if (cancelled) {
          return;
        }

        setSavedCards([]);
        setMaxCardsAllowed(3);
        setSavedCardsError(getMeaningfulErrorMessage(loadCardsError, "user"));
        setShowAddCardForm(false);
        setEditingCardId("");
        setEditCardForm(createEmptyEditCardForm());
        setEditCardFieldErrors(createEmptyEditCardFieldErrors());
        setDeleteTargetCardId("");
        setAddCardSaving(false);
        setEditCardSaving(false);
        setDeleteCardSaving(false);
      } finally {
        if (!cancelled) {
          setSavedCardsLoading(false);
        }
      }
    };

    void loadSavedCards();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, currentUser?.email]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setAvailablePromoCodes([]);
      return;
    }
    setPromoCodesLoading(true);
    fetchAvailablePromoCodes(currentUser.uid)
      .then((data) => setAvailablePromoCodes(Array.isArray(data) ? data : []))
      .catch(() => setAvailablePromoCodes([]))
      .finally(() => setPromoCodesLoading(false));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser) {
      setUserBookings([]);
      return;
    }
    let cancelled = false;
    setBookingsLoading(true);
    currentUser.getIdToken()
      .then((token) => fetchUserBookings(token))
      .then((data) => { if (!cancelled) setUserBookings(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setUserBookings([]); })
      .finally(() => { if (!cancelled) setBookingsLoading(false); });
    return () => { cancelled = true; };
  }, [currentUser]);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(""), 2000);
    });
  };

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
  const canAddMoreCards = useMemo(
    () => savedCards.length < maxCardsAllowed,
    [savedCards.length, maxCardsAllowed]
  );
  const deleteTargetCard = useMemo(
    () => savedCards.find((card) => card.cardId === deleteTargetCardId) ?? null,
    [savedCards, deleteTargetCardId]
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

    const passwordErrors = [];
    if (newPassword.length < 8) passwordErrors.push("at least 8 characters");
    if (!/[A-Z]/.test(newPassword)) passwordErrors.push("one uppercase letter");
    if (!/[a-z]/.test(newPassword)) passwordErrors.push("one lowercase letter");
    if (!/[0-9]/.test(newPassword)) passwordErrors.push("one number");
    if (passwordErrors.length > 0) {
      setPasswordError(`New password must contain: ${passwordErrors.join(", ")}.`);
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

  const handleAddCardFieldChange = (key) => (event) => {
    const value = typeof event?.target?.value === "string" ? event.target.value : "";
    setAddCardMessage("");
    setAddCardError("");
    setAddCardFieldErrors((previous) => ({
      ...previous,
      [key]: ""
    }));

    setAddCardForm((previous) => {
      if (key === "cardNumber") {
        return {
          ...previous,
          cardNumber: value.replace(/[^\d\s]/g, "").slice(0, 23)
        };
      }

      if (key === "expMonth") {
        return {
          ...previous,
          expMonth: value.replace(/\D/g, "").slice(0, 2)
        };
      }

      if (key === "cvv") {
        return {
          ...previous,
          cvv: value.replace(/\D/g, "").slice(0, 4)
        };
      }

      if (key === "expYear") {
        return {
          ...previous,
          expYear: value.replace(/\D/g, "").slice(0, 4)
        };
      }

      return {
        ...previous,
        [key]: value
      };
    });
  };

  const handleToggleAddCard = () => {
    if (showAddCardForm) {
      setShowAddCardForm(false);
      setAddCardError("");
      setAddCardMessage("");
      setAddCardFieldErrors(createEmptyCardFieldErrors());
      setAddCardForm(createEmptyCardForm());
      return;
    }

    setAddCardError("");
    setAddCardMessage("");
    setAddCardFieldErrors(createEmptyCardFieldErrors());
    setEditingCardId("");
    setEditCardForm(createEmptyEditCardForm());
    setEditCardFieldErrors(createEmptyEditCardFieldErrors());
    setShowAddCardForm(true);
  };

  const handleSaveCard = async (event) => {
    event.preventDefault();
    setAddCardMessage("");
    setAddCardError("");
    setEditCardFieldErrors(createEmptyEditCardFieldErrors());
    const nextFieldErrors = createEmptyCardFieldErrors();

    if (!currentUser) {
      setAddCardError("Please sign in to save a card.");
      return;
    }

    if (!canAddMoreCards) {
      setAddCardError(`You can save up to ${maxCardsAllowed} cards only.`);
      return;
    }

    const fallbackName = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ");
    const cardholderName = addCardForm.cardholderName.trim() || fallbackName;
    if (cardholderName.length === 0) {
      nextFieldErrors.cardholderName = "Cardholder name is required.";
    } else if (!/^[a-zA-Z\s'\-]+$/.test(cardholderName)) {
      nextFieldErrors.cardholderName = "Name can only contain letters, spaces, hyphens, or apostrophes.";
    } else if (cardholderName.length > 100) {
      nextFieldErrors.cardholderName = "Name must be 100 characters or fewer.";
    }

    if (!addCardForm.cardNumber) {
      nextFieldErrors.cardNumber = "Card number is required.";
    } else {
      const digits = addCardForm.cardNumber.replace(/\s/g, "");
      if (!/^\d+$/.test(digits)) {
        nextFieldErrors.cardNumber = "Card number must contain digits only.";
      } else if (digits.length < 13 || digits.length > 19) {
        nextFieldErrors.cardNumber = "Card number must be between 13 and 19 digits.";
      }
    }

    if (!addCardForm.cvv) {
      nextFieldErrors.cvv = "CVV is required.";
    } else if (!/^\d{3,4}$/.test(addCardForm.cvv)) {
      nextFieldErrors.cvv = "CVV must be 3 or 4 digits.";
    }

    if (!addCardForm.expMonth) {
      nextFieldErrors.expMonth = "Expiry month is required.";
    } else {
      const month = Number(addCardForm.expMonth);
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        nextFieldErrors.expMonth = "Month must be between 01 and 12.";
      }
    }

    if (!addCardForm.expYear) {
      nextFieldErrors.expYear = "Expiry year is required.";
    } else {
      const year = Number(addCardForm.expYear);
      const currentYear = new Date().getFullYear();
      if (!Number.isInteger(year) || year < currentYear || year > currentYear + 20) {
        nextFieldErrors.expYear = `Year must be between ${currentYear} and ${currentYear + 20}.`;
      }
    }

    if (!nextFieldErrors.expMonth && !nextFieldErrors.expYear && addCardForm.expMonth && addCardForm.expYear) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const month = Number(addCardForm.expMonth);
      const year = Number(addCardForm.expYear);
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        nextFieldErrors.expYear = "This card has expired.";
      }
    }

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setAddCardFieldErrors(nextFieldErrors);
      return;
    }

    const userEmail =
      typeof currentUser.email === "string" ? currentUser.email.trim().toLowerCase() : "";
    if (userEmail.length === 0) {
      setAddCardError("Email is not available for this account.");
      return;
    }

    setAddCardSaving(true);

    try {
      const token = await currentUser.getIdToken();
      const response = await savePaymentCard(
        {
          customerUid: typeof currentUser.uid === "string" ? currentUser.uid : undefined,
          customerEmail: userEmail,
          cardholderName,
          cardNumber: addCardForm.cardNumber,
          cvv: addCardForm.cvv,
          expMonth: Number(addCardForm.expMonth),
          expYear: Number(addCardForm.expYear)
        },
        token
      );

      const cards = Array.isArray(response?.cards) ? response.cards : [];
      setSavedCards(cards);
      setMaxCardsAllowed(toMaxCardsAllowed(response?.maxCardsAllowed));
      setSavedCardsError("");
      setShowAddCardForm(false);
      setEditingCardId("");
      setEditCardForm(createEmptyEditCardForm());
      setEditCardFieldErrors(createEmptyEditCardFieldErrors());
      setAddCardError("");
      setAddCardMessage("Card saved successfully.");
      setAddCardForm(createEmptyCardForm());
      setAddCardFieldErrors(createEmptyCardFieldErrors());
    } catch (saveCardError) {
      const message = getCardErrorMessage(saveCardError);
      const field = mapPaymentMessageToField(message);

      if (field) {
        setAddCardFieldErrors({
          ...createEmptyCardFieldErrors(),
          [field]: message
        });
        setAddCardError("");
      } else {
        setAddCardFieldErrors(createEmptyCardFieldErrors());
        setAddCardError(message);
      }
    } finally {
      setAddCardSaving(false);
    }
  };

  const handleStartEditCard = (card) => {
    if (!card || typeof card.cardId !== "string" || card.cardId.trim().length === 0) {
      return;
    }

    setShowAddCardForm(false);
    setAddCardError("");
    setAddCardMessage("");
    setAddCardFieldErrors(createEmptyCardFieldErrors());
    setAddCardForm(createEmptyCardForm());
    setDeleteTargetCardId("");
    setEditingCardId(card.cardId);
    setEditCardFieldErrors(createEmptyEditCardFieldErrors());
    setEditCardForm({
      cardholderName:
        typeof card.cardholderName === "string" ? card.cardholderName.trim() : "",
      expMonth:
        Number.isFinite(Number(card.expMonth)) && Number(card.expMonth) > 0
          ? String(card.expMonth)
          : "",
      expYear:
        Number.isFinite(Number(card.expYear)) && Number(card.expYear) > 0
          ? String(card.expYear)
          : ""
    });
  };

  const handleCancelEditCard = () => {
    setEditingCardId("");
    setEditCardForm(createEmptyEditCardForm());
    setEditCardFieldErrors(createEmptyEditCardFieldErrors());
    setAddCardError("");
  };

  const handleEditCardFieldChange = (key) => (event) => {
    const value = typeof event?.target?.value === "string" ? event.target.value : "";
    setAddCardMessage("");
    setAddCardError("");
    setEditCardFieldErrors((previous) => ({
      ...previous,
      [key]: ""
    }));

    setEditCardForm((previous) => {
      if (key === "expMonth") {
        return {
          ...previous,
          expMonth: value.replace(/\D/g, "").slice(0, 2)
        };
      }

      if (key === "expYear") {
        return {
          ...previous,
          expYear: value.replace(/\D/g, "").slice(0, 4)
        };
      }

      return {
        ...previous,
        [key]: value
      };
    });
  };

  const handleUpdateCard = async (event) => {
    event.preventDefault();
    setAddCardMessage("");
    setAddCardError("");
    setAddCardFieldErrors(createEmptyCardFieldErrors());
    const normalizedCardId = typeof editingCardId === "string" ? editingCardId.trim() : "";

    if (!currentUser) {
      setAddCardError("Please sign in to update a card.");
      return;
    }

    if (normalizedCardId.length === 0) {
      setAddCardError("Select a valid card to update.");
      return;
    }

    const nextFieldErrors = createEmptyEditCardFieldErrors();
    const cardholderName = editCardForm.cardholderName.trim();
    const expMonthValue = editCardForm.expMonth.trim();
    const expYearValue = editCardForm.expYear.trim();

    if (cardholderName.length === 0) {
      nextFieldErrors.cardholderName = "Cardholder name is required.";
    } else if (!/^[a-zA-Z\s'\-]+$/.test(cardholderName)) {
      nextFieldErrors.cardholderName = "Name can only contain letters, spaces, hyphens, or apostrophes.";
    } else if (cardholderName.length > 100) {
      nextFieldErrors.cardholderName = "Name must be 100 characters or fewer.";
    }

    if (expMonthValue.length === 0) {
      nextFieldErrors.expMonth = "Expiry month is required.";
    } else {
      const month = Number(expMonthValue);
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        nextFieldErrors.expMonth = "Month must be between 01 and 12.";
      }
    }

    if (expYearValue.length === 0) {
      nextFieldErrors.expYear = "Expiry year is required.";
    } else {
      const year = Number(expYearValue);
      const currentYear = new Date().getFullYear();
      if (!Number.isInteger(year) || year < currentYear || year > currentYear + 20) {
        nextFieldErrors.expYear = `Year must be between ${currentYear} and ${currentYear + 20}.`;
      }
    }

    if (!nextFieldErrors.expMonth && !nextFieldErrors.expYear && expMonthValue && expYearValue) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const month = Number(expMonthValue);
      const year = Number(expYearValue);
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        nextFieldErrors.expYear = "This card has expired.";
      }
    }

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setEditCardFieldErrors(nextFieldErrors);
      return;
    }

    setEditCardSaving(true);

    try {
      const token = await currentUser.getIdToken();
      const response = await updateSavedCardRequest(
        normalizedCardId,
        {
          cardholderName,
          expMonth: Number(expMonthValue),
          expYear: Number(expYearValue)
        },
        token
      );
      const cards = Array.isArray(response?.cards) ? response.cards : [];

      setSavedCards(cards);
      setMaxCardsAllowed(toMaxCardsAllowed(response?.maxCardsAllowed));
      setSavedCardsError("");
      setEditingCardId("");
      setEditCardForm(createEmptyEditCardForm());
      setEditCardFieldErrors(createEmptyEditCardFieldErrors());
      setAddCardFieldErrors(createEmptyCardFieldErrors());
      setAddCardMessage("Card updated successfully.");
    } catch (updateCardError) {
      const message = getCardErrorMessage(updateCardError);
      const field = mapPaymentMessageToField(message);

      if (field && Object.prototype.hasOwnProperty.call(createEmptyEditCardFieldErrors(), field)) {
        setEditCardFieldErrors({
          ...createEmptyEditCardFieldErrors(),
          [field]: message
        });
        setAddCardError("");
      } else {
        setEditCardFieldErrors(createEmptyEditCardFieldErrors());
        setAddCardError(message);
      }
    } finally {
      setEditCardSaving(false);
    }
  };

  const handleDeleteCard = async (cardIdOverride = deleteTargetCardId) => {
    const normalizedCardId =
      typeof cardIdOverride === "string" ? cardIdOverride.trim() : "";

    if (!currentUser) {
      setAddCardError("Please sign in to delete a card.");
      setDeleteTargetCardId("");
      return;
    }

    if (normalizedCardId.length === 0) {
      setAddCardError("Select a valid card to delete.");
      setDeleteTargetCardId("");
      return;
    }

    setDeleteCardSaving(true);
    setAddCardMessage("");
    setAddCardError("");
    setAddCardFieldErrors(createEmptyCardFieldErrors());

    try {
      const token = await currentUser.getIdToken();
      const response = await deleteSavedCardRequest(normalizedCardId, token);
      const cards = Array.isArray(response?.cards) ? response.cards : [];

      setSavedCards(cards);
      setMaxCardsAllowed(toMaxCardsAllowed(response?.maxCardsAllowed));
      setSavedCardsError("");
      setDeleteTargetCardId("");
      setEditingCardId((previous) =>
        previous === normalizedCardId ? "" : previous
      );
      setEditCardForm(createEmptyEditCardForm());
      setEditCardFieldErrors(createEmptyEditCardFieldErrors());
      setAddCardFieldErrors(createEmptyCardFieldErrors());
      setAddCardMessage(
        cards.length === 0 ? "Card deleted. No saved cards found." : "Card deleted successfully."
      );
    } catch (deleteCardError) {
      setAddCardError(getCardErrorMessage(deleteCardError));
    } finally {
      setDeleteCardSaving(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelTarget || !currentUser) return;
    setCancelInProgress(true);
    setCancelError("");
    try {
      const token = await currentUser.getIdToken();
      await cancelBooking(cancelTarget.bookingId, token);
      const fresh = await fetchUserBookings(token);
      setUserBookings(Array.isArray(fresh) ? fresh : []);
      setCancelTarget(null);
    } catch (err) {
      const msg = err?.message ?? "Something went wrong. Please try again.";
      setCancelError(msg);
      console.error("[CancelBooking]", err);
    } finally {
      setCancelInProgress(false);
    }
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

                    <section className={styles.savedCardsSection}>
                      <div className={styles.savedCardsHeader}>
                        <h3 className={styles.savedCardsTitle}>Saved Cards</h3>
                        <p className={styles.savedCardsCount}>
                          {savedCards.length}/{maxCardsAllowed} saved
                        </p>
                      </div>

                      <div className={styles.savedCardsToolbar}>
                        <Button
                          type="button"
                          size="sm"
                          variant={showAddCardForm ? "outline" : "default"}
                          onClick={handleToggleAddCard}
                          disabled={
                            savedCardsLoading ||
                            addCardSaving ||
                            editCardSaving ||
                            deleteCardSaving ||
                            (!showAddCardForm && !canAddMoreCards)
                          }
                        >
                          {showAddCardForm ? "Cancel Add Card" : "Add Card"}
                        </Button>
                      </div>

                      {addCardMessage ? (
                        <p className={styles.savedCardsSuccess}>{addCardMessage}</p>
                      ) : null}
                      {addCardError ? (
                        <p className={styles.savedCardsError}>{addCardError}</p>
                      ) : null}
                      {!canAddMoreCards && !showAddCardForm ? (
                        <p className={styles.savedCardsHint}>
                          You can save up to {maxCardsAllowed} cards only.
                        </p>
                      ) : null}

                      {showAddCardForm ? (
                        <form onSubmit={handleSaveCard} className={styles.addCardForm}>
                          <div className={styles.gridTwo}>
                            <div className={styles.field}>
                              <Label htmlFor="profile-cardholder">Card Holder Name</Label>
                              <Input
                                id="profile-cardholder"
                                value={addCardForm.cardholderName}
                                onChange={handleAddCardFieldChange("cardholderName")}
                                placeholder="Name on card"
                                autoComplete="cc-name"
                              />
                              {addCardFieldErrors.cardholderName ? (
                                <p className={styles.savedCardFieldError}>
                                  {addCardFieldErrors.cardholderName}
                                </p>
                              ) : null}
                            </div>
                            <div className={styles.field}>
                              <Label htmlFor="profile-card-number">Card Number</Label>
                              <Input
                                id="profile-card-number"
                                value={addCardForm.cardNumber}
                                onChange={handleAddCardFieldChange("cardNumber")}
                                placeholder="4242 4242 4242 4242"
                                autoComplete="cc-number"
                                inputMode="numeric"
                              />
                              {addCardFieldErrors.cardNumber ? (
                                <p className={styles.savedCardFieldError}>
                                  {addCardFieldErrors.cardNumber}
                                </p>
                              ) : null}
                            </div>
                            <div className={styles.field}>
                              <Label htmlFor="profile-card-exp-month">Expiry Month</Label>
                              <Input
                                id="profile-card-exp-month"
                                value={addCardForm.expMonth}
                                onChange={handleAddCardFieldChange("expMonth")}
                                placeholder="MM"
                                autoComplete="cc-exp-month"
                                inputMode="numeric"
                              />
                              {addCardFieldErrors.expMonth ? (
                                <p className={styles.savedCardFieldError}>
                                  {addCardFieldErrors.expMonth}
                                </p>
                              ) : null}
                            </div>
                            <div className={styles.field}>
                              <Label htmlFor="profile-card-cvv">CVV</Label>
                              <Input
                                id="profile-card-cvv"
                                value={addCardForm.cvv}
                                onChange={handleAddCardFieldChange("cvv")}
                                placeholder="123"
                                autoComplete="cc-csc"
                                inputMode="numeric"
                              />
                              {addCardFieldErrors.cvv ? (
                                <p className={styles.savedCardFieldError}>{addCardFieldErrors.cvv}</p>
                              ) : null}
                            </div>
                            <div className={styles.field}>
                              <Label htmlFor="profile-card-exp-year">Expiry Year</Label>
                              <Input
                                id="profile-card-exp-year"
                                value={addCardForm.expYear}
                                onChange={handleAddCardFieldChange("expYear")}
                                placeholder="YYYY"
                                autoComplete="cc-exp-year"
                                inputMode="numeric"
                              />
                              {addCardFieldErrors.expYear ? (
                                <p className={styles.savedCardFieldError}>
                                  {addCardFieldErrors.expYear}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className={styles.savedCardsToolbar}>
                            <Button
                              type="submit"
                              size="sm"
                              disabled={addCardSaving || editCardSaving || deleteCardSaving}
                            >
                              {addCardSaving ? "Saving..." : "Save Card"}
                            </Button>
                          </div>
                        </form>
                      ) : null}

                      {savedCardsLoading ? (
                        <p className={styles.savedCardsHint}>Loading saved cards...</p>
                      ) : savedCardsError ? (
                        <p className={styles.savedCardsError}>{savedCardsError}</p>
                      ) : savedCards.length === 0 ? (
                        <p className={styles.savedCardsHint}>No saved cards found.</p>
                      ) : (
                        <div className={styles.savedCardsGrid}>
                          {savedCards.map((card) => (
                            <article key={card.cardId} className={styles.savedCardItem}>
                              <div className={styles.savedCardTopRow}>
                                <p className={styles.savedCardBrand}>
                                  {card.brand || "Card"} •••• {card.last4 || "0000"}
                                </p>
                                <div className={styles.savedCardActions}>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStartEditCard(card)}
                                    disabled={addCardSaving || editCardSaving || deleteCardSaving}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setDeleteTargetCardId(card.cardId)}
                                    disabled={addCardSaving || editCardSaving || deleteCardSaving}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                              <p className={styles.savedCardMeta}>
                                Cardholder: {toDisplayValue(card.cardholderName)}
                              </p>
                              <p className={styles.savedCardMeta}>
                                Expires {formatCardExpiry(card.expMonth, card.expYear)}
                              </p>

                              {editingCardId === card.cardId ? (
                                <form onSubmit={handleUpdateCard} className={styles.savedCardEditForm}>
                                  <div className={styles.savedCardEditGrid}>
                                    <div className={styles.field}>
                                      <Label htmlFor={`profile-edit-cardholder-${card.cardId}`}>
                                        Card Holder Name
                                      </Label>
                                      <Input
                                        id={`profile-edit-cardholder-${card.cardId}`}
                                        value={editCardForm.cardholderName}
                                        onChange={handleEditCardFieldChange("cardholderName")}
                                        placeholder="Name on card"
                                        autoComplete="cc-name"
                                      />
                                      {editCardFieldErrors.cardholderName ? (
                                        <p className={styles.savedCardFieldError}>
                                          {editCardFieldErrors.cardholderName}
                                        </p>
                                      ) : null}
                                    </div>
                                    <div className={styles.field}>
                                      <Label htmlFor={`profile-edit-exp-month-${card.cardId}`}>
                                        Expiry Month
                                      </Label>
                                      <Input
                                        id={`profile-edit-exp-month-${card.cardId}`}
                                        value={editCardForm.expMonth}
                                        onChange={handleEditCardFieldChange("expMonth")}
                                        placeholder="MM"
                                        autoComplete="cc-exp-month"
                                        inputMode="numeric"
                                      />
                                      {editCardFieldErrors.expMonth ? (
                                        <p className={styles.savedCardFieldError}>
                                          {editCardFieldErrors.expMonth}
                                        </p>
                                      ) : null}
                                    </div>
                                    <div className={styles.field}>
                                      <Label htmlFor={`profile-edit-exp-year-${card.cardId}`}>
                                        Expiry Year
                                      </Label>
                                      <Input
                                        id={`profile-edit-exp-year-${card.cardId}`}
                                        value={editCardForm.expYear}
                                        onChange={handleEditCardFieldChange("expYear")}
                                        placeholder="YYYY"
                                        autoComplete="cc-exp-year"
                                        inputMode="numeric"
                                      />
                                      {editCardFieldErrors.expYear ? (
                                        <p className={styles.savedCardFieldError}>
                                          {editCardFieldErrors.expYear}
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className={styles.savedCardsToolbar}>
                                    <Button type="submit" size="sm" disabled={editCardSaving || deleteCardSaving}>
                                      {editCardSaving ? "Updating..." : "Update Card"}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCancelEditCard}
                                      disabled={editCardSaving || deleteCardSaving}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </form>
                              ) : null}
                            </article>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className={styles.savedCardsSection}>
                      <div className={styles.savedCardsHeader}>
                        <h3 className={styles.savedCardsTitle}>Available Promotions</h3>
                        {availablePromoCodes.length > 0 && (
                          <p className={styles.savedCardsCount}>{availablePromoCodes.length} available</p>
                        )}
                      </div>
                      {promoCodesLoading ? (
                        <p className={styles.savedCardsHint}>Loading promotions...</p>
                      ) : availablePromoCodes.length === 0 ? (
                        <p className={styles.savedCardsHint}>No active promotions at the moment.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                          {availablePromoCodes.map((promo) => (
                            <div
                              key={promo.code}
                              onClick={() => handleCopyCode(promo.code)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "0.6rem 0.85rem",
                                borderRadius: "0.5rem",
                                border: "1px dashed color-mix(in srgb, var(--color-primary, #e05a7a) 45%, transparent)",
                                background: "color-mix(in srgb, var(--color-primary, #e05a7a) 7%, transparent)",
                                cursor: "pointer",
                                userSelect: "none"
                              }}
                              title="Click to copy code"
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <Tag size={14} style={{ color: "var(--color-primary, #e05a7a)", flexShrink: 0 }} />
                                <span style={{ fontWeight: 700, letterSpacing: "0.07em", fontSize: "0.9rem" }}>
                                  {promo.code}
                                </span>
                                <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                                  — {promo.discountPercent}% off
                                </span>
                                {promo.expiresAt && (
                                  <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>
                                    · Expires {new Date(promo.expiresAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCopyCode(promo.code); }}
                                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: copiedCode === promo.code ? "var(--color-success, #22c55e)" : "var(--color-primary, #e05a7a)", padding: "0.2rem" }}
                                aria-label={copiedCode === promo.code ? "Copied!" : "Copy code"}
                                title={copiedCode === promo.code ? "Copied!" : "Copy code"}
                              >
                                {copiedCode === promo.code
                                  ? <Check size={15} />
                                  : <Copy size={15} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
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
                      New password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.
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

        {currentUser && (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelIcon}><Ticket size={18} /></div>
              <div>
                <h2 className={styles.panelTitle}>My Bookings</h2>
                <p className={styles.panelSubtitle}>Your upcoming and past movie bookings.</p>
              </div>
            </div>

            <div className={styles.panelBody}>
              {bookingsLoading ? (
                <p className={styles.muted}>Loading bookings…</p>
              ) : userBookings.length === 0 ? (
                <p className={styles.muted}>No bookings yet.</p>
              ) : (() => {
                const now = new Date();

                const computeRefund = (showtime, total) => {
                  const hours = (new Date(showtime) - now) / 3_600_000;
                  const pct = hours >= 24 ? 100 : hours >= 12 ? 40 : 0;
                  return { pct, amount: Math.round(Number(total) * pct) / 100 };
                };

                const formatShowtime = (iso) => {
                  const d = new Date(iso);
                  if (isNaN(d.getTime())) return iso;
                  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
                  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" });
                  return `${date} · ${time}`;
                };

                const formatTickets = (tickets) => {
                  const parts = [];
                  if (tickets?.adult > 0) parts.push(`${tickets.adult} Adult`);
                  if (tickets?.child > 0) parts.push(`${tickets.child} Child`);
                  if (tickets?.senior > 0) parts.push(`${tickets.senior} Senior`);
                  return parts.join(", ") || "—";
                };

                const getBadge = (booking) => {
                  if (booking.status === "cancelled") {
                    return { label: "Cancelled", bg: "color-mix(in oklch, #ef4444 15%, transparent)", color: "#ef4444" };
                  }
                  if (new Date(booking.showtime) > now) {
                    return { label: "Upcoming", bg: "color-mix(in oklch, var(--primary) 15%, transparent)", color: "var(--primary)" };
                  }
                  return { label: "Completed", bg: "var(--muted)", color: "var(--muted-foreground)" };
                };

                const sorted = [...userBookings].sort(
                  (a, b) => new Date(a.showtime) - new Date(b.showtime)
                );

                const BookingCard = ({ booking }) => {
                  const badge = getBadge(booking);
                  const isCancellable = booking.status === "confirmed" && new Date(booking.showtime) > now;
                  const refund = isCancellable ? computeRefund(booking.showtime, booking.total) : null;

                  return (
                    <div style={{
                      display: "flex", gap: "0.875rem", padding: "1rem",
                      borderRadius: "0.75rem", border: "1px solid var(--border)",
                      background: "var(--card)", alignItems: "flex-start"
                    }}>
                      {booking.moviePoster ? (
                        <img
                          src={booking.moviePoster}
                          alt={booking.movieTitle}
                          style={{ width: "3.5rem", height: "5rem", objectFit: "cover", borderRadius: "0.375rem", flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: "3.5rem", height: "5rem", borderRadius: "0.375rem", flexShrink: 0,
                          background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          <Ticket size={20} style={{ color: "var(--muted-foreground)" }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                          <p style={{ fontWeight: 600, fontSize: "0.9375rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {booking.movieTitle}
                          </p>
                          <span style={{
                            fontSize: "0.7rem", fontWeight: 600, padding: "0.15rem 0.6rem",
                            borderRadius: "999px", flexShrink: 0,
                            background: badge.bg, color: badge.color
                          }}>
                            {badge.label}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", margin: "0.2rem 0 0", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Clock size={12} style={{ flexShrink: 0 }} />
                          {formatShowtime(booking.showtime)}
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(10rem, 1fr))", gap: "0.25rem 1.5rem", marginTop: "0.5rem" }}>
                          {booking.seatIds?.length > 0 && (
                            <p style={{ fontSize: "0.8rem", margin: 0, color: "var(--foreground)" }}>
                              <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Seats: </span>
                              {booking.seatIds.map((id) => {
                                const parts = id.split("-");
                                if (parts.length === 2) {
                                  const row = String.fromCharCode(64 + Number(parts[0]));
                                  return `${row}${parts[1]}`;
                                }
                                return id;
                              }).join(", ")}
                            </p>
                          )}
                          <p style={{ fontSize: "0.8rem", margin: 0, color: "var(--foreground)" }}>
                            <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Tickets: </span>
                            {formatTickets(booking.tickets)}
                          </p>
                          <p style={{ fontSize: "0.8rem", margin: 0, color: "var(--foreground)" }}>
                            <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Total: </span>
                            ${Number(booking.total).toFixed(2)}
                          </p>
                          {booking.paymentCard && (
                            <p style={{ fontSize: "0.8rem", margin: 0, color: "var(--foreground)" }}>
                              <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Card: </span>
                              {booking.paymentCard.brand} ···· {booking.paymentCard.last4}
                            </p>
                          )}
                          {booking.status === "cancelled" && booking.refundAmount != null && (
                            <p style={{ fontSize: "0.8rem", margin: 0, color: "#ef4444" }}>
                              <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Refund: </span>
                              ${Number(booking.refundAmount).toFixed(2)} ({booking.refundPercent}%)
                            </p>
                          )}
                        </div>
                        {isCancellable && (
                          <button
                            onClick={() => setCancelTarget({ ...booking, _refund: refund })}
                            style={{
                              marginTop: "0.75rem", fontSize: "0.775rem", fontWeight: 500,
                              padding: "0.3rem 0.85rem", borderRadius: "0.5rem", cursor: "pointer",
                              border: "1px solid #ef4444", background: "transparent", color: "#ef4444"
                            }}
                          >
                            Cancel Ticket
                          </button>
                        )}
                      </div>
                    </div>
                  );
                };

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {sorted.map((b) => <BookingCard key={b.bookingId} booking={b} />)}
                  </div>
                );
              })()}
            </div>
          </section>
        )}

        <AlertDialog
          open={cancelTarget !== null}
          onOpenChange={(open) => {
            if (!open && !cancelInProgress) { setCancelTarget(null); setCancelError(""); }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  {cancelTarget && (
                    <>
                      <p style={{ margin: "0 0 0.5rem" }}>
                        <strong>{cancelTarget.movieTitle}</strong>
                        {" — "}{new Date(cancelTarget.showtime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                        {" · "}{new Date(cancelTarget.showtime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" })}
                      </p>
                      {cancelTarget._refund?.pct === 100 && (
                        <p style={{ margin: 0 }}>
                          You will receive a <strong>full refund of ${Number(cancelTarget._refund.amount).toFixed(2)}</strong> (100%) since the showtime is more than 24 hours away.
                        </p>
                      )}
                      {cancelTarget._refund?.pct === 40 && (
                        <p style={{ margin: 0 }}>
                          You will receive a <strong>partial refund of ${Number(cancelTarget._refund.amount).toFixed(2)}</strong> (40%) since the showtime is within 12–24 hours.
                        </p>
                      )}
                      {cancelTarget._refund?.pct === 0 && (
                        <p style={{ margin: 0 }}>
                          <strong>No refund</strong> will be issued since the showtime is within 12 hours.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            {cancelError && (
              <p style={{ fontSize: "0.8rem", color: "#ef4444", margin: "0.5rem 1.5rem 0", wordBreak: "break-word" }}>
                Error: {cancelError}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancelInProgress}>Keep Booking</AlertDialogCancel>
              <AlertDialogAction
                disabled={cancelInProgress}
                style={{ background: "#ef4444", color: "#fff" }}
                onClick={() => { void handleCancelBooking(); }}
              >
                {cancelInProgress ? "Cancelling…" : "Yes, Cancel Ticket"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={deleteTargetCardId.length > 0}
          onOpenChange={(open) => {
            if (!open && !deleteCardSaving) {
              setDeleteTargetCardId("");
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Saved Card</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTargetCard
                  ? `Are you sure you want to delete ${deleteTargetCard.brand || "Card"} ending in ${deleteTargetCard.last4}?`
                  : "Are you sure you want to delete this saved card?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteCardSaving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteCardSaving}
                onClick={() => {
                  void handleDeleteCard(deleteTargetCardId);
                }}
              >
                {deleteCardSaving ? "Deleting..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
