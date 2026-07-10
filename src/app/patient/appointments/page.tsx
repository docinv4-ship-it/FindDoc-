"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PatientAppointmentsContent from "./content";

function PatientAppointmentsLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
    </div>
  );
}

export default function PatientAppointmentsPage() {
  return (
    <Suspense fallback={<PatientAppointmentsLoader />}>
      <PatientAppointmentsContent />
    </Suspense>
  );
}
