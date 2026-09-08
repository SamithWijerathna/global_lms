/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore TypeScript build errors if needed
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: [
      "@heroui/react",
      "@heroui/dropdown",
      "@heroui/button",
      "@heroui/avatar",
      "@heroui/modal",
      "@heroui/input",
      "@heroui/card",
      "@heroui/table",
      "@heroui/select",
      "@heroui/tabs",
      "lucide-react",
      "react-icons",
    ],
  },
  async redirects() {
    return [
      { source: "/myClasses", destination: "/my-classes", permanent: true },
      { source: "/classStore", destination: "/class-store", permanent: true },
      { source: "/classMaterials", destination: "/class-materials", permanent: true },
      { source: "/settings/editProfile", destination: "/settings/edit-profile", permanent: true },
      { source: "/settings/paymentHistory", destination: "/settings/payment-history", permanent: true },
    ];
  },
};

export default nextConfig;
