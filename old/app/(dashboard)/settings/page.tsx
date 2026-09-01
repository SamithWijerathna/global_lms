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
    <section>
      <h2 className="text-xl font-semibold mb-1">Settings</h2>
      <ul className="ml-4 list-disc">
        <li>Edit Profile: {profile ? `${profile.first_name} ${profile.last_name}` : "Loading..."}</li>
        <li>Payment Settings: {paymentSettings ? paymentSettings.status || "Loaded" : "Loading..."}</li>
        <li>Payment History: {paymentHistory.length} records</li>
      </ul>
    </section>
  );
}
