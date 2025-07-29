import React from "react";
import { ApplicantProvider } from "../../lib/contexts/ApplicantContext";
import DashboardLayout from "../../components/dashboard/DashboardLayout";

export default function BoardLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <ApplicantProvider>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </ApplicantProvider>
  );
}