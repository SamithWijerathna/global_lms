"use client";
import React, { useEffect, useState } from "react";
import { fetchProfile, fetchPaymentSettings, fetchPaymentHistory } from "../pages/apiFetchers";

export default function SettingsSection() {
  const [profile, setProfile] = useState<any>(null);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  
  useEffect(() => {
    fetchProfile().then(setProfile);
    fetchPaymentSettings().then(setPaymentSettings);
    fetchPaymentHistory().then(data => setPaymentHistory(data.data || []));
  }, []);

  return (
    <div className="w-full space-y-6 pb-12">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-left">
        Settings
      </h1>
      <ul className="ml-4 list-disc space-y-2 text-muted-foreground">
        <li>Edit Profile: {profile ? `${profile.first_name} ${profile.last_name}` : "Loading..."}</li>
        <li>Payment Settings: {paymentSettings ? paymentSettings.status || "Loaded" : "Loading..."}</li>
        <li>Payment History: {paymentHistory.length} records</li>
      </ul>
    </div>
  );
}
