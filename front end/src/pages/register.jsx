"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";

const pageStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  color: "#e2e8f0",
  background:
    "radial-gradient(circle at top, rgba(59,130,246,0.14), transparent 35%), linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,1))"
};

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    void router.replace("/login?mode=register");
  }, [router]);

  return <div style={pageStyle}>Redirecting to account page...</div>;
}
