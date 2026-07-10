"use client";

import { Suspense } from "react";
import BookingFormContent from "./content";

function BookingFormLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={<BookingFormLoader />}>
      <BookingFormContent />
    </Suspense>
  );
}
