"use client";

import { Suspense } from "react";
import PatientAppointmentsContent from "./content";
import AuthGuard from "@/components/AuthGuard";

function PatientAppointmentsLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#36d1cf]"></div>
    </div>
  );
}

export default function PatientAppointmentsPage() {
  return (
    <AuthGuard currentPath="/patient/appointments">
      <Suspense fallback={<PatientAppointmentsLoader />}>
        <PatientAppointmentsContent />
      </Suspense>
    </AuthGuard>
  );
}
