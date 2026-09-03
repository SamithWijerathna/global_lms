"use client";

import React from "react";
import {
  Input,
  Select,
  SelectItem,
  Form,
  Divider,
  InputOtp,
  Checkbox,
  Link,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from "@heroui/react";
import { useRouter } from "next/navigation";

// Dynamic batches loaded from /api/batches

const isValidNIC = (nic: string): boolean => {
  nic = nic.toUpperCase().trim();

  // OLD NIC → 9 digits + V/X
  if (/^[0-9]{9}[VX]$/.test(nic)) {
    return validateOldNIC(nic);
  }

  // NEW NIC → 12 digits
  if (/^[0-9]{12}$/.test(nic)) {
    return validateNewNIC(nic);
  }

  return false;
};

// ================= OLD NIC =================
const validateOldNIC = (nic: string): boolean => {
  const digits = nic.substring(0, 9);
  const suffix = nic.charAt(9);

  // Extract day of year (supports female +500)
  const dayOfYear = parseInt(digits.substring(2, 5));

  const isMale = dayOfYear >= 1 && dayOfYear <= 366;
  const isFemale = dayOfYear >= 501 && dayOfYear <= 866;

  if (!isMale && !isFemale) return false;

  // V/X is accepted (no checksum in SL NIC)
  return suffix === "V" || suffix === "X";
};

// ================= NEW NIC =================
const validateNewNIC = (nic: string): boolean => {
  const year = parseInt(nic.substring(0, 4));
  const dayOfYear = parseInt(nic.substring(4, 7));

  // Year range
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear) return false;

  // Day of year:
  // Male   → 1–366
  // Female → 501–866
  const isMale = dayOfYear >= 1 && dayOfYear <= 366;
  const isFemale = dayOfYear >= 501 && dayOfYear <= 866;

  if (!isMale && !isFemale) return false;

  return true;
};


const isValidSLPhone = (phone: string) =>
  /^07[0-9]{8}$/.test(phone);

export default function Signup() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [otp, setOtp] = React.useState("");
  const [profilePreview, setProfilePreview] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");
  const [isAgreed, setIsAgreed] = React.useState(false);
  const [batchesList, setBatchesList] = React.useState<Array<{ value: string; label: string }>>([]);

  React.useEffect(() => {
    fetch("/api/batches")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBatchesList(data.map((b: any) => ({ value: b.batch_code, label: b.batch_name || b.batch_code })));
        }
      })
      .catch((err) => console.error("Failed to load batches:", err));
  }, []);

  const { isOpen: isTermsOpen, onOpen: onTermsOpen, onOpenChange: onTermsOpenChange } = useDisclosure();
  const { isOpen: isPrivacyOpen, onOpen: onPrivacyOpen, onOpenChange: onPrivacyOpenChange } = useDisclosure();

  const [form, setForm] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    address: "",
    batch: "",
    nic: "",
    phone: "",
    birthday: "",
    profile_pic: null as File | null,
  });

  const sendOtp = async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "sendOtp",
          email: form.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send OTP");
        return;
      }

      setSuccessMessage("OTP sent to your email");
      setStep(2);
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "verifyOtp",
          email: form.email,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid OTP");
        return;
      }

      setSuccessMessage("OTP verified successfully");
      setStep(3);
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (file: File) => {
    setForm({ ...form, profile_pic: file });
    setProfilePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setError("");

    if (!isValidNIC(form.nic)) {
      setError("Invalid NIC number");
      return;
    }
    if (!isValidSLPhone(form.phone)) {
      setError("Invalid Sri Lankan phone number (format: 07XXXXXXXX)");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("action", "register");
      formData.append("first_name", form.first_name);
      formData.append("last_name", form.last_name);
      formData.append("email", form.email);
      formData.append("password", form.password);
      formData.append("address", form.address);
      formData.append("batch", form.batch);
      formData.append("idNumber", form.nic);
      formData.append("phone", form.phone);
      formData.append("birthday", form.birthday);
      if (form.profile_pic) {
        formData.append("profile", form.profile_pic);
      }

      const response = await fetch("/api/auth", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      // Store tokens and user info
      localStorage.setItem("authToken", data.accessToken);
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      setSuccessMessage("Account created successfully! Redirecting...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-gradient-animate">
      <div className="rounded-large bg-content1 shadow-small w-full max-w-xl px-8 py-8 items-center flex flex-col relative z-10">
        <img
          src="/assets/logo.png"
          alt="Lashinigeo Logo"
          className="w-44 h-auto max-h-28 sm:w-56 sm:max-h-36 object-contain mb-3 mx-auto filter dark:brightness-0 dark:invert transition-all drop-shadow-md"
        />
        <h1 className="text-3xl font-semibold mb-4 text-center">Create Account</h1>

        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="w-full bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm mb-4">
            {successMessage}
          </div>
        )}

        {/* STEP 1: BASIC INFO */}
        {step === 1 && (
          <Form className="flex flex-col gap-3 w-full">
            <div className="w-full flex gap-3">
              <Input
                fullWidth
                className="w-full flex-1"
                label="First Name"
                isRequired
                value={form.first_name}
                onValueChange={(value) =>
                  setForm({ ...form, first_name: value })
                }
              />
              <Input
                fullWidth
                className="w-full flex-1"
                label="Last Name"
                isRequired
                value={form.last_name}
                onValueChange={(value) =>
                  setForm({ ...form, last_name: value })
                }
              />
            </div>

            <Input
              fullWidth
              className="w-full"
              label="Email"
              type="email"
              isRequired
              value={form.email}
              onValueChange={(value) =>
                setForm({ ...form, email: value })
              }
            />
            <Input
              fullWidth
              className="w-full"
              label="Password"
              type="password"
              isRequired
              value={form.password}
              onValueChange={(value) =>
                setForm({ ...form, password: value })
              }
            />
            <Checkbox 
              isRequired 
              className="py-4" 
              size="sm"
              isSelected={isAgreed}
              onValueChange={setIsAgreed}
            >
              I agree with the&nbsp;
              <Link className="relative z-1 underline" onPress={onTermsOpen} size="sm">
                Terms
              </Link>
              &nbsp; and&nbsp; 
              <Link className="relative z-1 underline pl-1" onPress={onPrivacyOpen} size="sm">
                 Privacy Policy
              </Link>
            </Checkbox>
            <Button
              className="w-full"
              color="primary"
              onPress={sendOtp}
              isLoading={isLoading}
              isDisabled={!isAgreed}
            >
              Send OTP
            </Button>
          </Form>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === 2 && (
          <Form className="flex flex-col gap-4 w-full">
            <p className="text-small text-default-500 text-center justify-center">
              Enter the 6-digit code sent to {form.email}
            </p>

            <InputOtp
              maxLength={6}
              value={otp}
              onValueChange={(value) => setOtp(value)}
              pattern="^[0-9]*$"
              className="justify-center items-center w-full flex"
            >
              <InputOtp.Group className="gap-2">
                {[...Array(6)].map((_, index) => (
                  <InputOtp.Slot key={index} index={index} className="w-12 h-12 text-center text-lg" />
                ))}
              </InputOtp.Group>
            </InputOtp>

            <Button
              className="w-full"
              color="primary"
              onPress={verifyOtp}
              isDisabled={otp.length !== 6}
              isLoading={isLoading}
            >
              Verify OTP
            </Button>

            <Button
              variant="light"
              size="sm"
              onPress={sendOtp}
              className="text-default-500"
            >
              Resend OTP
            </Button>
          </Form>
        )}

        {/* STEP 3: PERSONAL DETAILS */}
        {step === 3 && (
          <Form className="flex flex-col gap-3 w-full">
            <Input
              fullWidth
              className="w-full"
              label="Home Address"
              isRequired
              value={form.address}
              onValueChange={(value) =>
                setForm({ ...form, address: value })
              }
            />
            <Input
              fullWidth
              className="w-full"
              label="Birthday"
              type="date"
              isRequired
              value={form.birthday}
              onValueChange={(value) =>
                setForm({ ...form, birthday: value })
              }
            />
            <Select
              fullWidth
              className="w-full"
              label="Batch"
              selectedKeys={form.batch ? [form.batch] : []}
              onSelectionChange={(keys) =>
                setForm({ ...form, batch: Array.from(keys)[0] as string })
              }
            >
              {batchesList.map((b) => (
                <SelectItem key={b.value} textValue={b.label}>{b.label}</SelectItem>
              ))}
            </Select>
            <Input
              fullWidth
              className="w-full"
              label="NIC Number"
              placeholder="9 digits + V/X (old) or 12 digits (new)"
              isRequired
              value={form.nic}
              onValueChange={(value) =>
                setForm({ ...form, nic: value })
              }
              description="Old: 123456789V or 123456789X | New: 123456789012"
              isInvalid={form.nic.length > 0 && !isValidNIC(form.nic)}
              color={form.nic.length > 0 && isValidNIC(form.nic) ? "success" : form.nic.length > 0 && !isValidNIC(form.nic) ? "danger" : "default"}
              errorMessage={form.nic.length > 0 && !isValidNIC(form.nic) ? "Invalid NIC format" : ""}
            />
            <Input
              fullWidth
              className="w-full"
              label="Phone Number"
              placeholder="07XXXXXXXX"
              value={form.phone}
              onValueChange={(value) =>
                setForm({ ...form, phone: value })
              }
            />
            <Button className="w-full" color="primary" onPress={() => setStep(4)}>
              Next
            </Button>
          </Form>
        )}

        {/* STEP 4: PROFILE PIC */}
        {step === 4 && (
          <div className="flex flex-col gap-4 w-full">
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                e.target.files && handleImageUpload(e.target.files[0])
              }
            />

            {profilePreview && (
              <img
                src={profilePreview}
                className="h-24 w-24 rounded-full object-cover mx-auto"
              />
            )}

            <Button
              color="primary"
              onPress={handleSubmit}
              isLoading={isLoading}
            >
              Complete Signup
            </Button>
          </div>
        )}

        <Divider className="my-4" />
        <p className="text-small text-center text-default-500">
          Already have an account?{" "}
          <Link href="/login" className="text-primary cursor-pointer">
            Sign In
          </Link>
        </p>
      </div>

     {/* TERMS MODAL */}
<Modal
  backdrop="opaque"
  isOpen={isTermsOpen}
  onOpenChange={onTermsOpenChange}
  scrollBehavior="inside"
>
  <ModalContent>
    {(onClose) => (
      <>
        <ModalHeader className="flex flex-col gap-1">
          Terms of Service – lashinigeo.lk
        </ModalHeader>
        <ModalBody className="text-sm space-y-4">

          <p><strong>Effective Date:</strong> 2026/3/1</p>

          <p>
            By creating an account or using lashinigeo.lk, you agree to the following terms.
          </p>

          <div>
            <h4 className="font-semibold">1. Eligibility</h4>
            <p>
              You must provide accurate and truthful information. You are responsible
              for maintaining the confidentiality of your account credentials.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">2. Account Responsibility</h4>
            <p>
              You are responsible for all activities under your account. Sharing login
              credentials is prohibited. False NIC or personal details may result in
              account suspension.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">3. Acceptable Use</h4>
            <ul className="list-disc ml-5">
              <li>No unlawful use of the platform</li>
              <li>No hacking, exploiting, or damaging the system</li>
              <li>No malicious uploads</li>
              <li>No impersonation</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">4. Verification</h4>
            <p>
              Email OTP verification is required. lashinigeo.lk reserves the right
              to reject or suspend accounts that fail verification.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">5. Intellectual Property</h4>
            <p>
              All platform content and branding belong to lashinigeo.lk and may not
              be copied or redistributed without permission.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">6. Termination</h4>
            <p>
              We reserve the right to suspend or terminate accounts if terms
              are violated or fraudulent activity is detected.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">7. Governing Law</h4>
            <p>
              These Terms are governed by the laws of Sri Lanka.
            </p>
          </div>

        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Close
          </Button>
          <Button color="primary" onPress={onClose}>
            Accept
          </Button>
        </ModalFooter>
      </>
    )}
  </ModalContent>
</Modal>


{/* PRIVACY MODAL */}
<Modal
  backdrop="opaque"
  isOpen={isPrivacyOpen}
  onOpenChange={onPrivacyOpenChange}
  scrollBehavior="inside"
>
  <ModalContent>
    {(onClose) => (
      <>
        <ModalHeader className="flex flex-col gap-1">
          Privacy Policy – lashinigeo.lk
        </ModalHeader>
        <ModalBody className="text-sm space-y-4">

          <p><strong>Effective Date:</strong> 2026/3/1</p>

          <p>
            lashinigeo.lk values your privacy. This policy explains how we collect,
            use, and protect your information.
          </p>

          <div>
            <h4 className="font-semibold">1. Information We Collect</h4>
            <ul className="list-disc ml-5">
              <li>Name</li>
              <li>Email Address</li>
              <li>Home Address</li>
              <li>NIC Number</li>
              <li>Phone Number</li>
              <li>Date of Birth</li>
              <li>Batch Information</li>
              <li>Profile Picture</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">2. How We Use Information</h4>
            <ul className="list-disc ml-5">
              <li>Account creation and management</li>
              <li>OTP email verification</li>
              <li>Identity validation</li>
              <li>Security and fraud prevention</li>
              <li>Service improvements</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">3. Data Protection</h4>
            <p>
              Passwords are encrypted. We do not sell or share personal data
              with third parties. Access is restricted to authorized personnel.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">4. Cookies</h4>
            <p>
              We may use cookies to maintain sessions and improve performance.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">5. Your Rights</h4>
            <p>
              You may request access, correction, or deletion of your data by
              contacting our official support email.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">6. Updates</h4>
            <p>
              This policy may be updated periodically. Continued use of the
              platform indicates acceptance of changes.
            </p>
          </div>

        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Close
          </Button>
          <Button color="primary" onPress={onClose}>
            Accept
          </Button>
        </ModalFooter>
      </>
    )}
  </ModalContent>
</Modal>
    </div>
  );
}

